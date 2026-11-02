"""Installed ownership regressions using mocked PowerShell process records.

Only the snapshot block and ownership functions are extracted from the real
helper. No installation, application, real process enumeration or kill runs.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[1] / 'check-installed-acceptance.ps1'
PWSH = shutil.which('pwsh')

HARNESS = r"""
param([string]$Source, [string]$Manifest, [string]$Mode)
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Installed helper did not parse.' }
foreach ($name in @('Start-Ticks', 'Owned-Processes')) {
    $definitions = @($ast.FindAll({ param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
    }, $true))
    if ($definitions.Count -ne 1) { throw "Expected one function: $name" }
    . ([scriptblock]::Create($definitions[0].Extent.Text))
}

$destination = Join-Path (Split-Path $Manifest -Parent) 'synthetic-install'
$desktopPath = Join-Path $destination 'jobscout-desktop.exe'
$enginePath = Join-Path $destination 'jobscout-engine.exe'
$baseTime = [DateTimeOffset]::Parse('2026-11-02T00:00:00Z').UtcDateTime
$script:fixtures = @{}
function Add-Fixture($number, $parent, $seconds, $name, $file) {
    $process = [pscustomobject]@{
        Id = $number; StartTime = $baseTime.AddSeconds($seconds)
        ProcessName = $name; Path = $file; Handle = [IntPtr]$number
        HasExited = $false; WorkingSet64 = 1048576L; PrivateMemorySize64 = 524288L
    }
    $process | Add-Member -MemberType ScriptMethod -Name Kill -Value { throw 'No kill is allowed in this regression.' }
    $script:fixtures[[int]$number] = $process
    [pscustomobject]@{ ProcessId = $number; ParentProcessId = $parent; ExecutablePath = $file; Name = "$name.exe" }
}
$script:rows = @(
    Add-Fixture 100 50 10 'jobscout-desktop' $desktopPath
    # Its parent exited long ago; Windows reused that parent's PID as 100.
    Add-Fixture 200 100 1 'vctip' (Join-Path $destination 'unrelated-vctip.exe')
    Add-Fixture 300 100 11 'jobscout-engine' $enginePath
    Add-Fixture 500 300 12 'msedgewebview2' (Join-Path $destination 'webview.exe')
    Add-Fixture 400 999 9 'unrelated' (Join-Path $destination 'unrelated.exe')
    Add-Fixture 600 999 14 'reused' (Join-Path $destination 'reused.exe')
)
function Get-Process {
    param([int]$Id, [string]$ErrorAction)
    if ($script:fixtures.ContainsKey($Id)) { $script:fixtures[$Id] }
}
function Get-CimInstance {
    param([string]$ClassName, [string[]]$Property)
    if ($ClassName -ne 'Win32_Process') { throw 'Unexpected process enumeration.' }
    $script:rows
}

if ($Mode -eq 'snapshot') {
    $state = [pscustomobject]@{ owned = @() }
    $manifestPath = $Manifest
    $Action = 'Snapshot'
    $blocks = @($ast.FindAll({ param($node)
        $node -is [System.Management.Automation.Language.IfStatementAst] -and
        $node.Clauses.Count -eq 1 -and $node.Clauses[0].Item1.Extent.Text -eq '$Action -eq ''Snapshot'''
    }, $true))
    if ($blocks.Count -ne 1) { throw 'Expected one snapshot action block.' }
    # The production block exits after writing its owned manifest and summary.
    & ([scriptblock]::Create($blocks[0].Extent.Text))
    throw 'Snapshot block did not exit.'
}
$state = [pscustomobject]@{ owned = @(
    [pscustomobject]@{ id = 100; started = $baseTime.AddSeconds(10).ToString('o'); name = 'jobscout-desktop' }
    [pscustomobject]@{ id = 200; started = $baseTime.AddSeconds(1).ToString('o'); name = 'vctip' }
    [pscustomobject]@{ id = 300; started = $baseTime.AddSeconds(11); name = 'jobscout-engine' }
    # This PID belongs to a new process now; matching ID alone is insufficient.
    [pscustomobject]@{ id = 600; started = $baseTime.AddSeconds(12).ToString('o'); name = 'old-process' }
) }
if ($Mode -eq 'owned-closed') {
    $script:fixtures.Remove(100)
    $script:fixtures.Remove(300)
} elseif ($Mode -ne 'owned') { throw 'Unexpected test mode.' }
$remaining = @(Owned-Processes $state)
@{ ids = @($remaining | ForEach-Object { $_.id }) } | ConvertTo-Json -Compress
"""


@unittest.skipUnless(PWSH, 'PowerShell 7 is required for the isolated process-record regression')
class InstalledProcessSnapshotTests(unittest.TestCase):
    def run_harness(self, mode):
        with tempfile.TemporaryDirectory(prefix='jobscout-process-regression-') as directory:
            path = Path(directory)
            harness = path / 'process-fixtures.ps1'
            manifest = path / 'snapshot.json'
            harness.write_text(HARNESS, encoding='utf-8')
            result = subprocess.run(
                [PWSH, '-NoProfile', '-NonInteractive', '-File', str(harness),
                 str(SOURCE), str(manifest), mode], capture_output=True, text=True,
                timeout=20, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            saved = json.loads(manifest.read_text(encoding='utf-8-sig')) if manifest.exists() else None
            return json.loads(result.stdout), saved

    def test_snapshot_rejects_historical_parent_pid_and_keeps_real_descendants(self):
        summary, state = self.run_harness('snapshot')
        self.assertEqual(sorted(member['id'] for member in state['owned']), [100, 300, 500])
        self.assertEqual(summary['owned_processes'], 3)
        self.assertEqual(summary['engine_processes'], 1)
        self.assertEqual(summary['webview_processes'], 1)
        self.assertEqual(summary['stale_parent_links_excluded'], 1)

    def test_legacy_snapshot_keeps_owned_members_and_rejects_stale_or_reused_pid(self):
        result, _ = self.run_harness('owned')
        self.assertEqual(sorted(result['ids']), [100, 300])

    def test_legacy_unrelated_survivor_cannot_prevent_owned_tree_closure(self):
        result, _ = self.run_harness('owned-closed')
        self.assertEqual(result['ids'], [])


if __name__ == '__main__':
    unittest.main()
