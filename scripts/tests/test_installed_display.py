"""Reject corrupt restore baselines without calling native APIs or the registry."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'installed-display-preferences.ps1'
PWSH = shutil.which('pwsh')
HARNESS = r'''
param([string]$Source,[string]$Fixture)
$ErrorActionPreference='Stop'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($Source,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Display helper syntax failed.' }
$definition=@($ast.FindAll({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-DisplayBaseline'},$true))
if ($definition.Count -ne 1) { throw 'Expected one restore validator.' }
. ([scriptblock]::Create($definition[0].Extent.Text))
$saved=Get-Content -Raw -LiteralPath $Fixture | ConvertFrom-Json
try { Assert-DisplayBaseline $saved; @{accepted=$true} | ConvertTo-Json -Compress }
catch { @{accepted=$false} | ConvertTo-Json -Compress }
'''


@unittest.skipUnless(PWSH, 'PowerShell 7 required for isolated display guard tests')
class DisplayBaselineTests(unittest.TestCase):
    def check(self, value):
        with tempfile.TemporaryDirectory(prefix='jobscout-display-') as directory:
            path = Path(directory)
            script = path / 'check.ps1'
            script.write_text(HARNESS, encoding='utf-8')
            fixture = path / 'fixture.json'
            fixture.write_text(json.dumps(value), encoding='utf-8')
            result = subprocess.run([PWSH, '-NoProfile', '-NonInteractive', '-File', str(script), str(SOURCE), str(fixture)],
                                    capture_output=True, text=True, timeout=20,
                                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)['accepted']

    @staticmethod
    def baseline():
        return {'kind': 'jobscout-display-baseline-v1', 'display': {
            'client_animation': True, 'registry': {
                'AppsUseLightTheme': {'present': True, 'value': 0},
                'EnableTransparency': {'present': True, 'value': 1}}}}

    def test_present_and_absent_baselines(self):
        value = self.baseline()
        self.assertTrue(self.check(value))
        value['display']['registry']['EnableTransparency'] = {'present': False, 'value': None}
        self.assertTrue(self.check(value))

    def test_invalid_identity_and_animation(self):
        value = self.baseline()
        value['kind'] = 'unrelated'
        self.assertFalse(self.check(value))
        value = self.baseline()
        value['display']['client_animation'] = 'false'
        self.assertFalse(self.check(value))

    def test_invalid_or_missing_registry_values(self):
        for entry in ({'present': True, 'value': 2}, {'present': 'true', 'value': 0},
                      {'present': False, 'value': 1}, {}):
            with self.subTest(entry=entry):
                value = self.baseline()
                value['display']['registry']['AppsUseLightTheme'] = entry
                self.assertFalse(self.check(value))


if __name__ == '__main__':
    unittest.main()
