"""Synthetic installer evidence checks; no binary execution or downloads."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from subprocess import CompletedProcess

spec = importlib.util.spec_from_file_location('payload', Path(__file__).parents[1] / 'verify_installer_payload.py')
payload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(payload)


class InstallerPayloadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.args = {n: root / n for n in ('installer', 'audit', 'inventory', 'engine', 'desktop', 'notices', 'archiver', 'output')}
        for n in ('installer', 'engine', 'desktop', 'notices', 'archiver'):
            self.args[n].write_bytes(n.encode())
        self.inv = {'nativeArchiveVerification': {'verified': True, 'engineSha256': payload.digest(b'engine')},
                    'noticeBundleSha256': payload.digest(b'notices')}
        self.save_receipts()
        self.entries = {'jobscout-engine.exe': b'engine', 'jobscout-desktop.exe': b'desktop',
                        'licenses/THIRD-PARTY-NOTICES.txt': b'notices'}
        self.listing = {'listedPaths': list(self.entries), 'subType': 'NSIS-3 Unicode BadCmd=13',
                        'completeInstallerInventory': False}

    def save_receipts(self):
        self.args['inventory'].write_text(json.dumps(self.inv))
        self.args['audit'].write_text(json.dumps({'sha256': payload.digest(b'installer'),
            'bytes': len(b'installer'), 'dependencyNotices': self.inv}))

    def run_review(self, reader=None):
        with patch.object(payload, 'inspect_listing', return_value=self.listing), patch.object(
                payload, 'read_entry', side_effect=reader or (lambda a, i, n: self.entries[n])):
            return payload.verify(**self.args)

    def test_success_preserves_partial_listing_limit_and_no_paths(self):
        report = self.run_review()
        self.assertEqual(len(report['payloads']), 3)
        self.assertFalse(report['archiveReader']['completeInstallerInventory'])
        self.assertIn('BadCmd=13', report['archiveReader']['subType'])
        self.assertFalse(report['releaseApproved'])
        self.assertNotIn(str(self.args['engine'].parent), self.args['output'].read_text())

    def test_changed_payload_fails_without_output(self):
        self.entries['jobscout-engine.exe'] = b'wrong!'
        with self.assertRaisesRegex(ValueError, 'payload mismatch'):
            self.run_review()
        self.assertFalse(self.args['output'].exists())

    def test_desktop_drift_remains_explicit_and_does_not_claim_match(self):
        self.entries['jobscout-desktop.exe'] = b'historical desktop'
        report = self.run_review()
        self.assertFalse(report['allRetainedInputsMatch'])
        self.assertFalse(report['payloads'][1]['matchesRetainedInput'])
        self.assertTrue(any('desktop bytes differ' in s for s in report['unresolved']))

    def test_archive_listing_rejects_duplicates(self):
        data = b'Type = Nsis\n----------\nPath = Demo.exe\nPath = demo.exe\n'
        with patch.object(payload.subprocess, 'run', return_value=CompletedProcess([], 0, data, b'')):
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                payload.inspect_listing(self.args['archiver'], self.args['installer'])

    def test_archive_listing_rejects_other_format(self):
        with patch.object(payload.subprocess, 'run', return_value=CompletedProcess([], 0, b'Type = zip\n----------\n', b'')):
            with self.assertRaisesRegex(ValueError, 'Expected an NSIS'):
                payload.inspect_listing(self.args['archiver'], self.args['installer'])

    def test_reader_error_cannot_become_payload(self):
        with patch.object(payload.subprocess, 'run', return_value=CompletedProcess([], 2, b'partial bytes', b'error')):
            with self.assertRaisesRegex(ValueError, 'Archive reader failed'):
                payload.read_entry(self.args['archiver'], self.args['installer'], 'jobscout-engine.exe')

    def test_missing_path_fails(self):
        self.listing['listedPaths'].remove('jobscout-desktop.exe')
        with self.assertRaisesRegex(ValueError, 'Missing archive path'):
            self.run_review()

    def test_changed_installer_fails_receipt(self):
        self.args['installer'].write_bytes(b'other')
        with self.assertRaisesRegex(ValueError, 'audit or inventory'):
            self.run_review()

    def test_unverified_engine_fails(self):
        self.inv['nativeArchiveVerification']['verified'] = False
        self.save_receipts()
        with self.assertRaisesRegex(ValueError, 'native archive receipt'):
            self.run_review()

    def test_mutating_input_fails(self):
        def reader(a, i, n):
            self.args['installer'].write_bytes(b'changed during read')
            return self.entries[n]
        with self.assertRaisesRegex(ValueError, 'changed during inspection'):
            self.run_review(reader)
        self.assertFalse(self.args['output'].exists())

    def test_existing_output_is_preserved(self):
        self.args['output'].write_bytes(b'prior evidence')
        with self.assertRaisesRegex(ValueError, 'must be preserved'):
            self.run_review()
        self.assertEqual(self.args['output'].read_bytes(), b'prior evidence')


if __name__ == '__main__':
    unittest.main()
