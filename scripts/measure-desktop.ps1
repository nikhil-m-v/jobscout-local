# Process metrics only; no UI input, screenshots, personal data or provider calls.
param([int]$Samples = 5)
$ErrorActionPreference = 'Stop'
if ($Samples -lt 3 -or $Samples -gt 10) { throw 'Samples must be between 3 and 10.' }
$root = Split-Path $PSScriptRoot -Parent
$executable = Join-Path $root 'apps/desktop/src-tauri/target/release/jobscout-desktop.exe'
if (!(Test-Path -LiteralPath $executable)) { throw 'Build the paired native application first.' }
if (Get-Process -Name jobscout-desktop -ErrorAction SilentlyContinue) { throw 'Close existing JobScout windows before this benchmark; no existing process will be stopped.' }
$start = [System.Diagnostics.ProcessStartInfo]::new($executable)
$start.UseShellExecute = $false
$start.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$start.WorkingDirectory = Split-Path $executable -Parent
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $start
$known = @()
$measurements = @()
function Read-Tree {
    $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,Name,CreationDate)
    $ids = @($process.Id)
    do {
        $next = @($all | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids } | ForEach-Object { [int]$_.ProcessId })
        $ids += $next
    } while ($next.Count)
    $working = 0L; $private = 0L; $members = @()
    foreach ($id in $ids) {
        $member = Get-Process -Id $id -ErrorAction SilentlyContinue
        if ($member) {
            $working += $member.WorkingSet64; $private += $member.PrivateMemorySize64
            $members += [pscustomobject]@{ id = $id; started = $member.StartTime; name = $member.ProcessName }
        }
    }
    return @{ working = $working; private = $private; members = $members }
}
try {
    $process.Start() | Out-Null
    # Warm filesystem-cache launch of the initial UI in the existing app
    # workspace. Do not read, change or export its profile/credentials.
    Start-Sleep -Seconds 15
    if ($process.HasExited) { throw 'Native application exited before sampling.' }
    for ($sample = 0; $sample -lt $Samples; $sample++) {
        $tree = Read-Tree
        if (($tree.members | Where-Object { $_.name -eq 'jobscout-engine' }).Count -lt 1 -or ($tree.members | Where-Object { $_.name -eq 'msedgewebview2' }).Count -lt 1) { throw 'The native tree does not include the engine and WebView2.' }
        $known = @($known + $tree.members | Sort-Object id -Unique)
        $measurements += [pscustomobject]@{ sample = $sample + 1; processes = $tree.members.Count; working_bytes = $tree.working; private_bytes = $tree.private }
        Start-Sleep -Seconds 1
    }
} finally {
    # Stop only the desktop process this run started. Its engine owner watcher
    # should shut down descendants; this exercises abrupt-owner exit, not UI close.
    if (!$process.HasExited) { $process.Kill(); $process.WaitForExit() }
    $process.Dispose()
}
$cleanup = [System.Diagnostics.Stopwatch]::StartNew()
do {
    $remaining = @($known | Where-Object {
        $member = Get-Process -Id $_.id -ErrorAction SilentlyContinue
        $member -and $member.StartTime -eq $_.started
    })
    if ($remaining.Count -gt 0) { Start-Sleep -Milliseconds 200 }
} while ($remaining.Count -gt 0 -and $cleanup.Elapsed.TotalSeconds -lt 15)
$report = [pscustomobject]@{ measurements = $measurements; remaining_owned_processes = $remaining.Count; cleanup_seconds = [math]::Round($cleanup.Elapsed.TotalSeconds, 2); scope = 'One warm-cache native launch, initial UI, existing workspace, no UI input or search. Summed working sets may double-count shared pages. Not Results/import peak, connected-UI verification, normal close, installation or cold reboot startup.' }
$report | ConvertTo-Json -Depth 5
if ($remaining.Count -gt 0) { throw 'Native owner exit left benchmark descendants running; inspect only recorded process identities.' }
