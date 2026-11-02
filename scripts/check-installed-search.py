"""Finite installed synthetic-search evidence. No live provider mode.

Run seed/records only with the installed desktop closed; active/closed bracket
one explicit UI search and normal or forced desktop closure. Reports are ignored.
"""
import argparse
import errno
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import shutil
import sqlite3
import subprocess
import time

from windows_owned_process import WindowsProcesses

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / '.local/installed-acceptance'
REPORTS = ROOT / 'work/ci/installed-search-2026-11-02'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def read(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))


def save(file, value):
    with file.open('x', encoding='utf-8') as output:
        json.dump(value, output, indent=2)
        output.write('\n')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def helper(action):
    # Prefer the same PowerShell 7 host used by development checks. Windows
    # PowerShell may have a different script execution policy; do not change it.
    shell = shutil.which('pwsh') or shutil.which('powershell')
    require(shell, 'PowerShell is required for the existing installation guards')
    result = subprocess.run([shell, '-NoProfile', '-File',
        str(ROOT / 'scripts/check-installed-acceptance.ps1'), '-Action', action],
        capture_output=True, text=True, timeout=45,
        creationflags=subprocess.CREATE_NO_WINDOW)
    require(result.returncode == 0, f'Installed guard failed ({action}); retain installation for inspection')
    return json.loads(result.stdout)


