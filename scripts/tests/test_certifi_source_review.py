"""Offline synthetic source comparisons; never execute archive contents."""
import io
import json
import tarfile
import unittest
from unittest.mock import patch

from scripts import review_certifi_source as review
from scripts.tests import test_covered_sources as fixtures


class CertifiSourceReviewTests(unittest.TestCase):
    make_wheel = fixtures.PythonSourceTests.make_wheel
    make_archive = fixtures.SourceTests.make_archive

    def setUp(self):
        fixtures.PythonSourceTests.setUp(self)
        self.members['certifi-1.2.3.dist-info/licenses/LICENSE'] = b'Synthetic license'
        self.make_wheel()
        self.sdist = self.root / 'certifi-1.2.3.tar.gz'
        self.index = self.root / 'index.json'
        self.source = {k: v for k, v in self.members.items() if k.startswith('certifi/')}
        self.source.update({'PKG-INFO': b'Name: certifi\nVersion: 1.2.3\n',
                            'LICENSE': b'Synthetic license',
                            'setup.py': b'raise RuntimeError("must never execute")'})
        self.write_source()

    def write_source(self, extras=()):
        with tarfile.open(self.sdist, 'w:gz') as tar:
            for name, data in self.source.items():
                entry = tarfile.TarInfo('certifi-1.2.3/' + name)
                entry.size = len(data)
                tar.addfile(entry, io.BytesIO(data))
            for entry, data in extras:
                tar.addfile(entry, io.BytesIO(data))
        self.index_data = dict(name='certifi', files=[dict(filename=p.name, size=p.stat().st_size,
                              hashes={'sha256': review.sha256(p.read_bytes())}) for p in (self.wheel, self.sdist)])
        self.write_index()

    def write_index(self):
        self.index.write_text(json.dumps(self.index_data))

    def run_review(self, source=True):
        return review.review(self.index, review.sha256(self.index.read_bytes()), self.pin_path,
                             self.output, self.sdist if source else None)

    def test_match_retains_bytes_but_not_clearance(self):
        r = self.run_review()
        self.assertEqual(r['identity']['sourceComparison']['status'], 'package-bytes-match')
        self.assertEqual((self.output / self.sdist.name).read_bytes(), self.sdist.read_bytes())
        self.assertFalse(r['releaseApproved'])
        self.assertFalse(r['provenance']['upstreamAuthenticated'])
        self.assertEqual(r['sourceDelivery']['sourceCompleteness'], 'unresolved')
        self.assertNotIn(str(self.root), json.dumps(r))

    def test_missing_source_is_explicit(self):
        r = self.run_review(False)
        self.assertEqual(r['identity']['sourceComparison']['status'], 'missing')
        self.assertFalse((self.output / self.sdist.name).exists())

    def test_corrupted_archive_fails_before_output(self):
        self.sdist.write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'differs from index'):
            self.run_review()
        self.assertFalse(self.output.exists())

    def test_package_missing_extra_or_changed(self):
        original = self.source.copy()
        for change in ('missing', 'extra', 'changed'):
            with self.subTest(change=change):
                self.source = original.copy()
                if change == 'missing': del self.source['certifi/core.py']
                elif change == 'extra': self.source['certifi/extra.py'] = b'new'
                else: self.source['certifi/cacert.pem'] = b'changed'
                self.write_source()
                with self.assertRaises(ValueError): self.run_review()
                self.assertFalse(self.output.exists())

    def test_metadata_and_license_mismatch(self):
        original = self.source.copy()
        for key in ('PKG-INFO', 'LICENSE'):
            self.source = dict(original, **{key: b'wrong'})
            self.write_source()
            with self.assertRaises(ValueError): self.run_review()
            self.assertFalse(self.output.exists())

    def test_unsafe_duplicate_link_and_conflicting_entries(self):
        for name, kind in [('certifi-1.2.3/../escape', tarfile.REGTYPE),
                           ('certifi-1.2.3/certifi/CORE.py', tarfile.REGTYPE),
                           ('certifi-1.2.3/link', tarfile.SYMTYPE),
                           ('certifi-1.2.3/hard', tarfile.LNKTYPE),
                           ('certifi-1.2.3/certifi', tarfile.REGTYPE),
                           ('certifi-1.2.3/file:stream', tarfile.REGTYPE)]:
            with self.subTest(name=name):
                entry = tarfile.TarInfo(name); entry.type = kind; entry.linkname = 'LICENSE'
                self.write_source([(entry, b'')])
                with self.assertRaises(ValueError): self.run_review()
                self.assertFalse(self.output.exists())

    def test_index_tampering_ambiguity_and_mismatch(self):
        for mode in ('pin', 'duplicate', 'wheel', 'identity'):
            with self.subTest(mode=mode):
                self.write_source()
                if mode == 'duplicate': self.index_data['files'].append(self.index_data['files'][1])
                elif mode == 'wheel': self.index_data['files'][0]['hashes']['sha256'] = '0' * 64
                elif mode == 'identity': self.index_data['name'] = 'other'
                self.write_index()
                with self.assertRaises(ValueError):
                    if mode == 'pin': review.review(self.index, '0' * 64, self.pin_path, self.output)
                    else: self.run_review()
                self.assertFalse(self.output.exists())

    def test_decompression_and_entry_limits(self):
        _, wheel = review.verify_certifi(self.pin, '1.2.3')
        for setting in ('MAX_BYTES', 'MAX_ENTRIES'):
            with patch.object(review, setting, 1):
                with self.assertRaises(ValueError):
                    review.compare_sdist(self.sdist.read_bytes(), '1.2.3', wheel)

    def test_output_preservation_and_containment(self):
        self.run_review()
        original = (self.output / 'review.json').read_bytes()
        with self.assertRaises(ValueError): self.run_review()
        self.assertEqual((self.output / 'review.json').read_bytes(), original)
        self.output = review.Path(__file__).parents[2] / 'not-an-evidence-output'
        with self.assertRaises(ValueError): self.run_review()
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
