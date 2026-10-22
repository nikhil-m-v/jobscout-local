"""Synthetic packaging checks; no provider, credential or career-data access."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collect_notices', Path(__file__).parents[1] / 'collect_notices.py')
notices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notices)


class NoticeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='jobscout-notices-')
        self.addCleanup(self.temp.cleanup)
        # Windows CI can spell TEMP with an 8.3 alias (RUNNER~1). The collector
        # resolves paths, so expected fixture paths must use the same identity.
        self.root = Path(self.temp.name).resolve()
        (self.root / 'packaging/licenses').mkdir(parents=True)
        (self.root / 'packaging/license-overrides.json').write_text('{}')
        (self.root / 'LICENSE-LEGACY').write_text('Synthetic legacy grant\n')
        (self.root / 'LICENSE.txt').write_text('Synthetic runtime grant\n')
        self.package = self.root / 'package'
        self.package.mkdir()
        self.output = self.root / 'output'

    def collect(self, python=None, unresolved=None):
        with patch.object(notices, 'npm_components', return_value=[('demo', '1', 'MIT', self.package)]), \
             patch.object(notices, 'cargo_components', return_value=[]), \
             patch.object(notices, 'analysis_files', return_value=[]), \
             patch.object(notices, 'python_components', return_value=(python or [], unresolved or [])), \
             patch.object(notices.sys, 'base_prefix', str(self.root)):
            notices.collect(self.root, {}, {}, Path('unused'), self.output)

    def test_deduplicates_notice_texts_and_does_not_leak_paths(self):
        (self.package / 'LICENSE').write_text('Synthetic license\n')
        (self.package / 'NOTICE').write_text('Synthetic license\n')
        self.collect()
        text = (self.output / 'THIRD-PARTY-NOTICES.txt').read_text()
        self.assertEqual(text.count('Synthetic license'), 1)
        self.assertNotIn(str(self.root), text)
        report = json.loads((self.output / 'inventory.json').read_text())
        self.assertFalse(report['releaseApproved'])
        self.assertTrue(report['manualReview'])
        self.assertEqual(report['noticeBundleSha256'], hashlib.sha256(
            (self.output / 'THIRD-PARTY-NOTICES.txt').read_bytes()).hexdigest())

    def test_missing_notice_blocks_new_bundle_and_records_gap(self):
        with self.assertRaisesRegex(ValueError, '1 missing texts'):
            self.collect()
        self.assertFalse((self.output / 'THIRD-PARTY-NOTICES.txt').exists())
        report = json.loads((self.output / 'inventory.json').read_text())
        self.assertEqual(report['missingNotices'], ['npm-runtime-graph:demo@1'])

    def test_unmapped_python_input_blocks_bundle(self):
        (self.package / 'LICENSE').write_text('Synthetic license')
        with self.assertRaisesRegex(ValueError, '1 unmapped Python inputs'):
            self.collect(unresolved=['unknown.pyd'])

    def test_test_tooling_cannot_ship(self):
        (self.package / 'LICENSE').write_text('Synthetic license')
        with self.assertRaisesRegex(ValueError, 'Development test tooling'):
            self.collect(python=[('pytest', '9', 'MIT', [self.package / 'LICENSE'])])

    def test_named_notices_include_vendors_but_exclude_source(self):
        (self.package / 'vendor').mkdir()
        (self.package / 'vendor/LICENSE-MIT').write_text('Synthetic license')
        (self.package / 'license.py').write_text('must not ship')
        (self.package / 'node_modules').mkdir()
        (self.package / 'node_modules/LICENSE').write_text('not this package')
        self.assertEqual(notices.notice_files(self.package), [self.package / 'vendor/LICENSE-MIT'])

    def test_notice_discovery_canonicalizes_noncanonical_input(self):
        (self.package / 'LICENSE').write_text('Synthetic license')
        alternate = self.package / '..' / 'package'
        self.assertEqual(notices.notice_files(alternate), [self.package / 'LICENSE'])

    def test_binary_license_document_is_rejected(self):
        file = self.package / 'LICENSE'
        file.write_bytes(b'fake\0binary')
        with self.assertRaisesRegex(ValueError, 'Invalid'):
            notices.read_notice(file)

    def test_npm_deduplicates_and_requires_local_paths(self):
        item = {'version': '1', 'license': 'MIT', 'path': str(self.package)}
        tree = {'dependencies': {'a': {**item, 'dependencies': {'a': item}}}}
        self.assertEqual(len(notices.npm_components(tree)), 1)
        del item['path']
        with self.assertRaisesRegex(ValueError, '--long'):
            notices.npm_components({'dependencies': {'a': item}})

    def test_cargo_only_follows_resolved_graph(self):
        tree = {'resolve': {'root': 'app', 'nodes': [
            {'id': 'app', 'deps': [{'pkg': 'dep'}]}, {'id': 'dep', 'deps': []}]},
            'packages': [dict(id=name, name=name, version='1', license='MIT',
                              source=None if name == 'app' else 'registry', manifest_path=str(self.package / 'Cargo.toml'))
                         for name in ['app', 'dep', 'unreachable']]}
        self.assertEqual([item[0] for item in notices.cargo_components(tree)], ['dep'])

    def test_checked_in_override_hashes_and_sources(self):
        root = Path(__file__).resolve().parents[2]
        overrides = json.loads((root / 'packaging/license-overrides.json').read_text())
        self.assertTrue(overrides)
        for entries in overrides.values():
            self.assertTrue(entries)
            for entry in entries:
                file = (root / 'packaging' / entry['file']).resolve()
                self.assertTrue(file.is_relative_to(root / 'packaging/licenses'))
                self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), entry['sha256'])
                if entry['source'] != 'https://www.mozilla.org/media/MPL/2.0/index.txt':
                    self.assertRegex(entry['source'], r'^https://raw\.githubusercontent\.com/[^/]+/[^/]+/[0-9a-f]{40}/')

    def test_override_cannot_escape_notice_directory(self):
        with self.assertRaisesRegex(ValueError, 'Escaping'):
            notices.override_files(self.root, [{'file': '../LICENSE.txt', 'sha256': 'unused'}])

    def test_override_rejects_changed_content(self):
        (self.root / 'packaging/licenses/demo.txt').write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            notices.override_files(self.root, [{'file': 'licenses/demo.txt', 'sha256': 'incorrect'}])


if __name__ == '__main__':
    unittest.main()
