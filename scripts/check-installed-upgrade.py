"""Compare complete synthetic records across a version-only installed upgrade.

Only local profile/jobs API routes; no health, provider, vault, model or pages.
The desktop must be closed. Reports remain in a dedicated ignored directory.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
from contextlib import closing

from windows_owned_process import WindowsProcesses

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / '.local/installed-acceptance'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def read(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))


def save(file, value):
    with file.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['seed', 'records'])
    parser.add_argument('--report-dir', type=Path, required=True)
    args = parser.parse_args()
    state = read(DIRECTORY / 'installation.json')
    require(state['identity'] == 'app.jobscout.installedacceptance' and not state.get('upgrade_pending'),
            'Not a completed synthetic installation')
    build_directory = ROOT / '.local/installed-acceptance-upgrade' if state.get('upgraded') else DIRECTORY
    build = read(build_directory / 'build.json')
    require(build['mode'] == 'production-engine' and build['identifier'] == state['identity'], 'Unexpected engine identity')
    destination = Path(state['destination']).resolve(strict=True)
    require(destination.parent == DIRECTORY.resolve() and destination.name.startswith('installed-'), 'Unowned destination')
    engine = destination / 'jobscout-engine.exe'
    require(hashlib.sha256(engine.read_bytes()).hexdigest() == build['engine_sha256'], 'Engine changed')
    require(not any(name.casefold() in ('jobscout-desktop.exe', 'jobscout-engine.exe')
                    for _, _, name in WindowsProcesses().rows()), 'Close JobScout before API-only checks')
    data = Path(os.environ['APPDATA']) / state['identity']
    require(str(data) in state['data_paths'] and not data.is_symlink() and not data.is_junction(), 'Unexpected test storage')
    reports = args.report_dir.resolve()
    require(reports.parent == (ROOT / 'work/ci').resolve(), 'Use a dedicated work/ci report directory')
    reports.mkdir(parents=True, exist_ok=True)
    expected = reports / 'expected-records.json'
    if args.action == 'seed':
        require(not state.get('upgraded') and not expected.exists(), 'Seed only once before upgrade')
    else:
        require(state.get('upgraded') and expected.is_file(), 'Compare only after upgrade against retained records')
    spec = importlib.util.spec_from_file_location('packaged_crash', ROOT / 'scripts/check-packaged-crash.py')
    crash = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crash)
    with crash.FrozenEngine(engine, data, WindowsProcesses()) as running:
        if args.action == 'seed':
            require(running.client.get('/api/v1/jobs').json()['jobs'] == [], 'Test jobs must start empty')
            records = crash.seed(running.client)
            save(expected, records)
        else:
            records = [running.client.get('/api/v1/profile').json(), running.client.get('/api/v1/jobs').json()]
            require(records == read(expected), 'Complete profile/job/stage/note responses changed')
    with closing(sqlite3.connect((data / 'jobscout.db').as_uri() + '?mode=ro', uri=True)) as db:
        require(db.execute('PRAGMA integrity_check').fetchone() == ('ok',), 'SQLite integrity failed')
        schema_version = db.execute('PRAGMA user_version').fetchone()[0]
    report = {'action': args.action, 'version': build['version'], 'engine_sha256': build['engine_sha256'],
              'installer_sha256': build['installer_sha256'], 'sqlite_integrity': 'ok', 'schema_version': schema_version,
              'complete_records_sha256': hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest(),
              'scope': 'Synthetic API seed/complete readback; not UI creation, historical migration or live-provider acceptance.'}
    save(reports / f'{args.action}.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