def bound_snapshot(journal):
    snapshot = helper('Snapshot')
    owned = read(DIRECTORY / 'installation.json')['owned']
    require(journal['pid'] in [p['id'] for p in owned if p['name'] == 'jobscout-engine'], 'Journal is not the snapshot-owned installed engine')
    require(snapshot['engine_processes'] == 2 and snapshot['webview_processes'] > 0, 'Missing installed engine/WebView tree')
    return snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['seed', 'active', 'closing', 'closed', 'records', 'idle'])
    parser.add_argument('--case', choices=['normal', 'forced'])
    parser.add_argument('--report-dir', type=Path, default=REPORTS)
    args = parser.parse_args()
    require((args.case is not None) == (args.action in ('active', 'closing', 'closed')), 'Case required only for active/closing/closed')
    build = read(DIRECTORY / 'build.json')
    state = read(DIRECTORY / 'installation.json')
    require(build.get('mode') == 'synthetic-search' and state['identity'] == 'app.jobscout.installedacceptance', 'Not the synthetic installed identity')
    destination = Path(state['destination']).resolve()
    require(destination.is_relative_to(DIRECTORY.resolve()) and destination.name.startswith('installed-'), 'Invalid installed destination')
    engine = destination / 'jobscout-engine.exe'
    require(hashlib.sha256(engine.read_bytes()).hexdigest() == build['engine_sha256'], 'Installed synthetic engine changed')
    data = Path(os.environ['APPDATA']) / state['identity']
    require(str(data) in state['data_paths'], 'Unexpected synthetic data directory')
    reports = args.report_dir.resolve()
    require(reports.is_relative_to((ROOT / 'work/ci').resolve()) and reports != (ROOT / 'work/ci').resolve(), 'Reports must be in a dedicated ignored work/ci directory')
    reports.mkdir(parents=True, exist_ok=True)
    expected = reports / 'expected-records.json'
    binding = {'engine_sha256': build['engine_sha256'], 'installer_sha256': build['installer_sha256'],
               'desktop_build_sha256': build['desktop_sha256'], 'wrapper_sha256': build['wrapper_sha256']}

    if args.action in ('seed', 'records'):
        # Existing hash/path/ownership helper, using only the installed synthetic
        # engine. Complete production API responses are compared, not row counts.
        require(not any(name.casefold() in ('jobscout-desktop.exe', 'jobscout-engine.exe')
                        for _, _, name in WindowsProcesses().rows()), 'Close existing JobScout processes before API-only launches')
        if state['owned']:
            helper('Closed')
        spec = importlib.util.spec_from_file_location('packaged_crash', ROOT / 'scripts/check-packaged-crash.py')
        crash = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(crash)
        if args.action == 'seed':
            require(not (data / 'jobscout.db').exists() and not expected.exists(), 'Seed requires fresh synthetic storage')
        previous = set(data.glob('search-lifecycle-*.json'))
        with crash.FrozenEngine(engine, data, WindowsProcesses()) as running:
            if args.action == 'seed':
                records = crash.seed(running.client)
                save(expected, records)
            else:
                records = [running.client.get('/api/v1/profile').json(), running.client.get('/api/v1/jobs').json()]
                require(records == read(expected), 'Complete saved records changed')
        with sqlite3.connect((data / 'jobscout.db').as_uri() + '?mode=ro', uri=True) as db:
            require(db.execute('PRAGMA integrity_check').fetchone() == ('ok',), 'Database integrity failed')
        report = {**binding, 'action': args.action, 'complete_records_sha256': digest(records), 'sqlite_integrity': 'ok'}
        # Every launch, including these API-only ones, must remain search-free.
        journals = [read(p) for p in set(data.glob('search-lifecycle-*.json')) - previous]
        require(len(journals) == 1 and journals[0]['attempted'] == 0 and journals[0]['violations'] == 0 and journals[0]['server_finished'], 'API-only launch searched or failed to finish')
        save(reports / f'{args.action}-{time.time_ns()}.json', report)
        print(json.dumps(report))
        return

    if args.action == 'idle':
        journals = [read(p) for p in data.glob('search-lifecycle-*.json')]
        live = [j for j in journals if not j['server_finished']]
        require(len(live) == 1 and live[0]['attempted'] == 0 and live[0]['active'] == 0 and live[0]['violations'] == 0, 'Restart dispatched automatically or has ambiguous journals')
        report = {**binding, 'journal': live[0], 'snapshot': bound_snapshot(live[0]), 'automatic_search_dispatches': 0}
        save(reports / f'idle-{time.time_ns()}.json', report)
        print(json.dumps(report))
        return

    evidence = reports / f'{args.case}-active.json'
    if args.action == 'active':
        require(not evidence.exists(), 'Retain existing case evidence; do not overwrite')
        journals = [(p, read(p)) for p in data.glob('search-lifecycle-*.json')]
        active = [(p, j) for p, j in journals if j['active'] == 1 and not j['server_finished']]
        require(len(active) == 1, 'Expected exactly one actively waiting synthetic transport')
        file, journal = active[0]
        require(journal['attempted'] == 2 and journal['completed'] == 1 and journal['cancelled'] == 0 and journal['violations'] == 0, 'Expected first complete, second waiting, no other dispatch')
        snapshot = bound_snapshot(journal)
        report = {**binding, 'journal_file': file.name, 'before_close': journal, 'snapshot': snapshot}
        save(evidence, report)
    elif args.action == 'closing':
        report = read(evidence)
        require(all(report[key] == value for key, value in binding.items()), 'Case build changed')
        file = data / report['journal_file']
        require(file.parent == data and file.name.startswith('search-lifecycle-'), 'Invalid case journal')
        journal = read(file)
        require(journal['session_id'] == report['before_close']['session_id'] and journal['active'] == 1
                and journal['attempted'] == 2 and journal['completed'] == 1
                and journal['cancelled'] == 0 and journal['violations'] == 0
                and not journal['shutdown_started'] and not journal['server_finished'],
                'Transport is no longer active immediately before closure; timeout cannot pass')
        report = {**binding, 'immediately_before_close': journal, 'marked_at_unix_ns': time.time_ns()}
        save(reports / f'{args.case}-closing.json', report)
    else:
        report = read(evidence)
        closing = read(reports / f'{args.case}-closing.json')
        require(all(closing[key] == value for key, value in binding.items()), 'Closure mark build changed')
        require(closing['immediately_before_close']['session_id'] == report['before_close']['session_id'], 'Closure mark belongs to another launch')
        require(all(report[key] == value for key, value in binding.items()), 'Case build changed')
        file = data / report['journal_file']
        require(file.parent == data and file.name.startswith('search-lifecycle-'), 'Invalid case journal')
        deadline = time.monotonic() + 12
        while True:
            journal = read(file)
            if journal['server_finished']:
                break
            require(time.monotonic() < deadline, 'Synthetic server failed to finish')
            time.sleep(.05)
        require(journal['attempted'] == 2 and journal['completed'] == 1 and journal['cancelled'] == 1 and journal['active'] == 0 and journal['violations'] == 0 and journal['shutdown_started'], 'Search did not cancel cleanly without further dispatch')
        require(journal['events'].index('shutdown_started') < journal['events'].index('request_cancelled'), 'Cancellation preceded shutdown; timeout or disconnect alone cannot pass this check')
        with socket.socket() as probe:
            # Windows may take about two seconds to return WSAECONNREFUSED for
            # loopback. A shorter timeout yields WSAEWOULDBLOCK, not a refusal.
            probe.settimeout(4)
            require(probe.connect_ex(('127.0.0.1', journal['port'])) in (errno.ECONNREFUSED, 10061), 'Listener did not explicitly refuse the loopback connection')
        report.update(after_close=journal, cleanup=helper('Closed'), listener_closed=True,
                      immediately_before_close=closing['immediately_before_close'])
        save(reports / f'{args.case}-closed.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
