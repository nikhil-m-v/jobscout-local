"""Prepare local MPL review evidence. No downloads, extraction or clearance."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import tarfile
import tomllib
import subprocess
import zipfile

try:
    from scripts.verify_certifi_archive import verify_certifi
except ModuleNotFoundError:
    from verify_certifi_archive import verify_certifi

MAX_ARCHIVE_BYTES = 100_000_000
MAX_SOURCE_BYTES = 300_000_000
CRATES_IO = 'registry+https://github.com/rust-lang/crates.io-index'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_source_tree(data, directory, name, version):
    """Compare every regular archived file with the source used by Cargo.

    Never extract tar entries. Links, traversal, duplicate destinations and
    unaccounted source files fail closed. Cargo's two cache markers are omitted.
    """
    directory = directory.resolve()
    prefix = f'{name}-{version}'
    seen = set()
    total = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive:
            parts = PurePosixPath(member.name).parts
            if ('\\' in member.name or member.name.startswith('/') or
                    not parts or parts[0] != prefix or
                    any(part in {'..', '.'} or ':' in part for part in parts)):
                raise ValueError('Unsafe source archive path')
            if member.isdir():
                continue
            if not member.isfile() or len(parts) < 2:
                raise ValueError('Unsupported source archive entry')
            relative = PurePosixPath(*parts[1:]).as_posix()
            if relative.casefold() in seen:
                raise ValueError('Duplicate source archive path')
            seen.add(relative.casefold())
            total += member.size
            if total > MAX_SOURCE_BYTES:
                raise ValueError('Source archive exceeds size limit')
            target = directory.joinpath(*parts[1:])
            if (target.is_symlink() or not target.resolve().is_relative_to(directory)
                    or not target.is_file()):
                raise ValueError('Missing or linked cached source file')
            with archive.extractfile(member) as source:
                if target.stat().st_size != member.size or digest(target.read_bytes()) != digest(source.read()):
                    raise ValueError('Cached source differs from locked archive')
    if not seen:
        raise ValueError('Empty source archive')
    for file in directory.rglob('*'):
        if file.is_symlink() or not file.resolve().is_relative_to(directory):
            raise ValueError('Linked cached source entry')
        if file.is_file():
            relative = file.relative_to(directory).as_posix()
            if relative not in {'.cargo-ok', '.cargo-checksum.json'} and relative.casefold() not in seen:
                raise ValueError('Additional cached source file')
    return len(seen)


def prepare(inventory_path, cargo_path, lock_path, cache, output, python_evidence=None):
    inventory_bytes = inventory_path.read_bytes()
    lock_bytes = lock_path.read_bytes()
    inventory = json.loads(inventory_bytes)
    cargo = json.loads(cargo_path.read_text(encoding='utf-8-sig'))
    lock = tomllib.loads(lock_bytes.decode('utf-8'))
    if inventory.get('schemaVersion') != 1 or not isinstance(inventory.get('components'), list):
        raise ValueError('Unsupported notice inventory')
    if output.exists():
        raise ValueError('Source evidence output must be a new directory')
    repo = Path(__file__).resolve().parents[1]
    resolved_output = output.resolve()
    if (not any(resolved_output.is_relative_to(repo / folder) for folder in ('work', '.local')) or
            any(p.is_symlink() or p.is_junction() for p in (output, *output.parents)) or
            subprocess.run(['git', 'check-ignore', '--quiet', str(resolved_output)],
                           cwd=repo, check=False).returncode != 0):
        raise ValueError('Source evidence output must be in an ignored review workspace')
    python_bytes = python_evidence.read_bytes() if python_evidence else None
    pin = json.loads(python_bytes) if python_bytes else None
    candidates = [item for item in inventory['components']
                  if re.search(r'\bMPL-2\.0\b', item['declaredLicense'])]
    records, archives = [], {}
    python_candidates = [c for c in candidates if c['ecosystem'] == 'python-frozen-input' and c['name'] == 'certifi']
    if python_evidence and (not isinstance(pin, dict) or len(python_candidates) != 1):
        raise ValueError('Ambiguous or missing certifi inventory candidate')
    for component in sorted(candidates, key=lambda c: (c['ecosystem'], c['name'], c['version'])):
        name, version = component['name'], component['version']
        record = {key: component[key] for key in ('ecosystem', 'name', 'version', 'declaredLicense')}
        record.update(shippedDisposition='pending', reviewStatus='pending')
        records.append(record)
        if pin is not None and component in python_candidates:
            data, evidence = verify_certifi(pin, version)
            archives[evidence['archive']] = data
            record.update(evidence)
            record.update(status='unresolved',
                          reason='Local wheel verified; upstream source completeness and delivery remain unresolved')
            continue
        if component['ecosystem'] != 'cargo-windows-build-graph':
            record.update(status='unresolved', reason='No supported cached source archive for this ecosystem')
            continue
        if not re.fullmatch(r'[A-Za-z0-9_-]+', name) or not re.fullmatch(r'[A-Za-z0-9.+_-]+', version):
            raise ValueError('Invalid source package identity')
        packages = [p for p in cargo['packages'] if p['name'] == name and p['version'] == version]
        locked = [p for p in lock['package'] if p['name'] == name and p['version'] == version]
        if len(packages) != 1 or len(locked) != 1:
            raise ValueError('Ambiguous or missing locked source package')
        package, entry = packages[0], locked[0]
        if package.get('source') != CRATES_IO or entry.get('source') != CRATES_IO:
            record.update(status='unresolved', reason='Source registry requires separate provenance review')
            continue
        expected = entry.get('checksum', '')
        if not re.fullmatch(r'[0-9a-f]{64}', expected):
            raise ValueError('Missing locked source checksum')
        filename = f'{name}-{version}.crate'
        matches = sorted(cache.glob(f'*/{filename}'))
        if not matches:
            record.update(status='unresolved', reason='Locked source archive is absent from local cache')
            continue
        verified = None
        for archive in matches:
            if archive.is_symlink() or not archive.resolve().is_relative_to(cache.resolve()):
                raise ValueError('Linked source cache archive')
            if archive.stat().st_size > MAX_ARCHIVE_BYTES:
                raise ValueError('Source archive exceeds size limit')
            data = archive.read_bytes()
            if digest(data) != expected:
                raise ValueError('Source archive checksum differs from Cargo.lock')
            verified = data
        count = verify_source_tree(verified, Path(package['manifest_path']).parent, name, version)
        archives[filename] = verified
        record.update(status='prepared', archive=filename, sha256=expected,
                      sizeBytes=len(verified), comparedFileCount=count,
                      source=CRATES_IO, modifications='Cached source matches every archived file; no extra source files')
    report = {'schemaVersion': 1, 'releaseApproved': False,
              'inventorySha256': digest(inventory_bytes), 'cargoLockSha256': digest(lock_bytes),
              'components': records, 'preparedCount': len(archives),
              'unresolvedCount': sum(r['status'] == 'unresolved' for r in records),
              'scope': 'MPL-2.0 metadata candidates only; conservative build graph, not shipped-component clearance',
              'remainingReview': ['Runtime/native/static vendors and other license obligations',
                                  'Shipped versus build-only dispositions',
                                  'Durable recipient source location and notice',
                                  'Exact final-installer mapping and reviewer signoff']}
    if python_bytes is not None:
        report['pythonEvidenceSha256'] = digest(python_bytes)
    # All validation precedes output; never overwrite an earlier evidence set.
    output.mkdir(parents=True, exist_ok=False)
    for filename, data in archives.items():
        (output / filename).write_bytes(data)
    (output / 'source-review.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('inventory', 'cargo', 'lock', 'cache', 'output'):
        parser.add_argument(f'--{name}', type=Path, required=True)
    parser.add_argument('--python-evidence', type=Path,
                        help='Local certifi pin JSON: name, version, sha256, archive, installedRoot')
    args = parser.parse_args()
    try:
        report = prepare(args.inventory, args.cargo, args.lock, args.cache, args.output, args.python_evidence)
        print(f"Retained {report['preparedCount']} archives; {report['unresolvedCount']} unresolved candidates. Review remains open.")
    except (ValueError, OSError, KeyError, tarfile.TarError, zipfile.BadZipFile) as error:
        raise SystemExit(f'Source preparation failed: {error}') from None
