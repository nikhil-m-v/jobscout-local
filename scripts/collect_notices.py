"""Collect installed dependency notices offline; never declare legal clearance."""
import argparse
import ast
import hashlib
import importlib.metadata as metadata
import json
import os
from pathlib import Path
import re
import sys

NOTICE_NAME = re.compile(r'^(licen[sc]e|copying|copyright|notice)(?:$|[-_.])', re.I)
SOURCE_SUFFIXES = {'.py', '.rs', '.js', '.ts', '.c', '.h', '.toml', '.json'}


def notice_files(root):
    """Only named notice documents, including vendored license subfolders."""
    root = root.resolve()
    result = []
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in {'.git', 'node_modules', 'target'}
                         and not (Path(current) / d).is_symlink())
        for name in sorted(files):
            file = Path(current) / name
            if NOTICE_NAME.match(name) and file.suffix.lower() not in SOURCE_SUFFIXES:
                if file.is_symlink() or not file.resolve().is_relative_to(root):
                    raise ValueError('Linked or escaping license document')
                result.append(file)
    return result


def read_notice(file):
    data = file.read_bytes()
    if not data or len(data) > 1_000_000 or b'\0' in data:
        raise ValueError('Invalid or oversized license document')
    text = data.decode('utf-8-sig').replace('\r\n', '\n')
    return hashlib.sha256(text.encode()).hexdigest(), text


def override_files(root, entries):
    result = []
    for entry in entries:
        original = root / 'packaging' / entry['file']
        file = original.resolve()
        if original.is_symlink() or not file.is_relative_to((root / 'packaging/licenses').resolve()):
            raise ValueError('Escaping or linked license override')
        if hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('License override hash mismatch')
        result.append(file)
    return result


def npm_components(tree):
    found = {}
    def visit(node):
        for name, item in sorted(node.get('dependencies', {}).items()):
            if not name.startswith('@jobscout/'):
                key = (name, item['version'])
                if 'path' not in item:
                    raise ValueError('npm metadata requires --long paths')
                found[key] = item
            visit(item)
    visit(tree)
    return [(name, version, item.get('license', 'unspecified'), Path(item['path']))
            for (name, version), item in sorted(found.items())]


def cargo_components(tree):
    nodes = {n['id']: n for n in tree['resolve']['nodes']}
    pending = [tree['resolve']['root']]
    selected = set()
    while pending:
        item = pending.pop()
        if item in selected:
            continue
        selected.add(item)
        pending.extend(dep['pkg'] for dep in nodes[item].get('deps', []))
    return [(p['name'], p['version'], p.get('license') or 'unspecified', Path(p['manifest_path']).parent)
            for p in tree['packages'] if p['id'] in selected and p['source'] is not None]


def analysis_files(toc):
    value = ast.literal_eval(toc.read_text(encoding='utf-8'))
    if not isinstance(value, tuple):
        raise ValueError('Unrecognized PyInstaller analysis')
    return sorted({entry[1] for group in value if isinstance(group, list)
                   for entry in group if isinstance(entry, tuple) and len(entry) == 3
                   and isinstance(entry[1], str) and Path(entry[1]).is_file()})


def python_components(files):
    owners = {}
    for distribution in metadata.distributions():
        for file in distribution.files or []:
            owners[os.path.normcase(str(distribution.locate_file(file).resolve()))] = distribution
    found = {}
    unresolved = []
    for file in files:
        owner = owners.get(os.path.normcase(str(Path(file).resolve())))
        if owner:
            name = owner.metadata['Name']
            if name != 'jobscout-engine':
                found[(name, owner.version)] = owner
        elif 'site-packages' in Path(file).parts:
            unresolved.append(Path(file).name)
    result = []
    for (name, version), owner in sorted(found.items()):
        documents = []
        for file in owner.files or []:
            p = Path(str(file))
            if NOTICE_NAME.match(p.name) and p.suffix.lower() not in SOURCE_SUFFIXES:
                resolved = Path(owner.locate_file(file)).resolve()
                if not resolved.is_relative_to(Path(owner.locate_file('')).resolve()):
                    raise ValueError('Escaping Python license document')
                documents.append(resolved)
        result.append((name, version, owner.metadata.get('License-Expression') or
                       owner.metadata.get('License') or 'unspecified', documents))
    return result, sorted(set(unresolved))


