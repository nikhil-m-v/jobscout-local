"""Wizard ownership guards with synthetic manifests and mocked shortcut reads.

No installer, real shortcuts, registry, application or process action runs.
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
param([string]$Source, [string]$Directory, [string]$Mode)
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Installed helper did not parse.' }
foreach ($name in @('Assert-WizardBinding','Assert-Shortcuts','Assert-WizardExited','Start-Ticks')) {
    $definitions = @($ast.FindAll({ param($node)
        $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name
    }, $true))
    if ($definitions.Count -ne 1) { throw "Expected one function: $name" }
    . ([scriptblock]::Create($definitions[0].Extent.Text))
}
$directory = [IO.Path]::GetFullPath($Directory)
$destination = Join-Path $directory 'installed-0123456789abcdef0123456789abcdef'
$build = [pscustomobject]@{ mode='production-engine' }
$buildFile = Join-Path $directory 'build.json'
'synthetic-build' | Set-Content -LiteralPath $buildFile
$script:links = @((Join-Path $directory 'programs.lnk'), (Join-Path $directory 'desktop.lnk'))
foreach ($link in $script:links) { 'synthetic-link' | Set-Content -LiteralPath $link }
function Shortcut-Paths { $script:links }
$script:target = Join-Path $destination 'jobscout-desktop.exe'
$script:arguments = ''
function New-Object {
    param([string]$ComObject)
    if ($ComObject -ne 'WScript.Shell') { throw 'Unexpected COM request.' }
    $shell = [pscustomobject]@{}
    $shell | Add-Member -MemberType ScriptMethod -Name CreateShortcut -Value {
        param($link)
        [pscustomobject]@{ TargetPath=$script:target; Arguments=$script:arguments }
    }
    $shell
}
$baseTime = [DateTimeOffset]::Parse('2026-11-03T00:00:00Z').UtcDateTime
$state = [pscustomobject]@{
    wizard_build_sha256=(Get-FileHash -LiteralPath $buildFile).Hash
    shortcut_paths=$script:links
    wizard_process=[pscustomobject]@{ id=101; started=$baseTime.ToString('o') }
}
function Get-Process {
    param([int]$Id, [string]$ErrorAction)
    if ($Id -ne 101) { throw 'Unexpected process query.' }
    if ($Mode -eq 'active') { [pscustomobject]@{ StartTime=$baseTime } }
    if ($Mode -eq 'reused') { [pscustomobject]@{ StartTime=$baseTime.AddSeconds(1) } }
}
switch ($Mode) {
    'changed-build' { 'changed' | Set-Content -LiteralPath $buildFile }
    'synthetic-engine' { $build.mode='synthetic-search' }
    'outside-destination' { $destination=Join-Path (Split-Path $directory -Parent) 'installed-0123456789abcdef0123456789abcdef' }
    'nested-destination' { $destination=Join-Path $directory 'nested/installed-0123456789abcdef0123456789abcdef' }
    'outside-link' { $state.shortcut_paths=@($script:links[0],(Join-Path $directory 'other.lnk')) }
    'duplicate-links' { $state.shortcut_paths=@($script:links[0],$script:links[0]) }
    'wrong-target' { $script:target=Join-Path $directory 'unrelated.exe' }
    'arguments' { $script:arguments='--unexpected' }
    'missing-link' { Remove-Item -LiteralPath $script:links[1] }
}
try {
    Assert-Shortcuts $state
    Assert-WizardExited $state
    @{ accepted=$true } | ConvertTo-Json -Compress
} catch { @{ accepted=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress }
"""


@unittest.skipUnless(PWSH, 'PowerShell 7 is required for isolated wizard regressions')
class InstalledWizardTests(unittest.TestCase):
    def run_harness(self, mode):
        with tempfile.TemporaryDirectory(prefix='jobscout-wizard-regression-') as directory:
            path = Path(directory)
            harness = path / 'wizard-fixtures.ps1'
            harness.write_text(HARNESS, encoding='utf-8')
            result = subprocess.run(
                [PWSH, '-NoProfile', '-NonInteractive', '-File', str(harness),
                 str(SOURCE), str(path), mode], capture_output=True, text=True,
                timeout=20, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)

    def test_exact_shortcuts_and_exited_installer_are_accepted(self):
        self.assertTrue(self.run_harness('valid')['accepted'])

    def test_changed_build_and_unowned_destinations_fail_closed(self):
        for mode in ('changed-build', 'synthetic-engine', 'outside-destination', 'nested-destination'):
            with self.subTest(mode=mode):
                self.assertFalse(self.run_harness(mode)['accepted'])

    def test_shortcut_identity_target_arguments_and_presence_fail_closed(self):
        for mode in ('outside-link', 'duplicate-links', 'wrong-target', 'arguments', 'missing-link'):
            with self.subTest(mode=mode):
                self.assertFalse(self.run_harness(mode)['accepted'])

    def test_active_installer_is_rejected_but_reused_pid_is_not_owned(self):
        self.assertFalse(self.run_harness('active')['accepted'])
        self.assertTrue(self.run_harness('reused')['accepted'])


if __name__ == '__main__':
    unittest.main()
