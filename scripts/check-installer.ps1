# Scoped silent packaging check. Never launches the app or deletes personal data.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$installer = Join-Path $root 'apps/desktop/src-tauri/target/release/bundle/nsis/JobScout_0.1.0_x64-setup.exe'
$registration = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\JobScout'
$existingKeys = @($registration,
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\JobScout',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\JobScout')
foreach ($key in $existingKeys) {
    if (Test-Path -LiteralPath $key) { throw 'Refusing to replace an existing JobScout installation.' }
}
if (Get-Process jobscout-desktop -ErrorAction SilentlyContinue) { throw 'Close JobScout before this check.' }
if (!(Test-Path -LiteralPath $installer)) { throw 'Build the current Windows installer first.' }
$autostart = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
if ($autostart -and $autostart.PSObject.Properties['JobScout']) { throw 'Refusing to change existing JobScout autostart configuration.' }
$runtime = $false
foreach ($key in @('HKCU:\Software\Microsoft\EdgeUpdate\Clients', 'HKLM:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients')) {
    if (Test-Path -LiteralPath $key) {
        foreach ($child in Get-ChildItem -LiteralPath $key) {
            $entry = Get-ItemProperty -LiteralPath $child.PSPath
            if ($entry.name -eq 'Microsoft Edge WebView2 Runtime' -and $entry.pv -and $entry.pv -ne '0.0.0.0') { $runtime = $true }
        }
    }
}
if (!$runtime) { throw 'An existing WebView2 runtime is required; this check must not download/install one.' }

