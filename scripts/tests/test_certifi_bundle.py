import hashlib
from pathlib import Path
from types import SimpleNamespace
import tomllib
import unittest
from unittest.mock import Mock, patch

from scripts import check_certifi_bundle as check


class CertifiBundleTests(unittest.TestCase):
    def setUp(self):
        self.bundle = b'synthetic reviewed bundle'
        digest = patch.object(check, 'EXPECTED_SHA256', hashlib.sha256(self.bundle).hexdigest())
        digest.start()
        self.addCleanup(digest.stop)

    def test_dependency_pin_requires_reviewed_version(self):
        project = Path(__file__).resolve().parents[2] / 'pyproject.toml'
        dependencies = tomllib.loads(project.read_text(encoding='utf-8'))['project']['dependencies']
        self.assertEqual([d for d in dependencies if d.startswith('certifi')],
                         [f'certifi=={check.EXPECTED_VERSION}'])

    def test_old_or_unreviewed_version_is_rejected_before_bundle_read(self):
        for value in ('2026.7.22', '2026.10.18', '2027.1.1'):
            with self.subTest(value=value), patch.object(check, 'version', return_value=value), \
                    patch.object(Path, 'read_bytes') as read:
                with self.assertRaisesRegex(ValueError, 'required'):
                    check.check_installed()
                read.assert_not_called()

    def test_imported_package_must_match_distribution_metadata(self):
        module = SimpleNamespace(__version__='2026.7.22', where=Mock())
        with patch.object(check, 'version', return_value=check.EXPECTED_VERSION), \
                patch.dict('sys.modules', certifi=module):
            with self.assertRaisesRegex(ValueError, 'metadata'):
                check.check_installed()
            module.where.assert_not_called()

    def test_installed_version_alone_cannot_hide_stale_bundle(self):
        module = SimpleNamespace(__version__=check.EXPECTED_VERSION, where=lambda: 'unused.pem')
        with patch.object(check, 'version', return_value=check.EXPECTED_VERSION), \
                patch.dict('sys.modules', certifi=module), \
                patch.object(Path, 'read_bytes', return_value=self.bundle) as read:
            check.check_installed()
            read.return_value = b'old CA bytes'
            with self.assertRaisesRegex(ValueError, 'differs'):
                check.check_installed()

    def test_frozen_bundle_must_match_regardless_of_installed_package(self):
        for name in ('certifi/cacert.pem', 'certifi\\cacert.pem'):
            archive = SimpleNamespace(toc={name: ()}, extract=Mock(return_value=self.bundle))
            with self.subTest(name=name), patch.object(check, 'open_archive', return_value=archive):
                check.check_frozen('unused.exe')
                archive.extract.assert_called_once_with(name)
                archive.extract.return_value = b'stale frozen CA bytes'
                with self.assertRaisesRegex(ValueError, 'differs'):
                    check.check_frozen('unused.exe')

    def test_missing_ambiguous_or_noncanonical_frozen_bundle_is_rejected(self):
        for names in ([], ['other/cacert.pem'], ['CERTIFI/cacert.pem'],
                      ['certifi/cacert.pem', 'certifi\\cacert.pem']):
            archive = SimpleNamespace(toc=dict.fromkeys(names), extract=Mock())
            with self.subTest(names=names), patch.object(check, 'open_archive', return_value=archive):
                with self.assertRaisesRegex(ValueError, 'exactly one canonical'):
                    check.check_frozen('unused.exe')
                archive.extract.assert_not_called()


if __name__ == '__main__':
    unittest.main()
