"""Synthetic source-evidence regressions; no network or real career records."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
import base64
import zipfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('sources', Path(__file__).parents[1] / 'prepare_covered_sources.py')
sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sources)


class SourceTests(unittest.TestCase):
    def setUp(self):
        workspace = Path(__file__).resolve().parents[2] / 'work' / 'source-tests'
        workspace.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='jobscout-source-test-', dir=workspace)
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


class PythonSourceTests(unittest.TestCase):
    make_archive = SourceTests.make_archive

    def setUp(self):
        SourceTests.setUp(self)
        self.python_component = dict(ecosystem='python-frozen-input', name='certifi',
                                     version='1.2.3', declaredLicense='MPL-2.0')
        self.inventory.write_text(json.dumps(dict(schemaVersion=1, components=[self.python_component])))
        self.pin_path = self.root / 'pin.json'
        self.wheel = self.root / 'certifi-1.2.3-py3-none-any.whl'
        self.installed = self.root / 'installed'
        self.members = {'certifi/__init__.py': b'# synthetic', 'certifi/core.py': b'# never execute',
                        'certifi/cacert.pem': b'synthetic certificates',
                        'certifi-1.2.3.dist-info/METADATA': b'Name: certifi\nVersion: 1.2.3\n',
                        'certifi-1.2.3.dist-info/WHEEL': b'Wheel-Version: 1.0\n'}
        self.make_wheel()

    def make_wheel(self, bad_record=False):
        rows = []
        for name, content in self.members.items():
            target = self.installed / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            hashed = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).decode().rstrip('=')
            rows.append(f'{name},sha256={hashed},{len(content)}')
        rows.append('certifi-1.2.3.dist-info/RECORD,,')
        with zipfile.ZipFile(self.wheel, 'w') as archive:
            for name, content in self.members.items():
                archive.writestr(name, content)
            archive.writestr('certifi-1.2.3.dist-info/RECORD', '\n'.join(rows[:-2] if bad_record else rows))
        self.pin = dict(name='certifi', version='1.2.3', sha256=sources.digest(self.wheel.read_bytes()),
                        archive=str(self.wheel), installedRoot=str(self.installed))
        self.pin_path.write_text(json.dumps(self.pin))

    def prepare(self):
        return sources.prepare(self.inventory, self.cargo, self.lock, self.cache, self.output, self.pin_path)

    def test_python_verified_remains_unresolved_and_path_free(self):
        report = self.prepare()
        self.assertEqual(report['preparedCount'], 1)
        self.assertEqual(report['unresolvedCount'], 1)
        self.assertEqual(report['components'][0]['comparedFileCount'], 5)
        self.assertFalse(report['components'][0]['upstreamAuthenticated'])
        self.assertEqual(report['pythonEvidenceSha256'], sources.digest(self.pin_path.read_bytes()))
        self.assertNotIn(str(self.root), json.dumps(report))
        self.assertEqual((self.output / self.wheel.name).read_bytes(), self.wheel.read_bytes())

    def test_python_bad_pin_version_and_hash(self):
        for key, value in [('version', '9.0'), ('sha256', '0' * 64), ('name', 'other')]:
            with self.subTest(key=key):
                self.pin_path.write_text(json.dumps(dict(self.pin, **{key: value})))
                with self.assertRaises(ValueError):
                    self.prepare()
                self.assertFalse(self.output.exists())

    def test_python_metadata_mismatch(self):
        self.members['certifi-1.2.3.dist-info/METADATA'] = b'Name: certifi\nVersion: 9.0\n'
        self.make_wheel()
        with self.assertRaisesRegex(ValueError, 'identity'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_python_record_incomplete(self):
        self.make_wheel(bad_record=True)
        with self.assertRaisesRegex(ValueError, 'RECORD'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_python_installed_changed_or_missing(self):
        target = self.installed / 'certifi/core.py'
        target.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'Installed'):
            self.prepare()
        target.unlink()
        with self.assertRaisesRegex(ValueError, 'Installed'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_python_unsafe_duplicate_and_symlink(self):
        for name, mode in [('certifi/../escape', 0), ('certifi/CORE.py', 0),
                           ('certifi/link', 0o120777)]:
            self.make_wheel()
            with zipfile.ZipFile(self.wheel, 'a') as archive:
                entry = zipfile.ZipInfo(name)
                entry.external_attr = mode << 16
                archive.writestr(entry, b'bad')
            self.pin['sha256'] = sources.digest(self.wheel.read_bytes())
            self.pin_path.write_text(json.dumps(self.pin))
            with self.assertRaisesRegex(ValueError, 'Unsafe'):
                self.prepare()
            self.assertFalse(self.output.exists())

    def test_python_duplicate_inventory(self):
        self.inventory.write_text(json.dumps(dict(schemaVersion=1, components=[self.python_component] * 2)))
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            self.prepare()

    def test_python_record_hash_mismatch(self):
        with zipfile.ZipFile(self.wheel) as archive:
            entries = {name: archive.read(name) for name in archive.namelist()}
        entries['certifi/core.py'] = b'tampered with outer pin updated'
        with zipfile.ZipFile(self.wheel, 'w') as archive:
            for name, data in entries.items():
                archive.writestr(name, data)
        self.pin['sha256'] = sources.digest(self.wheel.read_bytes())
        self.pin_path.write_text(json.dumps(self.pin))
        with self.assertRaisesRegex(ValueError, 'RECORD hash'):
            self.prepare()
        self.assertFalse(self.output.exists())

    def test_python_size_limits(self):
        for limit in ('MAX_ARCHIVE_BYTES', 'MAX_SOURCE_BYTES'):
            with patch.dict(sources.verify_certifi.__globals__, {limit: 1}):
                with self.assertRaisesRegex(ValueError, 'size limit'):
                    self.prepare()
                self.assertFalse(self.output.exists())

    def test_python_prior_output_preserved(self):
        self.prepare()
        prior = (self.output / 'source-review.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'new directory'):
            self.prepare()
        self.assertEqual((self.output / 'source-review.json').read_bytes(), prior)

    def test_python_output_outside_workspace(self):
        self.output = Path(__file__).parents[2] / 'unignored-source-output'
        with self.assertRaisesRegex(ValueError, 'ignored review'):
            self.prepare()


if __name__ == '__main__':
    unittest.main()
