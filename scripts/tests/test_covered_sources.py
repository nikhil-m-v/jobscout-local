"""Synthetic source-evidence regressions; no network or real career records."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('sources', Path(__file__).parents[1] / 'prepare_covered_sources.py')
sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sources)


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='jobscout-source-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.tree = self.root / 'source'
        self.tree.mkdir()
        self.cache = self.root / 'cache'
        (self.cache / 'registry').mkdir(parents=True)
        self.output = self.root / 'output'
        self.inventory = self.root / 'inventory.json'
        self.cargo = self.root / 'cargo.json'
        self.lock = self.root / 'Cargo.lock'
        self.component = dict(ecosystem='cargo-windows-build-graph', name='demo', version='1.0', declaredLicense='MPL-2.0')
        self.inventory.write_text(json.dumps(dict(schemaVersion=1, components=[self.component])))
        self.cargo.write_text(json.dumps(dict(packages=[dict(name='demo', version='1.0', source=sources.CRATES_IO,
                                                          manifest_path=str(self.tree / 'Cargo.toml'))])))
        self.archive = self.cache / 'registry/demo-1.0.crate'
        self.make_archive([('demo-1.0/LICENSE', b'Synthetic license'), ('demo-1.0/Cargo.toml', b'Synthetic manifest')])
        (self.tree / 'LICENSE').write_bytes(b'Synthetic license')
        (self.tree / 'Cargo.toml').write_bytes(b'Synthetic manifest')

    def make_archive(self, entries, link=False):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for name, data in entries:
                info = tarfile.TarInfo(name)
                info.size = len(data)
                if link:
                    info.type = tarfile.SYMTYPE
                    info.linkname = 'outside'
                archive.addfile(info, io.BytesIO(data))
        data = stream.getvalue()
        self.archive.write_bytes(data)
        self.lock.write_text(f'[[package]]\nname = "demo"\nversion = "1.0"\nsource = "{sources.CRATES_IO}"\nchecksum = "{hashlib.sha256(data).hexdigest()}"\n')

    def prepare(self):
        return sources.prepare(self.inventory, self.cargo, self.lock, self.cache, self.output)

    def test_prepares_exact_archive_without_local_paths_or_clearance(self):
        (self.tree / '.cargo-ok').write_text('cache marker')
        report = self.prepare()
        self.assertEqual(report['preparedCount'], 1)
        self.assertEqual(report['unresolvedCount'], 0)
        self.assertFalse(report['releaseApproved'])
        self.assertEqual(report['components'][0]['comparedFileCount'], 2)
        self.assertEqual((self.output / self.archive.name).read_bytes(), self.archive.read_bytes())
        self.assertNotIn(str(self.root), json.dumps(report))
        self.assertEqual(report['inventorySha256'], hashlib.sha256(self.inventory.read_bytes()).hexdigest())

    def test_missing_and_unsupported_sources_remain_unresolved(self):
        self.archive.unlink()
        python = dict(self.component, ecosystem='python-frozen-input', name='demo-python')
        self.inventory.write_text(json.dumps(dict(schemaVersion=1, components=[self.component, python])))
        report = self.prepare()
        self.assertEqual(report['preparedCount'], 0)
        self.assertEqual(report['unresolvedCount'], 2)

    def test_changed_archive_fails_before_output(self):
        self.archive.write_bytes(b'tampered')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_modified_missing_and_additional_source_fail(self):
        (self.tree / 'LICENSE').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'differs'):
            self.prepare()
        (self.tree / 'LICENSE').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing'):
            self.prepare()
        (self.tree / 'LICENSE').write_bytes(b'Synthetic license')
        (self.tree / 'extra.rs').write_text('additional build input')
        with self.assertRaisesRegex(ValueError, 'Additional'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_traversal_duplicate_and_link_entries_fail(self):
        for entries, link in [([('demo-1.0/../escape', b'x')], False),
                              ([('demo-1.0/LICENSE', b'Synthetic license')] * 2, False),
                              ([('demo-1.0/link', b'')], True)]:
            with self.subTest(entries=entries, link=link):
                self.make_archive(entries, link)
                with self.assertRaises(ValueError):
                    self.prepare()
                self.assertFalse(self.output.exists())

    def test_existing_output_is_preserved(self):
        self.output.mkdir()
        sentinel = self.output / 'keep.txt'
        sentinel.write_text('keep')
        with self.assertRaisesRegex(ValueError, 'new directory'):
            self.prepare()
        self.assertEqual(sentinel.read_text(), 'keep')

    def test_ambiguous_metadata_fails(self):
        cargo = json.loads(self.cargo.read_text())
        cargo['packages'] *= 2
        self.cargo.write_text(json.dumps(cargo))
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            self.prepare()

    def test_non_mpl_components_are_not_claimed_as_reviewed(self):
        self.component['declaredLicense'] = 'MIT'
        self.inventory.write_text(json.dumps(dict(schemaVersion=1, components=[self.component])))
        report = self.prepare()
        self.assertEqual(report['components'], [])
        self.assertTrue(report['remainingReview'])

    def test_alternate_registry_is_unresolved(self):
        cargo = json.loads(self.cargo.read_text())
        cargo['packages'][0]['source'] = 'registry+https://example.invalid/index'
        self.cargo.write_text(json.dumps(cargo))
        self.assertEqual(self.prepare()['unresolvedCount'], 1)

    def test_duplicate_cache_cannot_hide_corruption(self):
        other = self.cache / 'other-registry'
        other.mkdir()
        (other / self.archive.name).write_bytes(b'corrupt duplicate')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.prepare()

    def test_compressed_and_expanded_size_limits(self):
        for limit in ('MAX_ARCHIVE_BYTES', 'MAX_SOURCE_BYTES'):
            with self.subTest(limit=limit), patch.object(sources, limit, 1):
                with self.assertRaisesRegex(ValueError, 'size limit'):
                    self.prepare()
                self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
