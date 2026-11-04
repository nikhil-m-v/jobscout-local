# Isolated release-mode installation lifecycle. UI input uses Computer Use separately.
param([Parameter(Mandatory=$true)][ValidateSet('Install','PrepareWizard','Wizard','CompleteWizard','Cancelled','Snapshot','Terminate','EngineTerminate','Closed','Upgrade','Uninstall')][string]$Action)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$directory = [IO.Path]::GetFullPath((Join-Path $root '.local/installed-acceptance'))
$manifestPath = Join-Path $directory 'installation.json'
$buildDirectory = $directory
$existingState = if (Test-Path -LiteralPath $manifestPath) { Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json } else { $null }
if ($existingState.upgrade_pending) { throw 'Previous upgrade is incomplete; retain installation and inspect the transition before further actions.' }
if ($existingState.upgraded) { $buildDirectory = Join-Path $root '.local/installed-acceptance-upgrade' }
$build = Get-Content -Raw -LiteralPath (Join-Path $buildDirectory 'build.json') | ConvertFrom-Json
$expectedVersion = if ($existingState.upgraded) { '0.1.1' } else { '0.1.0' }
if ($build.identifier -ne 'app.jobscout.installedacceptance' -or $build.product -ne 'JobScout acceptance' -or $build.version -ne $expectedVersion) { throw 'Unexpected acceptance build identity.' }
if ($existingState.upgraded -and (Get-FileHash -LiteralPath (Join-Path $buildDirectory 'build.json')).Hash -ne $existingState.upgrade_build_sha256) { throw 'Upgraded build binding changed.' }
if ($build.mode -and $build.mode -notin @('production-engine','synthetic-search')) { throw 'Unexpected acceptance engine mode.' }
if ($build.mode -eq 'synthetic-search' -and (!$build.wrapper_sha256 -or $build.engine_sha256 -eq $build.production_before.engine)) { throw 'Synthetic engine must have a distinct hash-bound wrapper.' }
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
    if ((Get-FileHash -LiteralPath (Join-Path $buildDirectory 'jobscout-desktop.exe')).Hash.ToLowerInvariant() -ne $build.desktop_sha256) { throw 'Acceptance desktop reference changed.' }
    $bytes = [IO.File]::ReadAllBytes((Join-Path $buildDirectory 'jobscout-desktop.exe'))
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
    if ([IO.Path]::GetFullPath($entry.InstallLocation.Trim('"')) -ne $destination -or $entry.DisplayVersion -ne $build.version) { throw 'Unexpected test installation registration.' }
}
function Assert-UpgradeBuild($candidate) {
    if ($state.upgraded -or $state.wizard_build_sha256 -or $build.version -ne '0.1.0' -or $build.mode -ne 'production-engine') { throw 'Upgrade requires a closed original silent production-engine fixture.' }
    if ($candidate.identifier -ne $build.identifier -or $candidate.product -ne $build.product -or $candidate.version -ne '0.1.1' -or $candidate.from_version -ne $build.version -or $candidate.fixture -ne 'version-only-upgrade' -or $candidate.mode -ne 'production-engine') { throw 'Unexpected higher-version fixture identity.' }
    if ($candidate.engine_sha256 -ne $build.engine_sha256 -or $candidate.notice_sha256 -ne $build.notice_sha256 -or $candidate.desktop_sha256 -eq $build.desktop_sha256 -or $candidate.installer_sha256 -eq $build.installer_sha256) { throw 'Upgrade must change the versioned desktop/installer and retain engine/notices.' }
    foreach ($name in @('desktop','engine','installer')) {
        if (!$candidate.production_before.$name -or $candidate.production_before.$name -ne $build.production_before.$name) { throw 'Upgrade production artifact binding changed.' }
    }
}
function Test-DataFingerprints {
    $result = @{}
    foreach ($data in $dataPaths) {
        if (Test-Path -LiteralPath $data) {
            if ((Get-Item -LiteralPath $data).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing redirected test data.' }
            foreach ($item in Get-ChildItem -LiteralPath $data -Recurse -Force) {
                if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing nested redirected test data.' }
                if (!$item.PSIsContainer) { $result[$item.FullName] = (Get-FileHash -LiteralPath $item.FullName).Hash }
            }
        }
    }
    return $result
}
function Shortcut-Paths {
    return @('Programs','DesktopDirectory') | ForEach-Object {
        $folder = [Environment]::GetFolderPath($_)
        if (!$folder) { throw 'Acceptance shortcut known folder is unavailable.' }
        [IO.Path]::GetFullPath((Join-Path $folder 'JobScout acceptance.lnk'))
    }
}
function Assert-WizardBinding($state) {
    if ($state.wizard_build_sha256 -ne (Get-FileHash -LiteralPath (Join-Path $directory 'build.json')).Hash -or $build.mode -ne 'production-engine') { throw 'Wizard acceptance build changed.' }
    if ([IO.Path]::GetDirectoryName($destination) -ne $directory -or [IO.Path]::GetFileName($destination) -notmatch '^installed-[0-9a-f]{32}$') { throw 'Invalid wizard installation destination.' }
    $expected = @(Shortcut-Paths)
    if (@($state.shortcut_paths).Count -ne 2 -or @($state.shortcut_paths | Where-Object { $_ -notin $expected }).Count -or @($state.shortcut_paths | Select-Object -Unique).Count -ne 2) { throw 'Wizard shortcut paths changed.' }
}
function Assert-Shortcuts($state) {
    Assert-WizardBinding $state
    $shell = New-Object -ComObject WScript.Shell
    try {
        foreach ($link in $state.shortcut_paths) {
            if (!(Test-Path -LiteralPath $link -PathType Leaf) -or ((Get-Item -LiteralPath $link).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Expected owned acceptance shortcut is missing or redirected.' }
            # CreateShortcut reads an existing link; never call Save or modify it.
            $shortcut = $shell.CreateShortcut($link)
            if ([IO.Path]::GetFullPath($shortcut.TargetPath) -ne (Join-Path $destination 'jobscout-desktop.exe') -or $shortcut.Arguments) { throw 'Acceptance shortcut has an unexpected target or arguments.' }
        }
    } finally { if ([Runtime.InteropServices.Marshal]::IsComObject($shell)) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell) } }
}
function Assert-InstalledPayload($destination) {
    Assert-Registration $destination
    if ((Get-Item -LiteralPath (Join-Path $destination 'jobscout-desktop.exe')).VersionInfo.ProductVersion -ne $build.version) { throw 'Installed desktop product version differs from the declared build.' }
    if ((Get-FileHash -LiteralPath (Join-Path $destination 'jobscout-desktop.exe')).Hash -ne (Expected-DesktopHash)) { throw 'Installed desktop differs from the acceptance build.' }
    if ((Get-FileHash -LiteralPath (Join-Path $destination 'jobscout-engine.exe')).Hash.ToLowerInvariant() -ne $build.engine_sha256) { throw 'Installed sidecar differs from the declared acceptance engine.' }
    if (!$build.notice_sha256 -or (Get-FileHash -LiteralPath (Join-Path $destination 'licenses/THIRD-PARTY-NOTICES.txt')).Hash.ToLowerInvariant() -ne $build.notice_sha256) { throw 'Installed dependency notices differ from the reviewed bundle.' }
}
function Assert-WizardExited($state) {
    if (!$state.wizard_process) { throw 'Start the prepared wizard first.' }
    $process = Get-Process -Id $state.wizard_process.id -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq (Start-Ticks $state.wizard_process.started)) { throw 'The prepared installer is still running.' }
}
function Start-Ticks($value) {
    # PowerShell 7 can deserialize ISO JSON timestamps to DateTime, while
    # Windows PowerShell preserves strings. Compare exact instants, not coercions.
    if ($value -is [DateTime]) { return $value.ToUniversalTime().Ticks }
    if ($value -is [DateTimeOffset]) { return $value.UtcDateTime.Ticks }
    return [DateTimeOffset]::Parse($value, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime.Ticks
}
function Owned-Processes($state) {
    $desktopRecords = @($state.owned | Where-Object name -eq 'jobscout-desktop')
    if ($state.owned.Count -and $desktopRecords.Count -ne 1) { throw 'Snapshot must identify one owned desktop.' }
    return @($state.owned | Where-Object {
        $member = Get-Process -Id $_.id -ErrorAction SilentlyContinue
        # Old snapshots could include a pre-existing process whose historical
        # parent PID was later reused for this desktop. It cannot be our child.
        $member -and (Start-Ticks $_.started) -ge (Start-Ticks $desktopRecords[0].started) -and $member.StartTime.ToUniversalTime().Ticks -eq (Start-Ticks $_.started)
    })
}
if ($Action -in @('Install','PrepareWizard')) {
    if ($Action -eq 'PrepareWizard' -and $build.mode -ne 'production-engine') { throw 'Interactive wizard acceptance requires the exact production engine.' }
    if (Test-Path -LiteralPath $manifestPath) { throw 'Finish the existing acceptance installation first.' }
    foreach ($key in @($registration,'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\JobScout acceptance','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\JobScout acceptance')) {
        if (Test-Path -LiteralPath $key) { throw 'Refusing to replace an existing acceptance installation.' }
    }
    if (Get-Process jobscout-desktop -ErrorAction SilentlyContinue) { throw 'Close existing JobScout windows first; none will be killed.' }
    if (Test-Path -LiteralPath $settingsPath) { throw 'Acceptance installer settings must not already exist.' }
    $shortcutPaths = @(Shortcut-Paths)
    foreach ($link in $shortcutPaths) { if (Test-Path -LiteralPath $link) { throw 'Acceptance shortcuts must not already exist.' } }
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
    if ($Action -eq 'PrepareWizard') {
        $state | Add-Member -NotePropertyName wizard_build_sha256 -NotePropertyValue (Get-FileHash -LiteralPath (Join-Path $directory 'build.json')).Hash
        $state | Add-Member -NotePropertyName shortcut_paths -NotePropertyValue $shortcutPaths
        $state | Add-Member -NotePropertyName wizard_process -NotePropertyValue $null
        $state | Add-Member -NotePropertyName wizard_complete -NotePropertyValue $false
    }
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    if ($Action -eq 'PrepareWizard') {
        [pscustomobject]@{ prepared='pass'; destination=$destination; production_profiles_unchanged='pass'; next='Run -Action Wizard. Keep this exact destination, select Create desktop shortcut and clear Run JobScout acceptance at Finish.' } | ConvertTo-Json
        exit
    }
    Invoke-Package $setup "/S /NS /D=$destination"
    Assert-InstalledPayload $destination
    Assert-ProductionUnchanged $state.before
    [pscustomobject]@{ installed='pass'; exact_manifest_desktop_and_engine='pass'; engine_mode=$(if ($build.mode) { $build.mode } else { 'production-engine' }); dependency_notices='pass'; empty_data_and_vault_namespaces='pass'; production_profiles_unchanged='pass'; installed_bytes=(Get-ChildItem -LiteralPath $destination -File -Recurse | Measure-Object Length -Sum).Sum } | ConvertTo-Json
    exit
}
$state = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$destination = [IO.Path]::GetFullPath($state.destination)
if ($state.identity -ne $build.identifier -or !$destination.StartsWith($directory + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid owned installation manifest.' }
Assert-ProductionUnchanged $state.before
if ($state.wizard_build_sha256) {
    Assert-WizardBinding $state
    if ($Action -eq 'Wizard') {
        if ($state.wizard_process -or (Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $registration)) { throw 'This prepared wizard has already started or installation state changed.' }
        foreach ($path in @($state.shortcut_paths) + @($dataPaths) + @($settingsPath)) { if (Test-Path -LiteralPath $path) { throw 'Wizard baseline changed; retain the manifest for inspection.' } }
        $setup = Join-Path $directory 'setup.exe'
        if ((Get-FileHash -LiteralPath $setup).Hash.ToLowerInvariant() -ne $build.installer_sha256) { throw 'Acceptance installer changed.' }
        # This action intentionally opens an interactive wizard for observed UI acceptance.
        if (Get-Process jobscout-desktop -ErrorAction SilentlyContinue) { throw 'Close existing JobScout windows before starting the wizard.' }
        $process = Start-Process -FilePath $setup -ArgumentList "/D=$destination" -WindowStyle Normal -PassThru
        $state.wizard_process = [pscustomobject]@{ id=$process.Id; started=$process.StartTime.ToUniversalTime().ToString('o') }
        $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        [pscustomobject]@{ wizard_started='pass'; destination=$destination } | ConvertTo-Json
        exit
    }
    if ($Action -in @('CompleteWizard','Cancelled')) {
        Assert-WizardExited $state
        if ($Action -eq 'Cancelled') {
            foreach ($path in @($destination,$registration,$settingsPath) + @($state.shortcut_paths) + @($dataPaths)) { if (Test-Path -LiteralPath $path) { throw 'Cancelled wizard left installation state; no files or settings were removed.' } }
            Remove-Item -LiteralPath $manifestPath
            [pscustomobject]@{ cancellation_left_no_installation='pass'; production_profiles_unchanged='pass' } | ConvertTo-Json
            exit
        }
        Assert-InstalledPayload $destination
        Assert-Shortcuts $state
        $state.wizard_complete = $true
        $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        [pscustomobject]@{ interactive_install='pass'; exact_payloads='pass'; start_menu_and_desktop_targets='pass'; production_profiles_unchanged='pass'; installed_bytes=(Get-ChildItem -LiteralPath $destination -File -Recurse | Measure-Object Length -Sum).Sum } | ConvertTo-Json
        exit
    }
    if (!$state.wizard_complete) { throw 'Complete or cancel the prepared wizard before lifecycle actions.' }
} elseif ($Action -in @('Wizard','CompleteWizard','Cancelled')) { throw 'Prepare a guarded interactive wizard first.' }
if ($Action -eq 'Snapshot') {
    $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,ExecutablePath,Name)
    $parents = @($all | Where-Object { $_.ExecutablePath -eq (Join-Path $destination 'jobscout-desktop.exe') })
    if ($parents.Count -ne 1) { throw 'Expected exactly one installed test desktop.' }
    $desktopProcess = Get-Process -Id $parents[0].ProcessId
    $desktopHandle = $desktopProcess.Handle
    if ($desktopHandle -eq [IntPtr]::Zero -or $desktopProcess.HasExited -or $desktopProcess.Path -ne (Join-Path $destination 'jobscout-desktop.exe')) { throw 'Owned desktop changed during snapshot.' }
    $captured = @{}; $captured[[int]$desktopProcess.Id] = $desktopProcess
    $staleParentLinks = @{}
    do {
        $added = 0
        foreach ($candidate in @($all | Where-Object { $captured.ContainsKey([int]$_.ParentProcessId) -and !$captured.ContainsKey([int]$_.ProcessId) })) {
            $parentProcess = $captured[[int]$candidate.ParentProcessId]
            if ($parentProcess.HasExited) { throw 'Owned parent exited during snapshot.' }
            $member = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
            if (!$member) { continue }
            $retainedHandle = $member.Handle
            if ($retainedHandle -eq [IntPtr]::Zero -or $member.HasExited) { continue }
            if ($member.StartTime.ToUniversalTime().Ticks -lt $parentProcess.StartTime.ToUniversalTime().Ticks) { $staleParentLinks[[int]$member.Id]=$true; continue }
            if ($candidate.ExecutablePath -and $member.Path -ne $candidate.ExecutablePath) { throw 'Owned child executable changed during snapshot.' }
            $captured[[int]$member.Id] = $member; $added++
        }
    } while ($added)
    if ($desktopProcess.HasExited) { throw 'Owned desktop exited during snapshot.' }
    $members = @(); $working = 0L; $private = 0L
    foreach ($member in $captured.Values) {
        if (!$member.HasExited) {
            $members += [pscustomobject]@{ id=$member.Id; started=$member.StartTime.ToUniversalTime().ToString('o'); name=$member.ProcessName }
            $working += $member.WorkingSet64; $private += $member.PrivateMemorySize64
        }
    }
    $state.owned = $members
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    [pscustomobject]@{ owned_processes=$members.Count; engine_processes=@($members | Where-Object name -eq 'jobscout-engine').Count; webview_processes=@($members | Where-Object name -eq 'msedgewebview2').Count; stale_parent_links_excluded=$staleParentLinks.Count; working_mib=[math]::Round($working/1MB,2); private_mib=[math]::Round($private/1MB,2); production_profiles_unchanged='pass'; scope='One installed acceptance snapshot; not peak RAM or live search.' } | ConvertTo-Json
    exit
}
$remaining = Owned-Processes $state
if ($Action -eq 'EngineTerminate') {
    # Choose only the frozen application child: desktop -> launcher -> application.
    # Parser descendants are left alone so their own parent-loss cleanup is tested.
    $desktop = @($remaining | Where-Object name -eq 'jobscout-desktop')
    if ($desktop.Count -ne 1) { throw 'Snapshot must identify exactly one live owned desktop.' }
    $desktopProcess = Get-Process -Id $desktop[0].id
    if ($desktopProcess.Path -ne (Join-Path $destination 'jobscout-desktop.exe') -or $desktopProcess.StartTime.ToUniversalTime().Ticks -ne (Start-Ticks $desktop[0].started)) { throw 'Owned desktop identity changed.' }
    if ((Get-FileHash -LiteralPath $desktopProcess.Path).Hash -ne (Expected-DesktopHash)) { throw 'Owned desktop executable changed.' }
    $enginePath = Join-Path $destination 'jobscout-engine.exe'
    if ((Get-FileHash -LiteralPath $enginePath).Hash.ToLowerInvariant() -ne $build.engine_sha256) { throw 'Owned engine executable changed.' }
    $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,ExecutablePath)
    $launchers = @($all | Where-Object { $_.ParentProcessId -eq $desktop[0].id -and $_.ExecutablePath -eq $enginePath -and $_.ProcessId -in $remaining.id })
    if ($launchers.Count -ne 1) { throw 'Expected exactly one snapshot-owned engine launcher.' }
    $applications = @($all | Where-Object { $_.ParentProcessId -eq $launchers[0].ProcessId -and $_.ExecutablePath -eq $enginePath -and $_.ProcessId -in $remaining.id })
    if ($applications.Count -ne 1) { throw 'Expected exactly one snapshot-owned engine application.' }
    $application = @($remaining | Where-Object id -eq $applications[0].ProcessId)[0]
    $member = Get-Process -Id $application.id
    # Force .NET to retain an OS handle before checking start time/path. Kill()
    # then targets the same process even if Windows later reuses this numeric PID.
    $retainedHandle = $member.Handle
    if ($retainedHandle -eq [IntPtr]::Zero -or $member.HasExited -or $member.Path -ne $enginePath -or $member.StartTime.ToUniversalTime().Ticks -ne (Start-Ticks $application.started)) { throw 'Owned engine application identity changed.' }
    $launcher = Get-Process -Id $launchers[0].ProcessId
    $launcherRecord = @($remaining | Where-Object id -eq $launcher.Id)[0]
    if ($launcher.Path -ne $enginePath -or $launcher.StartTime.ToUniversalTime().Ticks -ne (Start-Ticks $launcherRecord.started) -or $member.StartTime.ToUniversalTime().Ticks -lt $launcher.StartTime.ToUniversalTime().Ticks) { throw 'Owned engine launcher identity changed.' }
    # Recheck the relationship after retaining the handle to reject stale snapshots.
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($member.Id)" -Property ParentProcessId,ExecutablePath
    if ($current.ParentProcessId -ne $launcher.Id -or $current.ExecutablePath -ne $enginePath -or $member.HasExited) { throw 'Owned engine application parent changed.' }
    $member.Kill()
    if (!$member.WaitForExit(10000)) { throw 'Owned engine termination did not finish.' }
    Assert-ProductionUnchanged $state.before
    [pscustomobject]@{ owned_engine_application_terminated='pass'; desktop_terminated_by_helper=$false; descendants_terminated_by_helper=$false; production_profiles_unchanged='pass' } | ConvertTo-Json
    exit
}
if ($Action -eq 'Terminate') {
    $desktop = @($remaining | Where-Object name -eq 'jobscout-desktop')
    if ($desktop.Count -ne 1) { throw 'Snapshot must identify exactly one live owned desktop.' }
    $member = Get-Process -Id $desktop[0].id
    $retainedHandle = $member.Handle
    if ($retainedHandle -eq [IntPtr]::Zero -or $member.HasExited -or $member.Path -ne (Join-Path $destination 'jobscout-desktop.exe') -or $member.StartTime.ToUniversalTime().Ticks -ne (Start-Ticks $desktop[0].started)) { throw 'Owned desktop identity changed.' }
    if ((Get-FileHash -LiteralPath $member.Path).Hash -ne (Expected-DesktopHash)) { throw 'Owned desktop executable changed.' }
    $member.Kill()
    if (!$member.WaitForExit(10000)) { throw 'Owned desktop termination did not finish.' }
    [pscustomobject]@{ owned_desktop_terminated='pass'; descendants_terminated_by_helper=$false; production_profiles_unchanged='pass' } | ConvertTo-Json
    exit
}
if ($remaining.Count -or (Get-CimInstance Win32_Process -Property ExecutablePath | Where-Object { $_.ExecutablePath -eq (Join-Path $destination 'jobscout-desktop.exe') -or $_.ExecutablePath -eq (Join-Path $destination 'jobscout-engine.exe') })) { throw 'Owned test processes remain; no process will be killed.' }
if ($Action -eq 'Closed') {
    if (!$state.owned.Count) { throw 'Take an owned-process snapshot before closing.' }
    [pscustomobject]@{ remaining_owned_processes=0; production_profiles_unchanged='pass' } | ConvertTo-Json
    exit
}
if ($Action -eq 'Upgrade') {
    if (!$state.owned.Count) { throw 'Launch, snapshot and close the original installed app before upgrading.' }
    Assert-InstalledPayload $destination
    $upgradeDirectory = Join-Path $root '.local/installed-acceptance-upgrade'
    foreach ($path in @($upgradeDirectory,(Join-Path $upgradeDirectory 'build.json'),(Join-Path $upgradeDirectory 'setup.exe'),(Join-Path $upgradeDirectory 'jobscout-desktop.exe'))) {
        if ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing redirected upgrade fixture.' }
    }
    $candidate = Get-Content -Raw -LiteralPath (Join-Path $upgradeDirectory 'build.json') | ConvertFrom-Json
    Assert-UpgradeBuild $candidate
    if ((Get-FileHash -LiteralPath (Join-Path $upgradeDirectory 'setup.exe')).Hash.ToLowerInvariant() -ne $candidate.installer_sha256 -or (Get-FileHash -LiteralPath (Join-Path $upgradeDirectory 'jobscout-desktop.exe')).Hash.ToLowerInvariant() -ne $candidate.desktop_sha256) { throw 'Upgrade fixture bytes changed.' }
    $beforeData = Test-DataFingerprints
    if (!$beforeData.Count) { throw 'Upgrade needs retained synthetic data.' }
    $oldInstaller = $build.installer_sha256
    # Save the transition BEFORE executing: failure must retain explicit state,
    # never fall through to uninstall or silently adopt the new installation.
    $state | Add-Member -NotePropertyName upgrade_pending -NotePropertyValue $true
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Invoke-Package (Join-Path $upgradeDirectory 'setup.exe') "/S /NS /UPDATE /D=$destination"
    $build = $candidate; $buildDirectory = $upgradeDirectory
    Assert-InstalledPayload $destination
    $afterData = Test-DataFingerprints
    if ($beforeData.Count -ne $afterData.Count) { throw 'Upgrade changed test data files; retain installation.' }
    foreach ($name in $beforeData.Keys) { if ($beforeData[$name] -ne $afterData[$name]) { throw 'Upgrade changed test data bytes; retain installation.' } }
    Assert-ProductionUnchanged $state.before
    $state.upgrade_pending = $false
    $state | Add-Member -NotePropertyName upgraded -NotePropertyValue $true
    $state | Add-Member -NotePropertyName upgrade_build_sha256 -NotePropertyValue (Get-FileHash -LiteralPath (Join-Path $upgradeDirectory 'build.json')).Hash
    $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    [pscustomobject]@{ upgrade='pass'; from_version='0.1.0'; to_version=$build.version; original_installer_sha256=$oldInstaller; upgrade_installer_sha256=$build.installer_sha256; same_destination='pass'; exact_payloads='pass'; test_data_files_unchanged=$beforeData.Count; production_profiles_unchanged='pass'; scope='Real version-only NSIS /UPDATE fixture; no historical schema migration or interactive upgrade-page claim.' } | ConvertTo-Json
    exit
}
if ($Action -ne 'Uninstall') { throw 'Unsupported action for this installation state.' }
Assert-Registration $destination
if ($state.wizard_build_sha256) { Assert-Shortcuts $state }
Invoke-Package (Join-Path $destination 'uninstall.exe') '/S'
$deadline = [DateTime]::UtcNow.AddSeconds(30)
while (((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $registration)) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 200 }
if ((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $registration)) { throw 'Uninstall incomplete; no manual installation-file deletion.' }
if ($state.wizard_build_sha256) {
    foreach ($link in $state.shortcut_paths) { if (Test-Path -LiteralPath $link) { throw 'Uninstall left an acceptance shortcut; no manual shortcut deletion.' } }
}
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
