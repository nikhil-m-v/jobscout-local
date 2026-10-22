"""Windows frozen-sidecar smoke checks using fresh synthetic storage only.

No health/model, provider, credential, result-page or download routes are used.
This does not launch the desktop or establish installed/WebView acceptance.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import queue
import socket
import subprocess
import sys
import tempfile
import threading
import time
import zipfile

import httpx


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def synthetic_docx():
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types/>')
        archive.writestr('word/document.xml',
                         '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                         '<w:body><w:p><w:r><w:t>SYNTHETIC UNSAVED IMPORT</w:t></w:r></w:p></w:body></w:document>')
    return output.getvalue()


def run_case(engine, directory, abrupt):
    token = 'synthetic-packaged-lifecycle-token-32-characters'
    environment = {**os.environ, 'JOBSCOUT_SESSION_TOKEN': token}
    owner = subprocess.Popen([sys.executable, '-c', 'import sys; sys.stdin.buffer.read()'],
                             stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    process = None
    upload = None
    try:
        process = subprocess.Popen([str(engine), '--data-dir', str(directory), '--owner-pid', str(owner.pid)],
                                   env=environment, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
        binding = json.loads(lines.get(timeout=45))
        require(binding.get('event') == 'bound', 'Missing frozen-engine handshake')
        port = binding['port']
        with httpx.Client(base_url=f'http://127.0.0.1:{port}', trust_env=False, timeout=15,
                          headers={'Authorization': f'Bearer {token}'}) as client:
            deadline = time.monotonic() + 20
            while True:
                try:
                    profile = client.get('/api/v1/profile')
                    if profile.status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                require(process.poll() is None and time.monotonic() < deadline, 'Engine did not become ready')
                time.sleep(.05)
            if profile.json()['profile'] is None:
                saved = client.put('/api/v1/profile', json={'text': 'SYNTHETIC SAVED PROFILE', 'reviewed': True})
                require(saved.status_code == 200, 'Synthetic save failed')
            else:
                require(profile.json()['profile']['text'] == 'SYNTHETIC SAVED PROFILE', 'Saved profile changed after restart')

            # Exercise the actual frozen parser before the interrupted upload.
            reservation = client.post('/api/v1/imports')
            require(reservation.status_code == 200, 'Import reservation failed')
            task_id = reservation.json()['id']
            parsed = client.put(f'/api/v1/imports/{task_id}/docx', content=synthetic_docx(),
                                headers={'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
            require(parsed.status_code == 200 and parsed.json()['text'] == 'SYNTHETIC UNSAVED IMPORT',
                    'Frozen parser failed')

            # Hold the upload open with an incomplete body. Without cancellation
            # before HTTP draining this exceeds the server's 3-second drain limit.
            reservation = client.post('/api/v1/imports')
            require(reservation.status_code == 200, 'Interrupted import reservation failed')
            task_id = reservation.json()['id']
            upload = socket.create_connection(('127.0.0.1', port), timeout=5)
            upload.sendall((f'PUT /api/v1/imports/{task_id}/pdf HTTP/1.1\r\n'
                            f'Host: 127.0.0.1:{port}\r\nAuthorization: Bearer {token}\r\n'
                            'Content-Type: application/pdf\r\nContent-Length: 4096\r\n\r\nSYNTHETIC').encode('ascii'))
            # A competing reservation must remain busy. The cancellation response
            # below additionally proves the upload was accepted before shutdown.
            busy = client.post('/api/v1/imports')
            require(busy.status_code == 409 and busy.json() == {'error': 'busy'}, 'Import was not active')
            # Give the server a turn to begin reading the body, then stop its owner.
            time.sleep(.1)
            started = time.monotonic()
            if abrupt:
                owner.terminate()
            else:
                owner.stdin.close()
            owner.wait(timeout=5)
            upload.settimeout(8)
            reply = b''
            while b'cancelled' not in reply:
                part = upload.recv(4096)
                require(part, 'Interrupted import did not return cancellation')
                reply += part
                require(len(reply) < 8192, 'Unexpected shutdown response size')
            require(b'422 Unprocessable Entity' in reply and b'"error":"cancelled"' in reply,
                    'Import did not cancel before HTTP draining')
            upload.close()
            upload = None
            require(process.wait(timeout=10) == 0, 'Frozen engine did not exit cleanly')
            elapsed = round(time.monotonic() - started, 3)
        with socket.socket() as probe:
            probe.settimeout(1)
            require(probe.connect_ex(('127.0.0.1', port)) != 0, 'Engine listener survived owner exit')
        return {'owner_exit': 'forced' if abrupt else 'normal', 'passed': True,
                'frozen_parser': True, 'active_upload_cancelled': True, 'listener_closed': True,
                'shutdown_seconds': elapsed}
    finally:
        if upload is not None:
            upload.close()
        if owner.poll() is None:
            owner.terminate()
        owner.wait(timeout=5)
        if owner.stdin and not owner.stdin.closed:
            owner.stdin.close()
        if process is not None:
            try:
                process.wait(timeout=12)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
            process.stdout.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    require(os.name == 'nt', 'This check requires Windows ownership handles')
    engine = args.engine.resolve(strict=True)
    report = {'schema_version': 1, 'passed': False, 'scope': 'synthetic-frozen-sidecar',
              'engine_sha256': hashlib.sha256(engine.read_bytes()).hexdigest(), 'cases': [],
              'installed_desktop_verified': False}
    try:
        # A unique temporary directory can never select existing personal storage.
        with tempfile.TemporaryDirectory(prefix='jobscout-lifecycle-') as temporary:
            directory = Path(temporary) / 'data'
            report['cases'].append(run_case(engine, directory, abrupt=False))
            report['cases'].append(run_case(engine, directory, abrupt=True))
            # Read-only SQLite verification avoids starting a model-health route.
            import sqlite3
            from contextlib import closing
            with closing(sqlite3.connect((directory / 'jobscout.db').as_uri() + '?mode=ro', uri=True)) as database:
                require(database.execute('PRAGMA integrity_check').fetchone() == ('ok',), 'Database integrity failed')
                require(database.execute('SELECT text FROM profile').fetchall() == [('SYNTHETIC SAVED PROFILE',)],
                        'Unsaved import replaced the saved profile')
            report['restart_saved_profile_verified'] = True
            report['database_integrity_verified'] = True
        report['passed'] = True
    except Exception as error:
        # Fixed class only: no paths, request data, environment or log content.
        report['failure_type'] = type(error).__name__
        raise
    finally:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
