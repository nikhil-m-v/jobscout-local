"""Review pinned local certifi index/wheel/sdist evidence without network or execution."""
import argparse
from email.parser import BytesParser
import gzip
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

try:
    from scripts.verify_certifi_archive import verify_certifi, sha256
except ModuleNotFoundError:
    from verify_certifi_archive import verify_certifi, sha256

MAX_BYTES = 20_000_000
MAX_ENTRIES = 1000


def read_local(path):
    path = Path(path)
    if any(p.is_symlink() or p.is_junction() for p in (path, *path.parents)):
        raise ValueError('Linked evidence input')
    with path.open('rb') as stream:
        data = stream.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Evidence exceeds size limit')
    return data


def identity(data):
    return dict(sha256=sha256(data), sizeBytes=len(data))


def compare_sdist(data, version, wheel):
    # Bound the complete decompressed tar, including headers, before parsing.
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
        unpacked = stream.read(MAX_BYTES + 1)
    if len(unpacked) > MAX_BYTES:
        raise ValueError('Decompressed source exceeds size limit')
    files, seen, directories = {}, set(), set()
    with tarfile.open(fileobj=io.BytesIO(unpacked), mode='r:') as archive:
        for member in archive:
            name = member.name.rstrip('/') if member.isdir() else member.name
            parts = name.split('/')
            if (parts[0] != f'certifi-{version}' or
                    any(not p or p in {'.', '..'} or ':' in p or '\\' in p or
                        p.endswith((' ', '.')) for p in parts) or
                    name.casefold() in seen or member.issparse() or
                    not (member.isfile() or member.isdir())):
                raise ValueError('Unsafe or duplicate sdist entry')
            seen.add(name.casefold())
            if len(seen) > MAX_ENTRIES:
                raise ValueError('Too many source entries')
            if member.isdir():
                directories.add('/'.join(parts[1:]).casefold())
                continue
            if len(parts) < 2:
                raise ValueError('Invalid source file root')
            files['/'.join(parts[1:])] = archive.extractfile(member).read()
    folded_files = {n.casefold() for n in files}
    for name in folded_files | directories:
        parts = name.split('/')
        if name in folded_files & directories or any('/'.join(parts[:i]) in folded_files for i in range(1, len(parts))):
            raise ValueError('Conflicting source destinations')
    metadata = BytesParser().parsebytes(files.get('PKG-INFO', b''))
    if metadata.get_all('Name') != ['certifi'] or metadata.get_all('Version') != [version]:
        raise ValueError('Source metadata identity mismatch')
    expected = {f['path']: f for f in wheel['files'] if f['path'].startswith('certifi/')}
    actual = {n for n in files if n.startswith('certifi/')}
    if actual != expected.keys():
        raise ValueError('Source and wheel package membership differ')
    for name, item in expected.items():
        if identity(files[name]) != {k: item[k] for k in ('sha256', 'sizeBytes')}:
            raise ValueError('Source package bytes differ from wheel')
    licenses = [f for f in wheel['files'] if f['path'].endswith('.dist-info/licenses/LICENSE')]
    if len(licenses) != 1 or identity(files.get('LICENSE', b'')) != {k: licenses[0][k] for k in ('sha256', 'sizeBytes')}:
        raise ValueError('Source license differs from wheel')
    return dict(status='package-bytes-match', comparedPackageFiles=len(expected),
                licenseBytesMatch=True, files=[dict(path=n, **identity(b)) for n, b in sorted(files.items())],
                limitation='Package equality is not proof of historical build inputs or complete corresponding source.')


def review(index_path, index_sha256, pin_path, output, sdist=None):
    repo = Path(__file__).resolve().parents[1]
    output = Path(output)
    if (output.exists() or not any(output.resolve().is_relative_to(repo / p) for p in ('work', '.local')) or
            any(p.is_symlink() or p.is_junction() for p in (output, *output.parents)) or
            subprocess.run(['git', 'check-ignore', '--quiet', str(output.resolve())], cwd=repo).returncode != 0):
        raise ValueError('Output must be a new ignored review directory')
    index_bytes, pin_bytes = read_local(index_path), read_local(pin_path)
    if not re.fullmatch('[0-9a-f]{64}', index_sha256) or sha256(index_bytes) != index_sha256:
        raise ValueError('Index checksum mismatch')
    index, pin = json.loads(index_bytes), json.loads(pin_bytes)
    wheel_bytes, wheel = verify_certifi(pin, pin['version'])
    if index.get('name') != 'certifi':
        raise ValueError('Index identity mismatch')
    selected = []
    for name in (wheel['archive'], f"certifi-{pin['version']}.tar.gz"):
        entries = [e for e in index['files'] if e.get('filename') == name]
        if len(entries) != 1:
            raise ValueError('Missing or ambiguous index entry')
        entry = entries[0]
        if (not isinstance(entry.get('size'), int) or isinstance(entry['size'], bool) or
                not 0 < entry['size'] <= MAX_BYTES or
                not re.fullmatch('[0-9a-f]{64}', entry.get('hashes', {}).get('sha256', ''))):
            raise ValueError('Invalid indexed archive identity')
        selected.append(dict(filename=name, sha256=entry['hashes']['sha256'], sizeBytes=entry['size']))
    if identity(wheel_bytes) != {k: selected[0][k] for k in ('sha256', 'sizeBytes')}:
        raise ValueError('Wheel differs from index')
    source_bytes = None
    comparison = dict(status='missing', reason='No local sdist supplied; indexed identity only')
    if sdist is not None:
        source_bytes = read_local(sdist)
        if Path(sdist).name != selected[1]['filename'] or identity(source_bytes) != {k: selected[1][k] for k in ('sha256', 'sizeBytes')}:
            raise ValueError('Source archive differs from index')
        comparison = compare_sdist(source_bytes, pin['version'], wheel)
    report = dict(schemaVersion=1, index=identity(index_bytes), wheelPin=identity(pin_bytes),
                  identity=dict(indexedArchives=selected, wheelVerified=True, sourceComparison=comparison),
                  provenance=dict(status='unresolved', upstreamAuthenticated=False, sourceRevision=None,
                                  certificateGenerationInputs='unresolved'),
                  sourceDelivery=dict(status='unresolved', sourceCompleteness='unresolved', recipientLocation=None),
                  licenseClearance='unresolved', releaseApproved=False)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'index.json').write_bytes(index_bytes)
    (output / wheel['archive']).write_bytes(wheel_bytes)
    if source_bytes is not None:
        (output / selected[1]['filename']).write_bytes(source_bytes)
    (output / 'review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('index', 'wheel-pin', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--index-sha256', required=True)
    parser.add_argument('--sdist', type=Path)
    args = parser.parse_args()
    try:
        result = review(args.index, args.index_sha256, args.wheel_pin, args.output, args.sdist)
        print('Source comparison: ' + result['identity']['sourceComparison']['status'] + '; provenance and delivery unresolved.')
    except (ValueError, OSError, KeyError, tarfile.TarError) as error:
        raise SystemExit(f'Certifi review failed: {error}') from None
