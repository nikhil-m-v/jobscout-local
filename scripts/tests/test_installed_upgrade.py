"""Fail-closed upgrade identity checks without real installs or registry writes."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'check-installed-acceptance.ps1'
PWSH = shutil.which('pwsh')
HARNESS = r"""
param([string]$Source, [string]$Mode)
$ErrorActionPreference = 'Stop'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($Source,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'Helper syntax failure' }
$definition=@($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-UpgradeBuild' },$true))
if ($definition.Count -ne 1) { throw 'Missing unique upgrade guard' }
. ([scriptblock]::Create($definition[0].Extent.Text))
$state=[pscustomobject]@{}
$build=[pscustomobject]@{ identifier='app.jobscout.installedacceptance'; product='JobScout acceptance'; version='0.1.0'; mode='production-engine'; engine_sha256='engine'; notice_sha256='notices'; desktop_sha256='old-desktop'; installer_sha256='old-installer'; production_before=@{ desktop='production-desktop'; engine='engine'; installer='production-installer' } }
$candidate=$build | ConvertTo-Json | ConvertFrom-Json
$candidate.version='0.1.1'; $candidate.desktop_sha256='new-desktop'; $candidate.installer_sha256='new-installer'
$candidate | Add-Member fixture 'version-only-upgrade'
$candidate | Add-Member from_version '0.1.0'
switch ($Mode) {
    'same-version' { $candidate.version='0.1.0' }
    'downgrade' { $candidate.version='0.0.9' }
    'production-identity' { $candidate.identifier='app.jobscout.local' }
    'changed-product' { $candidate.product='JobScout' }
    'changed-engine' { $candidate.engine_sha256='different' }
    'changed-notices' { $candidate.notice_sha256='different' }
    'same-desktop' { $candidate.desktop_sha256=$build.desktop_sha256 }
    'same-installer' { $candidate.installer_sha256=$build.installer_sha256 }
    'production-drift' { $candidate.production_before.desktop='different' }
    'missing-binding' { $candidate.production_before.engine=$null }
    'synthetic-engine' { $candidate.mode='synthetic-search' }
    'wrong-origin' { $candidate.from_version='0.0.9' }
    'not-fixture' { $candidate.fixture=$null }
    'already-upgraded' { $state | Add-Member upgraded $true }
    'wizard-state' { $state | Add-Member wizard_build_sha256 'old-binding' }
}
try { Assert-UpgradeBuild $candidate; @{ accepted=$true } | ConvertTo-Json -Compress }
catch { @{ accepted=$false; error=$_.Exception.Message } | ConvertTo-Json -Compress }
"""


@unittest.skipUnless(PWSH, 'PowerShell 7 required')
class InstalledUpgradeTests(unittest.TestCase):
    def check(self, mode):
        with tempfile.TemporaryDirectory(prefix='jobscout-upgrade-') as directory:
            file = Path(directory) / 'fixture.ps1'
            file.write_text(HARNESS, encoding='utf-8')
            result = subprocess.run([PWSH, '-NoProfile', '-NonInteractive', '-File', str(file), str(SOURCE), mode],
                                    capture_output=True, text=True, timeout=20,
                                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)['accepted']

    def test_exact_higher_version_fixture_is_accepted(self):
        self.assertTrue(self.check('valid'))

    def test_wrong_version_and_identity_are_rejected(self):
        for mode in ('same-version', 'downgrade', 'production-identity', 'changed-product', 'wrong-origin', 'not-fixture'):
            with self.subTest(mode=mode):
                self.assertFalse(self.check(mode))

    def test_changed_payload_and_production_bindings_are_rejected(self):
        for mode in ('changed-engine', 'changed-notices', 'same-desktop', 'same-installer', 'production-drift', 'missing-binding', 'synthetic-engine'):
            with self.subTest(mode=mode):
                self.assertFalse(self.check(mode))

    def test_incompatible_installation_state_is_rejected(self):
        for mode in ('already-upgraded', 'wizard-state'):
            with self.subTest(mode=mode):
                self.assertFalse(self.check(mode))


if __name__ == '__main__':
    unittest.main()
