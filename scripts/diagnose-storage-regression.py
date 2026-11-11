"""Bounded offline diagnostic for JobScout 64afe1b; Python stdlib supervisor.

Use --source for an extracted tracked snapshot and --python for its existing
test interpreter. Never point --source at a personal-data directory.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


PROFILES = {
    'runtime': [],
    'preflight': ['apps/engine/tests/test_embedding_preflight.py'],
    'review': ['apps/engine/tests/test_embedding_preflight.py',
               'apps/engine/tests/test_embedding_review.py'],
    'storage': ['apps/engine/tests/test_setup_storage.py'],
    'combined': ['apps/engine/tests/test_embedding_preflight.py',
                 'apps/engine/tests/test_setup_storage.py'],
    'acceptance': ['apps/engine/tests/test_acceptance_preview.py'],
    'adjacent': ['apps/engine/tests/test_setup_storage.py',
                 'apps/engine/tests/test_setup_check.py',
                 'apps/engine/tests/test_storage.py'],
}


def child(args):
    import faulthandler
    import socket
    import threading
    faulthandler.enable()
    faulthandler.dump_traceback_later(5, repeat=False)
    # Windows asyncio creates a private socketpair internally. Permit only that
    # operation; every other real connect, bind and DNS request fails closed.
    scope = threading.local()
    original_pair = socket.socketpair
    def private_pair(*values, **kwargs):
        scope.socketpair = True
        try:
            return original_pair(*values, **kwargs)
        finally:
            scope.socketpair = False
    socket.socketpair = private_pair
    def audit(event, values):
        if event in ('socket.connect', 'socket.bind', 'socket.getaddrinfo'):
            if not getattr(scope, 'socketpair', False):
                raise AssertionError('Diagnostic forbids network access: ' + event)
        if event in ('subprocess.Popen', 'os.system'):
            raise AssertionError('Diagnostic forbids child process launch')
    sys.addaudithook(audit)
    if args.profile == 'runtime':
        print('STAGE socketpair begin', flush=True)
        try:
            left, right = socket.socketpair()
            try:
                left.settimeout(1)
                right.settimeout(1)
                left.sendall(b'synthetic wakeup')
                assert right.recv(64) == b'synthetic wakeup'
            finally:
                left.close()
                right.close()
            print('STAGE socketpair end: PASS', flush=True)
            return 0
        finally:
            faulthandler.cancel_dump_traceback_later()
    source = args.source.resolve()
    sys.path.insert(0, str(source / 'apps/engine/src'))
    import jobscout_engine.app as module
    import jobscout_engine.adapters.secrets as vault
    def forbidden(*values, **kwargs):
        raise AssertionError('Diagnostic forbids real credential/model/provider access')
    for name in ('contains', 'read', 'save', 'delete'):
        setattr(vault.WindowsSecretStore, name, forbidden)
    # HTTPX MockTransport and TestClient remain available; real transports do not.
    import httpx
    httpx.HTTPTransport.handle_request = forbidden
    httpx.AsyncHTTPTransport.handle_async_request = forbidden
    def trace(cls, method):
        original = getattr(cls, method)
        def wrapped(*values, **kwargs):
            print('STAGE ' + cls.__name__ + '.' + method + ' begin', flush=True)
            result = original(*values, **kwargs)
            print('STAGE ' + cls.__name__ + '.' + method + ' end', flush=True)
            return result
        setattr(cls, method, wrapped)
    trace(module.WorkspaceLease, 'acquire')
    trace(module.WorkspaceLocation, 'load')
    trace(module.Database, 'initialize')
    original_inspect = module.inspect_storage
    def traced_inspect(*values, **kwargs):
        print('STAGE inspect_storage begin', flush=True)
        result = original_inspect(*values, **kwargs)
        print('STAGE inspect_storage end', flush=True)
        return result
    module.inspect_storage = traced_inspect
    if args.selector:
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    import importlib.metadata as metadata
    print(json.dumps({'python': sys.version, 'source': str(source),
                      'packages': {p: metadata.version(p) for p in
                                   ('pytest', 'anyio', 'starlette', 'httpx', 'fastapi')},
                      'selector': args.selector}), flush=True)
    import pytest
    class Progress:
        def pytest_runtest_logstart(self, nodeid, location):
            print('TEST ' + nodeid, flush=True)
    try:
        return pytest.main([*PROFILES[args.profile], '-vv', '-s',
                            '-p', 'no:cacheprovider', '-o', 'faulthandler_timeout=0',
                            '--basetemp=' + str(args.run / 'pytest-temp')], plugins=[Progress()])
    finally:
        faulthandler.cancel_dump_traceback_later()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--python', default=sys.executable)
    parser.add_argument('--profile', choices=PROFILES, default='combined')
    parser.add_argument('--output', type=Path, default=Path('storage-diagnostics'))
    parser.add_argument('--seconds', type=int, default=15)
    parser.add_argument('--selector', action='store_true')
    parser.add_argument('--child', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--run', type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.child:
        return child(args)
    if not 8 <= args.seconds <= 60:
        parser.error('--seconds must be between 8 and 60')
    args.source = args.source.resolve(strict=True)
    if not (args.source / 'apps/engine/tests/test_setup_storage.py').is_file():
        parser.error('Expected a JobScout source snapshot')
    args.output.mkdir(parents=True, exist_ok=True)
    import tempfile
    run = Path(tempfile.mkdtemp(prefix=args.profile + '-', dir=args.output.resolve()))
    # Allowlist avoids inheriting provider keys, app tokens, proxies and profiles.
    env = {k: v for k, v in os.environ.items()
           if k.upper() in {'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH',
                            'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS'}}
    for name in ('TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE'):
        target = run / name.lower()
        target.mkdir()
        env[name] = str(target)
    env.update(PYTEST_DISABLE_PLUGIN_AUTOLOAD='1', PYTHONUNBUFFERED='1',
               PYTHONDONTWRITEBYTECODE='1')
    command = [args.python, str(Path(__file__).resolve()), '--child',
               '--source', str(args.source), '--profile', args.profile, '--run', str(run)]
    if args.selector:
        command.append('--selector')
    started = time.monotonic()
    with (run / 'run.log').open('w', encoding='utf-8') as log:
        process = subprocess.Popen(command, cwd=args.source, env=env,
                                   stdin=subprocess.DEVNULL, stdout=log, stderr=log)
        timed_out = False
        try:
            code = process.wait(timeout=args.seconds)
        except subprocess.TimeoutExpired:
            timed_out = True
            # Retained Popen handle identifies only our child. Child spawning is
            # forbidden above, so no broad process-name cleanup is needed.
            process.kill()
            code = process.wait(timeout=5)
    receipt = {'profile': args.profile, 'selector': args.selector,
               'deadline_seconds': args.seconds, 'timed_out': timed_out,
               'returncode': code, 'elapsed_seconds': round(time.monotonic() - started, 3),
               'log': str(run / 'run.log')}
    (run / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt))
    return 124 if timed_out else code


if __name__ == '__main__':
    sys.exit(main())