function Get-ProfileFingerprints {
    $state = @{}
    foreach ($base in @($env:APPDATA, $env:LOCALAPPDATA)) {
        $path = Join-Path $base 'app.jobscout.local/jobscout.db'
        $state[$path] = if (Test-Path -LiteralPath $path) { (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash } else { 'absent' }
    }
    return $state
}
function Assert-ProfileUnchanged($before) {
    $after = Get-ProfileFingerprints
    foreach ($path in $before.Keys) {
        if ($after[$path] -ne $before[$path]) { throw 'Profile database changed; retain the test directory for investigation.' }
    }
}
function Invoke-Package($path, $arguments) {
    $process = Start-Process -FilePath $path -ArgumentList $arguments -WindowStyle Hidden -PassThru
    if (!$process.WaitForExit(120000)) { throw 'Package operation timed out; inspect the owned test installation before retrying.' }
    if ($process.ExitCode -ne 0) { throw "Package operation failed with exit code $($process.ExitCode)." }
}
function Get-ExpectedDesktopHash {
    # Tauri replaces this one bundle marker for NSIS, then restores the build file.
    # Normalize only that exact marker in memory; all other bytes must match.
    $bytes = [IO.File]::ReadAllBytes((Join-Path $root 'apps/desktop/src-tauri/target/release/jobscout-desktop.exe'))
    $text = [Text.Encoding]::ASCII.GetString($bytes)
    $marker = '__TAURI_BUNDLE_TYPE_VAR_UNK'
    $offset = $text.IndexOf($marker, [StringComparison]::Ordinal)
    if ($offset -lt 0 -or $text.IndexOf($marker, $offset + 1, [StringComparison]::Ordinal) -ge 0) { throw 'Expected unique Tauri bundle marker missing; rebuild before testing.' }
    $replacement = [Text.Encoding]::ASCII.GetBytes('__TAURI_BUNDLE_TYPE_VAR_NSS')
    [Array]::Copy($replacement, 0, $bytes, $offset, $replacement.Length)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-', '') } finally { $hasher.Dispose() }
}
function Assert-InstalledPayload {
    foreach ($name in @('jobscout-desktop.exe', 'jobscout-engine.exe')) {
        $expected = if ($name -eq 'jobscout-desktop.exe') { $expectedDesktopHash } else {
            (Get-FileHash -LiteralPath (Join-Path $root 'apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe')).Hash
        }
        if ((Get-FileHash -LiteralPath (Join-Path $destination $name)).Hash -ne $expected) { throw 'Installed executable differs from current NSIS payload.' }
    }
}

$testRoot = [IO.Path]::GetFullPath((Join-Path $root '.local/installer-acceptance'))
$destination = [IO.Path]::GetFullPath((Join-Path $testRoot ([guid]::NewGuid().ToString('N'))))
if (!$destination.StartsWith($testRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid isolated installation path.' }
if (Test-Path -LiteralPath $destination) { throw 'Test destination must not already exist.' }
$before = Get-ProfileFingerprints
$settingsPath = 'HKCU:\Software\jobscout\JobScout'
$settingsKey = Get-Item -LiteralPath $settingsPath -ErrorAction SilentlyContinue
$rememberedLocationPresent = $settingsKey -and $settingsKey.GetValueNames() -contains ''
$rememberedLocation = if ($rememberedLocationPresent) { $settingsKey.GetValue('') } else { $null }
$rememberedLocationKind = if ($rememberedLocationPresent) { $settingsKey.GetValueKind('') } else { $null }
$expectedDesktopHash = Get-ExpectedDesktopHash
$installed = $false
$removed = $false
try {
    Invoke-Package $installer "/S /NS /D=$destination"
    $installed = $true
    $entry = Get-ItemProperty -LiteralPath $registration
    if ([IO.Path]::GetFullPath($entry.InstallLocation.Trim('"')) -ne $destination -or $entry.DisplayVersion -ne '0.1.0') { throw 'Unexpected installation registration.' }
    foreach ($name in @('jobscout-desktop.exe', 'jobscout-engine.exe', 'uninstall.exe')) {
        if (!(Test-Path -LiteralPath (Join-Path $destination $name))) { throw 'Expected installed file missing.' }
    }
    Assert-InstalledPayload
    Assert-ProfileUnchanged $before
    $footprint = (Get-ChildItem -LiteralPath $destination -File -Recurse | Measure-Object Length -Sum).Sum
    Invoke-Package $installer "/S /NS /UPDATE /D=$destination"
    Assert-ProfileUnchanged $before
    $entry = Get-ItemProperty -LiteralPath $registration
    if ([IO.Path]::GetFullPath($entry.InstallLocation.Trim('"')) -ne $destination) { throw 'Reinstall registration changed destination.' }
    Assert-InstalledPayload
    Invoke-Package (Join-Path $destination 'uninstall.exe') '/S'
    $deadline = [datetime]::UtcNow.AddSeconds(30)
    while ((Test-Path -LiteralPath $destination) -and [datetime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 200 }
    if (Test-Path -LiteralPath $destination) { throw 'Uninstall left application files; no manual deletion performed.' }
    if (Test-Path -LiteralPath $registration) { throw 'Uninstall left installation registration.' }
    Assert-ProfileUnchanged $before
    $removed = $true
    [pscustomobject]@{
        clean_install = 'pass'; installed_executables_match_build = 'pass'
        same_version_reinstall = 'pass'; uninstall_files_and_registration = 'pass'
        existing_profile_databases_unchanged = 'pass'
        existing_profile_databases_checked = @($before.Values | Where-Object { $_ -ne 'absent' }).Count
        installed_bytes = $footprint; installed_mib = [math]::Round($footprint / 1MB, 2)
        scope = 'Silent current-user install, same-version reinstall and uninstall. Existing WebView2; no shortcuts, app launch, provider calls or optional app-data deletion. Not interactive wizard, fresh-user first run, genuine version upgrade or native lifecycle.'
    } | ConvertTo-Json
} finally {
    if ($removed) {
        $settingsKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\jobscout\JobScout', $true)
        try {
            if ($settingsKey -and $settingsKey.GetValue('') -eq $destination) {
                if ($rememberedLocationPresent) { $settingsKey.SetValue('', $rememberedLocation, $rememberedLocationKind) }
                else { $settingsKey.DeleteValue('', $false) }
            }
        } finally { if ($settingsKey) { $settingsKey.Dispose() } }
    }
    # Do not recursively remove files or uninstall an unexpected registration.
    if ($installed -and !$removed) { Write-Warning 'Test installation may remain in .local/installer-acceptance. Inspect the failure before recovery; personal data was not explicitly deleted.' }
}
