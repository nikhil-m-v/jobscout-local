# Finite current-user display changes for the separate installed acceptance app.
# Never changes security/privacy settings. Restore works even after app cleanup.
param(
    [Parameter(Mandatory=$true)][ValidateSet('Capture','Light','Dark','Reduce','Restore')][string]$Action,
    [Parameter(Mandatory=$true)][string]$ReportDirectory
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$reports = [IO.Path]::GetFullPath($ReportDirectory)
if ([IO.Path]::GetDirectoryName($reports) -ne (Join-Path $root 'work/ci') -or !(Test-Path -LiteralPath $reports -PathType Container)) { throw 'Use an existing dedicated work/ci directory.' }
foreach ($path in @($reports,(Split-Path $reports -Parent))) {
    if ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing redirected evidence.' }
}
$baseline = Join-Path $reports 'display-baseline.json'
if ((Test-Path -LiteralPath $baseline) -and ((Get-Item -LiteralPath $baseline).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Refusing redirected baseline.' }
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
function Assert-DisplayBaseline($saved) {
    if ($saved.kind -ne 'jobscout-display-baseline-v1' -or $saved.display.client_animation -isnot [bool]) { throw 'Invalid display baseline.' }
    foreach ($name in @('AppsUseLightTheme','EnableTransparency')) {
        $value = $saved.display.registry.$name
        if ($value.present -isnot [bool] -or ($value.present -and $value.value -notin @(0,1)) -or (!$value.present -and $null -ne $value.value)) { throw 'Invalid baseline display value.' }
    }
}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AcceptanceDisplay {
    [DllImport("user32.dll", EntryPoint="SystemParametersInfoW", SetLastError=true)]
    public static extern bool Get(uint action, uint param, out int value, uint flags);
    [DllImport("user32.dll", EntryPoint="SystemParametersInfoW", SetLastError=true)]
    public static extern bool Set(uint action, uint param, IntPtr value, uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern IntPtr SendMessageTimeout(IntPtr window, uint message, UIntPtr param, string value, uint flags, uint timeout, out UIntPtr result);
}
'@
function Read-Display {
    $animation = 0
    if (![AcceptanceDisplay]::Get(0x1042,0,[ref]$animation,0)) { throw 'Cannot read client animation preference.' }
    $item = Get-Item -LiteralPath $key
    $values = @{}
    foreach ($name in @('AppsUseLightTheme','EnableTransparency')) {
        $present = $name -in $item.GetValueNames()
        if ($present -and ($item.GetValueKind($name) -ne 'DWord' -or $item.GetValue($name) -notin @(0,1))) { throw 'Unexpected display preference type/value.' }
        $values[$name] = @{ present=$present; value=$(if ($present) { $item.GetValue($name) } else { $null }) }
    }
    @{ registry=$values; client_animation=[bool]$animation }
}
function Broadcast-Display {
    $result = [UIntPtr]::Zero
    # Bounded WM_SETTINGCHANGE notification, no UI input or process termination.
    [void][AcceptanceDisplay]::SendMessageTimeout([IntPtr]0xffff,0x001a,[UIntPtr]::Zero,'ImmersiveColorSet',2,1000,[ref]$result)
}
function Set-Animation([bool]$enabled) {
    # SPI_SETCLIENTAREAANIMATION takes a BOOL value in pvParam, not a pointer.
    if (![AcceptanceDisplay]::Set(0x1043,0,[IntPtr][int]$enabled,3)) { throw 'Cannot set client animation preference.' }
}
if ($Action -ne 'Restore') {
    $state = Get-Content -Raw -LiteralPath (Join-Path $root '.local/installed-acceptance/installation.json') | ConvertFrom-Json
    $buildPath = if ($state.upgraded) { '.local/installed-acceptance-upgrade/build.json' } else { '.local/installed-acceptance/build.json' }
    $build = Get-Content -Raw -LiteralPath (Join-Path $root $buildPath) | ConvertFrom-Json
    if ($state.identity -ne 'app.jobscout.installedacceptance' -or $state.upgrade_pending -or $build.mode -ne 'production-engine' -or $build.identifier -ne $state.identity) { throw 'Requires the completed separate production-engine identity.' }
    $destination = [IO.Path]::GetFullPath($state.destination)
    if ([IO.Path]::GetDirectoryName($destination) -ne (Join-Path $root '.local/installed-acceptance') -or [IO.Path]::GetFileName($destination) -notmatch '^installed-[0-9a-f]{32}$') { throw 'Unowned installed destination.' }
    if ((Get-FileHash -LiteralPath (Join-Path $destination 'jobscout-engine.exe')).Hash.ToLowerInvariant() -ne $build.engine_sha256) { throw 'Installed production engine changed.' }
}
if ($Action -eq 'Capture') {
    if (Test-Path -LiteralPath $baseline) { throw 'Keep the original display baseline; never overwrite it.' }
    @{ kind='jobscout-display-baseline-v1'; display=(Read-Display) } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $baseline -Encoding UTF8
} else {
    $saved = Get-Content -Raw -LiteralPath $baseline | ConvertFrom-Json
    Assert-DisplayBaseline $saved
    if ($Action -eq 'Restore') {
        foreach ($name in @('AppsUseLightTheme','EnableTransparency')) {
            $value = $saved.display.registry.$name
            if ($value.present) { New-ItemProperty -LiteralPath $key -Name $name -Value $value.value -PropertyType DWord -Force | Out-Null }
            elseif ($name -in (Get-Item -LiteralPath $key).GetValueNames()) { Remove-ItemProperty -LiteralPath $key -Name $name }
        }
        Set-Animation $saved.display.client_animation
    } elseif ($Action -eq 'Reduce') {
        New-ItemProperty -LiteralPath $key -Name EnableTransparency -Value 0 -PropertyType DWord -Force | Out-Null
        Set-Animation $false
    } else {
        $light = [int]($Action -eq 'Light')
        New-ItemProperty -LiteralPath $key -Name AppsUseLightTheme -Value $light -PropertyType DWord -Force | Out-Null
    }
    Broadcast-Display
    $actual = Read-Display
    if ($Action -eq 'Restore') {
        foreach ($name in @('AppsUseLightTheme','EnableTransparency')) {
            if ($actual.registry[$name].present -ne $saved.display.registry.$name.present -or $actual.registry[$name].value -ne $saved.display.registry.$name.value) { throw 'Display restoration differs from baseline.' }
        }
        if ($actual.client_animation -ne $saved.display.client_animation) { throw 'Animation restoration differs from baseline.' }
    } elseif ($Action -eq 'Reduce') {
        if ($actual.client_animation -or $actual.registry.EnableTransparency.value -ne 0) { throw 'Reduction preference readback failed.' }
    } elseif ($actual.registry.AppsUseLightTheme.value -ne $light) { throw 'Theme preference readback failed.' }
}
@{ action=$Action; display=(Read-Display); scope='Actual current-user Windows display preferences; observe the installed UI separately. Restore the baseline before ending.' } | ConvertTo-Json -Depth 6
