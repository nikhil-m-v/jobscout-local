# Isolated release-mode installation lifecycle. UI input uses Computer Use separately.
param([Parameter(Mandatory=$true)][ValidateSet('Install','Snapshot','Closed','Uninstall')][string]$Action)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$directory = [IO.Path]::GetFullPath((Join-Path $root '.local/installed-acceptance'))
$manifestPath = Join-Path $directory 'installation.json'
$build = Get-Content -Raw -LiteralPath (Join-Path $directory 'build.json') | ConvertFrom-Json
if ($build.identifier -ne 'app.jobscout.installedacceptance' -or $build.product -ne 'JobScout acceptance' -or $build.version -ne '0.1.0') { throw 'Unexpected acceptance build identity.' }
$registration = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\JobScout acceptance'
$settingsPath = 'HKCU:\Software\jobscout\JobScout acceptance'
$roaming = [Environment]::GetFolderPath('ApplicationData')
$local = [Environment]::GetFolderPath('LocalApplicationData')
$dataPaths = @($roaming, $local) | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $_ $build.identifier)) }
function Fingerprints {
    $result = @{}
    foreach ($base in @($roaming,$local)) {
        $file = Join-Path $base 'app.jobscout.local/jobscout.db'
        $result[$file] = if (Test-Path -LiteralPath $file) { (Get-FileHash -LiteralPath $file).Hash } else { 'absent' }
    }
    return $result
}
function Assert-ProductionUnchanged($before) {
    $after = Fingerprints
    foreach ($entry in $before.PSObject.Properties) { if ($after[$entry.Name] -ne $entry.Value) { throw 'Production profile changed; retain the test installation for inspection.' } }
}
function Invoke-Package($file,$arguments) {
    $package = Start-Process -FilePath $file -ArgumentList $arguments -WindowStyle Hidden -PassThru
    if (!$package.WaitForExit(60000) -or $package.ExitCode -ne 0) { throw 'Package operation failed or timed out; inspect before retrying.' }
}
function Expected-DesktopHash {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $directory 'jobscout-desktop.exe'))
    $text = [Text.Encoding]::ASCII.GetString($bytes)
    $marker = '__TAURI_BUNDLE_TYPE_VAR_UNK'
    $offset = $text.IndexOf($marker,[StringComparison]::Ordinal)
    if ($offset -lt 0 -or $text.IndexOf($marker,$offset+1,[StringComparison]::Ordinal) -ge 0) { throw 'Unique expected bundle marker missing.' }
    $replacement = [Text.Encoding]::ASCII.GetBytes('__TAURI_BUNDLE_TYPE_VAR_NSS')
    [Array]::Copy($replacement,0,$bytes,$offset,$replacement.Length)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','') } finally { $hasher.Dispose() }
}
function Assert-Registration($destination) {
    $entry = Get-ItemProperty -LiteralPath $registration
    if ([IO.Path]::GetFullPath($entry.InstallLocation.Trim('"')) -ne $destination -or $entry.DisplayVersion -ne '0.1.0') { throw 'Unexpected test installation registration.' }
}
function Owned-Processes($state) {
    return @($state.owned | Where-Object {
        $member = Get-Process -Id $_.id -ErrorAction SilentlyContinue
        $member -and $member.StartTime.ToUniversalTime().ToString('o') -eq $_.started
    })
}
if ($Action -eq 'Install') {
    if (Test-Path -LiteralPath $manifestPath) { throw 'Finish the existing acceptance installation first.' }
    foreach ($key in @($registration,'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\JobScout acceptance','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\JobScout acceptance')) {
        if (Test-Path -LiteralPath $key) { throw 'Refusing to replace an existing acceptance installation.' }
    }
    if (Get-Process jobscout-desktop -ErrorAction SilentlyContinue) { throw 'Close existing JobScout windows first; none will be killed.' }
    if (Test-Path -LiteralPath $settingsPath) { throw 'Acceptance installer settings must not already exist.' }
    $runtime = $false
    foreach ($key in @('HKCU:\Software\Microsoft\EdgeUpdate\Clients','HKLM:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients')) {
        if (Test-Path -LiteralPath $key) {
            foreach ($child in Get-ChildItem -LiteralPath $key) {
                $entry = Get-ItemProperty -LiteralPath $child.PSPath
                if ($entry.name -eq 'Microsoft Edge WebView2 Runtime' -and $entry.pv -and $entry.pv -ne '0.0.0.0') { $runtime = $true }
            }
        }
    }
    if (!$runtime) { throw 'Existing WebView2 is required; this test must not install/download a runtime.' }
    foreach ($data in $dataPaths) {
        if (Test-Path -LiteralPath $data) { throw 'Acceptance identity storage must not already exist.' }
        $presence = & (Join-Path $root '.venv/Scripts/python.exe') -c 'import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); from jobscout_engine.adapters.secrets import create_secret_store; print(create_secret_store(Path(sys.argv[2])).contains())' (Join-Path $root 'apps/engine/src') $data
        if ($LASTEXITCODE -ne 0 -or $presence -ne 'False') { throw 'Acceptance vault namespace must be confirmed empty.' }
    }
    $setup = Join-Path $directory 'setup.exe'
    if ((Get-FileHash -LiteralPath $setup).Hash.ToLowerInvariant() -ne $build.installer_sha256) { throw 'Acceptance installer changed.' }
    if ((Get-FileHash -LiteralPath (Join-Path $directory 'jobscout-desktop.exe')).Hash.ToLowerInvariant() -ne $build.desktop_sha256) { throw 'Acceptance build desktop changed.' }
    $destination = [IO.Path]::GetFullPath((Join-Path $directory ('installed-' + [guid]::NewGuid().ToString('N'))))
    if (!$destination.StartsWith($directory + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $destination)) { throw 'Invalid new test destination.' }
    $state = [pscustomobject]@{ destination=$destination; identity=$build.identifier; before=[pscustomobject](Fingerprints); owned=@(); data_paths=$dataPaths }
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Invoke-Package $setup "/S /NS /D=$destination"
    Assert-Registration $destination
    if ((Get-FileHash -LiteralPath (Join-Path $destination 'jobscout-desktop.exe')).Hash -ne (Expected-DesktopHash)) { throw 'Installed desktop differs from the acceptance build.' }
    if ((Get-FileHash -LiteralPath (Join-Path $destination 'jobscout-engine.exe')).Hash.ToLowerInvariant() -ne $build.engine_sha256) { throw 'Installed sidecar differs from production.' }
    Assert-ProductionUnchanged $state.before
    [pscustomobject]@{ installed='pass'; exact_desktop_and_production_engine='pass'; empty_data_and_vault_namespaces='pass'; production_profiles_unchanged='pass'; installed_bytes=(Get-ChildItem -LiteralPath $destination -File -Recurse | Measure-Object Length -Sum).Sum } | ConvertTo-Json
    exit
}
$state = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$destination = [IO.Path]::GetFullPath($state.destination)
if ($state.identity -ne $build.identifier -or !$destination.StartsWith($directory + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid owned installation manifest.' }
Assert-ProductionUnchanged $state.before
if ($Action -eq 'Snapshot') {
    $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,ExecutablePath,Name)
    $parents = @($all | Where-Object { $_.ExecutablePath -eq (Join-Path $destination 'jobscout-desktop.exe') })
    if ($parents.Count -ne 1) { throw 'Expected exactly one installed test desktop.' }
    $ids = @([int]$parents[0].ProcessId)
    do {
        $next = @($all | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids } | ForEach-Object { [int]$_.ProcessId })
        $ids += $next
    } while ($next.Count)
    $members = @(); $working = 0L; $private = 0L
    foreach ($id in $ids) {
        $member = Get-Process -Id $id -ErrorAction SilentlyContinue
        if ($member) {
            $members += [pscustomobject]@{ id=$id; started=$member.StartTime.ToUniversalTime().ToString('o'); name=$member.ProcessName }
            $working += $member.WorkingSet64; $private += $member.PrivateMemorySize64
        }
    }
    $state.owned = $members
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    [pscustomobject]@{ owned_processes=$members.Count; engine_processes=@($members | Where-Object name -eq 'jobscout-engine').Count; webview_processes=@($members | Where-Object name -eq 'msedgewebview2').Count; working_mib=[math]::Round($working/1MB,2); private_mib=[math]::Round($private/1MB,2); production_profiles_unchanged='pass'; scope='One installed acceptance snapshot; not peak RAM or live search.' } | ConvertTo-Json
    exit
}
$remaining = Owned-Processes $state
if ($remaining.Count -or (Get-CimInstance Win32_Process -Property ExecutablePath | Where-Object { $_.ExecutablePath -eq (Join-Path $destination 'jobscout-desktop.exe') -or $_.ExecutablePath -eq (Join-Path $destination 'jobscout-engine.exe') })) { throw 'Owned test processes remain; no process will be killed.' }
if ($Action -eq 'Closed') {
    if (!$state.owned.Count) { throw 'Take an owned-process snapshot before closing.' }
    [pscustomobject]@{ remaining_owned_processes=0; production_profiles_unchanged='pass' } | ConvertTo-Json
    exit
}
Assert-Registration $destination
Invoke-Package (Join-Path $destination 'uninstall.exe') '/S'
$deadline = [DateTime]::UtcNow.AddSeconds(30)
while (((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $registration)) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 200 }
if ((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $registration)) { throw 'Uninstall incomplete; no manual installation-file deletion.' }
Assert-ProductionUnchanged $state.before
# Only the initially absent, exact test identity directories may be removed.
foreach ($data in $dataPaths) {
    $resolved = [IO.Path]::GetFullPath($data)
    $expected = @($roaming,$local) | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $_ 'app.jobscout.installedacceptance')) }
    if ($resolved -notin $expected -or $resolved -notin $state.data_paths) { throw 'Refusing unverified data cleanup path.' }
    if (Test-Path -LiteralPath $resolved) {
        if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing test-data reparse point.' }
        if (Get-ChildItem -LiteralPath $resolved -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Refusing nested test-data reparse point.' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
if (Test-Path -LiteralPath $settingsPath) { Remove-Item -LiteralPath $settingsPath -Recurse }
Remove-Item -LiteralPath $manifestPath
[pscustomobject]@{ uninstall_files_and_registration='pass'; synthetic_identity_storage_removed='pass'; production_profiles_unchanged='pass'; remaining_owned_processes=0 } | ConvertTo-Json