def collect(root, npm, cargo, toc, output):
    components = []
    texts = {}
    missing = []
    overrides = json.loads((root / 'packaging/license-overrides.json').read_text(encoding='utf-8'))
    def add(ecosystem, name, version, declared, documents):
        ids = []
        for file in sorted(set(documents)):
            digest, text = read_notice(file)
            texts[digest] = text
            ids.append(digest)
        if not ids:
            missing.append(f'{ecosystem}:{name}@{version}')
        components.append({'ecosystem': ecosystem, 'name': name, 'version': version,
                           'declaredLicense': declared, 'noticeHashes': sorted(set(ids))})
    for name, version, declared, directory in npm_components(npm):
        add('npm-runtime-graph', name, version, declared, notice_files(directory))
    for name, version, declared, directory in cargo_components(cargo):
        documents = notice_files(directory)
        documents.extend(override_files(root, overrides.get(f'{name}@{version}', [])))
        add('cargo-windows-build-graph', name, version, declared, documents)
    files = analysis_files(toc)
    python, unresolved = python_components(files)
    for name, version, declared, documents in python:
        if name.lower() in {'pytest', 'iniconfig', 'pluggy'}:
            raise ValueError('Development test tooling reached the frozen engine')
        add('python-frozen-input', name, version, declared, documents)
    add('runtime', 'CPython', '.'.join(map(str, sys.version_info[:3])), 'PSF and incorporated licenses',
        [Path(sys.base_prefix) / 'LICENSE.txt'])
    add('historical', 'JobScout previously MIT-licensed material', 'prior grants', 'MIT', [root / 'LICENSE-LEGACY'])
    components.sort(key=lambda c: (c['ecosystem'], c['name'], c['version']))
    runtime_binaries = sorted({Path(f).name for f in files if Path(f).suffix.lower() in {'.dll', '.pyd'}
                               and 'site-packages' not in Path(f).parts})
    review = ['MPL-covered dependency source availability and notice obligations',
              'Native/runtime and vendored-component obligations beyond package-level metadata',
              'Historical first-party ownership and final end-user terms']
    report = {'schemaVersion': 1, 'releaseApproved': False, 'components': components,
              'missingNotices': sorted(missing), 'unmappedPythonInputs': unresolved,
              'runtimeBinariesForReview': runtime_binaries, 'manualReview': review,
              'scope': 'npm runtime graph; conservative Windows Cargo build graph; frozen Python inputs and CPython'}
    lines = ['JobScout - collected dependency notices', '',
             'This document preserves collected third-party and historical notices.',
             'Cargo coverage includes build-time dependencies, not a claim that every component is linked.',
             'The notices do not change JobScout ownership or replace applicable component licenses.', '']
    for c in components:
        lines += [f"{c['ecosystem']}: {c['name']} {c['version']}",
                  f"Declared license: {c['declaredLicense']}",
                  'Notice texts: ' + ', '.join(c['noticeHashes']), '']
    for digest, text in sorted(texts.items()):
        lines += ['=' * 72, f'Notice text SHA-256: {digest}', '=' * 72, text, '']
    output.mkdir(parents=True, exist_ok=True)
    # Write the private inventory even on a missing-notice failure. Never
    # overwrite a usable notice bundle with an incomplete new collection.
    (output / 'inventory.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    if missing or unresolved:
        raise ValueError(f'Notice collection incomplete: {len(missing)} missing texts, {len(unresolved)} unmapped Python inputs')
    notice = '\n'.join(lines).encode('utf-8')
    (output / 'THIRD-PARTY-NOTICES.txt').write_bytes(notice)
    report['noticeBundleSha256'] = hashlib.sha256(notice).hexdigest()
    (output / 'inventory.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Collected {len(components)} component entries and {len(texts)} distinct notice texts; manual release review remains open.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--npm', type=Path, required=True)
    parser.add_argument('--cargo', type=Path, required=True)
    parser.add_argument('--analysis', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        collect(Path(__file__).resolve().parents[1], json.loads(args.npm.read_text(encoding='utf-8-sig')),
                json.loads(args.cargo.read_text(encoding='utf-8-sig')), args.analysis, args.output)
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(f'Notice collection failed: {error}') from None
