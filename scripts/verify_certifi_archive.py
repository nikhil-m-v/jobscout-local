"""Offline, explicit-pin certifi wheel comparison; never import archive code."""
import base64
import csv
from email.parser import BytesParser
import hashlib
import io
from pathlib import Path
import re
import stat
import zipfile

MAX_ARCHIVE_BYTES = 100_000_000
MAX_SOURCE_BYTES = 300_000_000


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify_certifi(pin, version):
    if (set(pin) != {'name', 'version', 'sha256', 'archive', 'installedRoot'} or
            pin['name'] != 'certifi' or pin['version'] != version or
            not re.fullmatch(r'[0-9]+(?:\.[0-9]+)*', version) or
            not re.fullmatch(r'[0-9a-f]{64}', pin['sha256'])):
        raise ValueError('Invalid exact certifi archive pin')
    path = Path(pin['archive'])
    root = Path(pin['installedRoot'])
    for target in (path, root):
        if any(p.is_symlink() or p.is_junction() for p in (target, *target.parents)):
            raise ValueError('Linked Python evidence input')
    if path.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('Python archive exceeds size limit')
    data = path.read_bytes()
    if sha256(data) != pin['sha256']:
        raise ValueError('Python archive checksum mismatch')
    dist = f'certifi-{version}.dist-info'
    filename = f'certifi-{version}-py3-none-any.whl'
    if path.name != filename:
        raise ValueError('Unexpected certifi wheel filename')
    members = {}
    folded = set()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        total = 0
        for entry in archive.infolist():
            parts = entry.filename.split('/')
            mode = entry.external_attr >> 16
            if (len(parts) < 2 or parts[0] not in {'certifi', dist} or
                    any(not p or p in {'.', '..'} or ':' in p or '\\' in p or
                        p.endswith((' ', '.')) for p in parts) or
                    entry.filename.casefold() in folded or entry.flag_bits & 1 or
                    stat.S_IFMT(mode) not in {0, stat.S_IFREG}):
                raise ValueError('Unsafe or duplicate Python archive member')
            folded.add(entry.filename.casefold())
            total += entry.file_size
            if total > MAX_SOURCE_BYTES or len(folded) > 1000:
                raise ValueError('Python archive exceeds size limit')
            members[entry.filename] = archive.read(entry)
    required = {f'{dist}/METADATA', f'{dist}/WHEEL', f'{dist}/RECORD',
                'certifi/__init__.py', 'certifi/core.py', 'certifi/cacert.pem'}
    if not required <= members.keys():
        raise ValueError('Missing certifi archive metadata or sources')
    metadata = BytesParser().parsebytes(members[f'{dist}/METADATA'])
    if metadata.get_all('Name') != ['certifi'] or metadata.get_all('Version') != [version]:
        raise ValueError('Python archive metadata identity mismatch')
    record_name = f'{dist}/RECORD'
    rows = list(csv.reader(io.StringIO(members[record_name].decode('utf-8'))))
    records = {}
    for row in rows:
        if len(row) != 3 or row[0] in records or row[0] not in members:
            raise ValueError('Invalid Python archive RECORD')
        records[row[0]] = row[1:]
    if records.keys() != members.keys() or records[record_name] != ['', '']:
        raise ValueError('Incomplete Python archive RECORD')
    files = []
    for name, content in sorted(members.items()):
        if name == record_name:
            continue  # Wheel RECORD cannot hash itself; outer pin binds it.
        expected = 'sha256=' + base64.urlsafe_b64encode(hashlib.sha256(content).digest()).decode().rstrip('=')
        if records[name] != [expected, str(len(content))]:
            raise ValueError('Python archive RECORD hash or size mismatch')
        target = root.joinpath(*name.split('/'))
        if (any(p.is_symlink() or p.is_junction() for p in (target, *target.parents)) or
                not target.is_file() or target.stat().st_size != len(content) or
                sha256(target.read_bytes()) != sha256(content)):
            raise ValueError('Installed Python file missing, linked or changed')
        files.append(dict(path=name, sha256=sha256(content), sizeBytes=len(content)))
    return data, dict(archive=filename, sha256=sha256(data), sizeBytes=len(data),
                      comparedFileCount=len(files), files=files,
                      evidenceKind='locally-pinned-wheel',
                      upstreamAuthenticated=False,
                      remainingPythonReview=['Upstream authentication and corresponding sdist/revision',
                                             'Certificate-store generation inputs',
                                             'Historical frozen payload mapping',
                                             'Recipient source delivery'])
