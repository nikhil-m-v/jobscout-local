"""Offline review of three known NSIS payloads; never execute the installer.

Requires a separately available 7-Zip CLI. This is a review helper, not a
production packaging prerequisite or a complete installer/license inventory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_entry(archiver, installer, name):
    result = subprocess.run(
        [str(archiver), 'x', '-so', '-y', str(installer), name.replace('/', '\\')],
        capture_output=True, timeout=60, check=False,
    )
    if result.returncode or result.stderr.strip():
        raise ValueError(f'Archive reader failed for {name}')
    return result.stdout


def inspect_listing(archiver, installer):
    result = subprocess.run([str(archiver), 'l', '-slt', str(installer)],
                            capture_output=True, timeout=60, check=False)
    if result.returncode or result.stderr.strip():
        raise ValueError('Archive listing failed')
    text = result.stdout.decode('utf-8', errors='replace')
    header, separator, entries = text.partition('----------')
    if not separator:
        raise ValueError('Unrecognized archive listing')
    properties = dict(line.split(' = ', 1) for line in header.splitlines() if ' = ' in line)
    if properties.get('Type') != 'Nsis':
        raise ValueError('Expected an NSIS archive')
    names = [line[7:].replace('\\', '/') for line in entries.splitlines() if line.startswith('Path = ')]
    if len(names) != len(set(n.lower() for n in names)):
        raise ValueError('Ambiguous duplicate archive paths')
    return {'type': properties['Type'], 'method': properties.get('Method'),
            'subType': properties.get('SubType'), 'listedPaths': names,
            'completeInstallerInventory': False}


def verify(installer, audit, inventory, engine, desktop, notices, archiver, output):
    if output.exists():
        raise ValueError('Existing review output must be preserved')
    paths = dict(installer=installer, audit=audit, inventory=inventory,
                 engine=engine, desktop=desktop, notices=notices, archiver=archiver)
    before = {name: digest(path.read_bytes()) for name, path in paths.items()}
    inv = json.loads(inventory.read_text(encoding='utf-8'))
    receipt = json.loads(audit.read_text(encoding='utf-8'))
    if (receipt['sha256'] != before['installer'] or
            receipt['bytes'] != installer.stat().st_size or receipt['dependencyNotices'] != inv):
        raise ValueError('Installer audit or inventory does not match')
    native = inv.get('nativeArchiveVerification', {})
    if native.get('verified') is not True or native.get('engineSha256') != before['engine']:
        raise ValueError('Missing or mismatched native archive receipt')
    if inv.get('noticeBundleSha256') != before['notices']:
        raise ValueError('Notice bundle does not match inventory')
    listing = inspect_listing(archiver, installer)
    selected = [('jobscout-engine.exe', engine, 'engine'),
                ('jobscout-desktop.exe', desktop, 'desktop'),
                ('licenses/THIRD-PARTY-NOTICES.txt', notices, 'notices')]
    payloads = []
    for name, source, label in selected:
        if name not in listing['listedPaths']:
            raise ValueError(f'Missing archive path: {name}')
        data = read_entry(archiver, installer, name)
        matches = len(data) == source.stat().st_size and digest(data) == before[label]
        # Engine and notices have historical hash receipts. The desktop is only
        # a candidate build output: record drift without upgrading it to a match.
        if not matches and label != 'desktop':
            raise ValueError(f'Installer payload mismatch: {name}')
        if not data:
            raise ValueError(f'Empty installer payload: {name}')
        payloads.append({'archivePath': name, 'sizeBytes': len(data),
                         'sha256': digest(data), 'matchesRetainedInput': matches,
                         'referenceSha256': before[label],
                         'referenceBasis': ('Candidate build output; not a historical receipt'
                                            if label == 'desktop' else 'Historical audit/inventory receipt')})
    if any(digest(path.read_bytes()) != before[name] for name, path in paths.items()):
        raise ValueError('Review input changed during inspection')
    report = {'schemaVersion': 1, 'releaseApproved': False, 'licenseClearance': 'unresolved',
              'scope': 'Exact three application payloads only; no installer execution or installation.',
              'inputSha256': before, 'payloads': payloads, 'archiveReader': listing,
              'allRetainedInputsMatch': all(p['matchesRetainedInput'] for p in payloads),
              'unresolved': [
                  'Complete NSIS command/payload and generated-uninstaller reconciliation.',
                  'Installer stub/plugins, desktop static linkage and bootloader provenance/notice review.',
                  'Runtime/vendor source, patches and build records; recipient source delivery.',
                  'Installed behavior, WebView prerequisite acquisition and release acceptance.',
              ]}
    if not report['allRetainedInputsMatch']:
        report['unresolved'].append('Installer desktop bytes differ from the supplied candidate build output.')
    # Exclusive creation after all checks: never replace a prior evidence report.
    with output.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('installer', 'audit', 'inventory', 'engine', 'desktop', 'notices', 'archiver', 'output'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    try:
        report = verify(**vars(args))
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        parser.exit(1, f'Installer review failed: {error}\n')
    matched = sum(p['matchesRetainedInput'] for p in report['payloads'])
    print(f"Read 3 payloads; {matched} match retained inputs. Complete inventory and clearance remain open.")


if __name__ == '__main__':
    main()
