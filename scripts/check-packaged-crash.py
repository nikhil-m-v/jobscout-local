"""Windows frozen-engine crash/recovery check using fresh synthetic storage.

No desktop, health/model, provider, credential, result-page or download routes.
Kills only a retained-handle child of the engine launcher spawned by this check.
This does not establish installed desktop/WebView or power-loss acceptance.
"""
import argparse
from contextlib import closing
import hashlib
import io
import json
import os
from pathlib import Path
import queue
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import zipfile

import httpx
from windows_owned_process import WindowsProcesses


TOKEN = 'synthetic-packaged-crash-token-32-characters'
SAVED_TEXT = 'SYNTHETIC SAVED CRASH RECOVERY PROFILE'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def wait_until(predicate, timeout, message):
    deadline = time.monotonic() + timeout
    while not predicate():
        require(time.monotonic() < deadline, message)
        time.sleep(.01)


def synthetic_docx(large=False):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types/>')
        paragraph = '<w:p><w:r><w:t>SYNTHETIC UNSAVED IMPORT</w:t></w:r></w:p>'
        # Under the parser's 4 MiB XML ceiling. Repetition also ensures that a
        # real parser subprocess remains observable without a test-only worker.
        archive.writestr('word/document.xml',
                         '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                         '<w:body>' + paragraph * (50000 if large else 1) + '</w:body></w:document>')
    return output.getvalue()


class FrozenEngine:
    def __init__(self, engine, directory, processes):
        self.engine, self.directory, self.processes = engine, directory, processes
        self.owner = self.process = self.launcher = self.application = self.client = None
        self.owned = []

    def __enter__(self):
        try:
            self.owner = subprocess.Popen([sys.executable, '-c', 'import sys; sys.stdin.buffer.read()'],
                stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW)
            self.process = subprocess.Popen([str(self.engine), '--data-dir', str(self.directory),
                '--owner-pid', str(self.owner.pid)], env={**os.environ, 'JOBSCOUT_SESSION_TOKEN': TOKEN},
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
            self.launcher = self.processes.capture(self.process.pid, self.engine)
            self.owned.append(self.launcher)
            lines = queue.Queue()
            threading.Thread(target=lambda: lines.put(self.process.stdout.readline()), daemon=True).start()
            binding = json.loads(lines.get(timeout=45))
            require(binding.get('event') == 'bound', 'Missing frozen-engine handshake')
            self.port = binding['port']
            require(type(self.port) is int and 0 < self.port < 65536, 'Invalid engine port')
            self.client = httpx.Client(base_url=f'http://127.0.0.1:{self.port}', trust_env=False, timeout=15,
                                      headers={'Authorization': f'Bearer {TOKEN}'})
            def ready():
                require(self.process.poll() is None, 'Frozen engine exited during startup')
                try:
                    return self.client.get('/api/v1/profile').status_code == 200
                except httpx.TransportError:
                    return False
            wait_until(ready, 20, 'Frozen engine did not become ready')
            children = self.processes.children(self.launcher, self.engine)
            self.owned.extend(children)
            require(len(children) == 1, 'Expected one frozen application child')
            self.application = children[0]
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *_):
        if self.client is not None:
            self.client.close()
        if self.owner is not None:
            if self.owner.stdin and not self.owner.stdin.closed:
                self.owner.stdin.close()
            if self.owner.poll() is None:
                self.owner.terminate()
            self.owner.wait(timeout=5)
        if self.process is not None:
            try:
                self.process.wait(timeout=12)
            except subprocess.TimeoutExpired:
                # Only retained handles captured from our owned process tree.
                for member in reversed(self.owned):
                    member.terminate()
                self.process.wait(timeout=5)
            self.process.stdout.close()
        for member in reversed(self.owned):
            # Failure cleanup may terminate an owned orphan, but cannot turn
            # that failure into a passing child-exit observation.
            member.terminate()
            member.close()


def seed(client):
    require(client.get('/api/v1/profile').json()['profile'] is None, 'Synthetic workspace was not empty')
    saved = client.put('/api/v1/profile', json={'text': SAVED_TEXT, 'reviewed': True})
    require(saved.status_code == 200, 'Synthetic profile save failed')
    candidate = {'title': 'SYNTHETIC CRASH RECOVERY JOB', 'url': 'https://example.com/synthetic-job',
                 'snippet': 'SYNTHETIC SAVED SNAPSHOT', 'source_index': 0, 'provider': 'tavily',
                 'retrieved_at': '2026-11-01T00:00:00+00:00'}
    saved = client.put('/api/v1/jobs', json={'candidate': candidate, 'confirmed': True})
    require(saved.status_code == 200, 'Synthetic job save failed')
    job = saved.json()['job']
    updated = client.patch(f"/api/v1/jobs/{job['id']}", json={'stage': 'interview',
        'notes': 'SYNTHETIC PRIVATE TRACKING NOTE', 'revision': job['revision'], 'confirmed': True})
    require(updated.status_code == 200, 'Synthetic tracking save failed')
    return client.get('/api/v1/profile').json(), client.get('/api/v1/jobs').json()


def crash_case(engine, directory, processes):
    with FrozenEngine(engine, directory, processes) as running:
        records = seed(running.client)
        task = running.client.post('/api/v1/imports')
        require(task.status_code == 200, 'Crash import reservation failed')
        task_id = task.json()['id']
        outcome = queue.Queue()
        def upload():
            try:
                with httpx.Client(trust_env=False, timeout=20) as client:
                    outcome.put(client.put(f'http://127.0.0.1:{running.port}/api/v1/imports/{task_id}/docx',
                        content=synthetic_docx(large=True), headers={'Authorization': f'Bearer {TOKEN}',
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}))
            except httpx.TransportError:
                outcome.put('connection_lost')
        thread = threading.Thread(target=upload, daemon=True)
        thread.start()
        def capture_worker():
            require(outcome.empty(), 'Import completed before the crash could be observed')
            children = processes.children(running.application, engine)
            running.owned.extend(children)
            require(len(children) <= 1, 'Unexpected parser process tree')
            return bool(children)
        wait_until(capture_worker, 10, 'Real frozen parser child was not observed')
        parser = running.owned[-1]
        require(parser.alive() and running.application.alive(), 'Parser was not live at crash')
        started = time.monotonic()
        running.application.terminate()
        wait_until(lambda: not parser.alive(), 8, 'Parser survived engine termination')
        require(running.process.wait(timeout=10) != 0, 'Forced engine loss did not report failure')
        thread.join(timeout=5)
        require(not thread.is_alive() and outcome.get_nowait() == 'connection_lost',
                'In-flight import did not report lost connection')
        with socket.socket() as probe:
            probe.settimeout(1)
            require(probe.connect_ex(('127.0.0.1', running.port)) != 0, 'Engine listener survived crash')
        elapsed = round(time.monotonic() - started, 3)
    with FrozenEngine(engine, directory, processes) as restarted:
        require((restarted.client.get('/api/v1/profile').json(), restarted.client.get('/api/v1/jobs').json()) == records,
                'Saved profile/job/tracking changed after engine loss')
        task = restarted.client.post('/api/v1/imports')
        require(task.status_code == 200, 'Transient import did not reset after restart')
        parsed = restarted.client.put(f"/api/v1/imports/{task.json()['id']}/docx", content=synthetic_docx(),
            headers={'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
        require(parsed.status_code == 200 and parsed.json()['text'] == 'SYNTHETIC UNSAVED IMPORT',
                'Frozen import did not recover after restart')
    with closing(sqlite3.connect((directory / 'jobscout.db').as_uri() + '?mode=ro', uri=True)) as database:
        require(database.execute('PRAGMA integrity_check').fetchone() == ('ok',), 'Crash recovery integrity failed')
    return {'passed': True, 'engine_application_forcibly_terminated': True, 'active_parser_observed': True,
            'parser_exited_itself': True, 'listener_closed': True, 'inflight_import_connection_lost': True,
            'saved_profile_job_tracking_unchanged': True, 'restart_import_verified': True,
            'database_integrity_verified': True, 'cleanup_seconds': elapsed}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    require(os.name == 'nt', 'This check requires Windows process handles')
    engine = args.engine.resolve(strict=True)
    report = {'schema_version': 1, 'passed': False, 'scope': 'synthetic-frozen-engine-crash',
              'engine_sha256': hashlib.sha256(engine.read_bytes()).hexdigest(), 'cases': [],
              'installed_desktop_verified': False, 'health_model_provider_credential_routes_called': False}
    try:
        with tempfile.TemporaryDirectory(prefix='jobscout-crash-') as temporary:
            report['cases'].append(crash_case(engine, Path(temporary) / 'data', WindowsProcesses()))
        require(hashlib.sha256(engine.read_bytes()).hexdigest() == report['engine_sha256'],
                'Engine changed during crash verification')
        report['passed'] = True
    except Exception as error:
        report['failure_type'] = type(error).__name__
        raise
    finally:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
