"""Acceptance-only installed sidecar. Every provider/model/secret is synthetic.

This entry point is frozen separately; it is never selected by the production
engine. The real application, adapter, HTTP server and owner watcher are used.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
import socket
import stat
from uuid import uuid4

import httpx
import uvicorn

from jobscout_engine.adapters.secrets import SecretStoreUnavailable
from jobscout_engine.adapters.tavily import TavilyConnection
from jobscout_engine.adapters.tavily_search import SEARCH_ENDPOINT, TavilySearch
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.domain.contracts import ModelStatus
from jobscout_engine.domain.search import reject_duplicate_keys
from jobscout_engine.domain.search_plan import construct_search_plan
from jobscout_engine.server import EngineServer
from jobscout_engine.workspace_location import CONFIG, MAX_CONFIG, OWNER, REQUIRED, LocationFailure, plain_path

KEY = 'tvly-SYNTHETIC-INSTALLED-CLOSURE-NOT-A-REAL-KEY'
CRITERIA = {'role': 'software-engineer', 'region': 'india', 'seniority': 'any',
            'arrangement': 'remote', 'skills': []}
IDENTITY = 'app.jobscout.installedacceptance'


def validate_data_directory(value):
    """Only the existing harness's exact roaming identity, never a relocation."""
    base = os.environ.get('APPDATA')
    if not base:
        raise ValueError('Acceptance roaming identity is unavailable')
    path = Path(value)
    expected = Path(base) / IDENTITY
    if (not path.is_absolute() or '..' in path.parts or
            os.path.normcase(str(path)) != os.path.normcase(str(expected))):
        raise ValueError('Only the dedicated acceptance identity is allowed')
    # Check lexical ancestors before resolve(), which could hide a junction.
    for member in [*reversed(path.parents), path]:
        if member.exists() or member.is_symlink():
            info = member.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise ValueError('Acceptance identity must not contain reparse points')
    # Windows app-data projection may map the same lexical roaming identity to
    # a package LocalCache path without a reparse point. Compare both resolved
    # identities; exact lexical equality and ancestor checks still apply above.
    if path.resolve() != expected.resolve():
        raise ValueError('Acceptance identity must not be redirected')
    config, marker, owner = path / CONFIG, path / REQUIRED, path / OWNER
    if owner.exists() or owner.is_symlink():
        raise ValueError('Relocated acceptance storage is outside this finite check')
    has_config = config.exists() or config.is_symlink()
    has_marker = marker.exists() or marker.is_symlink()
    if not has_config and has_marker:
        raise ValueError('Acceptance routing marker has no configuration')
    try:
        if has_marker:
            plain_path(marker, directory=False)
        if has_config:
            # Production creates a self-pointer even before any folder change.
            # Permit only that exact state; never follow a configured destination.
            plain_path(config, directory=False)
            with config.open('rb') as stream:
                raw = stream.read(MAX_CONFIG + 1)
            if len(raw) > MAX_CONFIG:
                raise ValueError()
            value = json.loads(raw, object_pairs_hook=reject_duplicate_keys)
            if (type(value) is not dict or set(value) != {'version', 'active', 'retained'}
                    or type(value['version']) is not int or value['version'] != 1
                    or type(value['active']) is not str or value['active'] != str(path)
                    or type(value['retained']) is not list or value['retained'] != []):
                raise ValueError()
    except (OSError, ValueError, TypeError, RecursionError, LocationFailure):
        raise ValueError('Only plain self-pointer acceptance routing is allowed') from None
    return path


class Journal:
    """Content-free facts only; never records bodies, headers, keys or paths."""
    def __init__(self, directory):
        directory.mkdir(parents=True, exist_ok=True)
        identity = uuid4().hex
        self.path = directory / f'search-lifecycle-{identity}.json'
        self.facts = {'schema_version': 1, 'scenario': 'installed-active-search-closure',
                      'session_id': identity, 'pid': os.getpid(), 'port': None,
                      'attempted': 0, 'completed': 0, 'cancelled': 0, 'active': 0,
                      'violations': 0, 'shutdown_started': False,
                      'server_finished': False, 'events': []}
        self.record('created')

    def record(self, event, **changes):
        self.facts.update(changes)
        self.facts['events'] = (self.facts['events'] + [event])[-32:]
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.facts, indent=2), encoding='utf-8')
        temporary.replace(self.path)


class SyntheticSecrets:
    def __init__(self):
        self.key = KEY

    def contains(self):
        return self.key is not None

    def read(self):
        return self.key

    def save(self, key):
        if key != KEY:
            raise SecretStoreUnavailable()
        self.key = KEY

    def delete(self):
        self.key = None


class OfflineModel:
    async def health(self):
        return ModelStatus(provider='ollama', status='unavailable')


def expected_payload(index):
    plan = construct_search_plan(CRITERIA)
    return {'query': plan['queries'][index], 'search_depth': 'basic', 'topic': 'general',
            'max_results': 10, 'auto_parameters': False, 'include_answer': False,
            'include_raw_content': False, 'include_images': False,
            'include_favicon': False, 'include_domains': plan['sources'][index]['domains'],
            'include_domains_mode': 'restrict'}


class ClosureTransport:
    def __init__(self, journal):
        self.journal = journal

    def reject(self):
        facts = self.journal.facts
        self.journal.record('rejected', violations=facts['violations'] + 1)
        raise AssertionError('Unexpected synthetic request; no network fallback exists')

    async def search(self, request):
        facts = self.journal.facts
        index = facts['attempted']
        if (index >= 2 or facts['shutdown_started'] or request.method != 'POST'
                or str(request.url) != SEARCH_ENDPOINT
                or request.headers.get('authorization') != f'Bearer {KEY}'):
            self.reject()
        try:
            payload = json.loads(request.content, object_pairs_hook=reject_duplicate_keys)
        except (ValueError, UnicodeError):
            self.reject()
        if payload != expected_payload(index):
            self.reject()
        self.journal.record('request_started', attempted=index + 1, active=facts['active'] + 1)
        try:
            if index == 1:
                # The real shutdown path must cancel this wait, before request 3.
                await asyncio.Event().wait()
            result = {'results': [{'title': 'SYNTHETIC software engineer',
                                   'content': 'SYNTHETIC fixture. Location: India. Work mode: Remote.',
                                   'url': 'https://boards.greenhouse.io/syntheticclosure/jobs/1'}]}
            self.journal.record('response_completed', completed=facts['completed'] + 1)
            return httpx.Response(200, headers={'Content-Type': 'application/json'},
                                  stream=httpx.ByteStream(json.dumps(result).encode()))
        except asyncio.CancelledError:
            self.journal.record('request_cancelled', cancelled=facts['cancelled'] + 1)
            raise
        finally:
            self.journal.record('request_released', active=facts['active'] - 1)

    async def connection(self, request):
        self.reject()


def create_installed_search_app(data_dir, token):
    journal = Journal(data_dir)
    transport = ClosureTransport(journal)
    application = create_app(
        Settings(data_dir=data_dir, session_token=token), OfflineModel(),
        secret_store=SyntheticSecrets(),
        search_provider=TavilySearch(transport=httpx.MockTransport(transport.search)),
        provider_connection=TavilyConnection(transport=httpx.MockTransport(transport.connection)),
    )
    original_shutdown = application.state.begin_shutdown

    def begin_shutdown():
        if not journal.facts['shutdown_started']:
            journal.record('shutdown_started', shutdown_started=True)
        original_shutdown()

    application.state.begin_shutdown = begin_shutdown

    @application.middleware('http')
    async def forbid_relocation(request, call_next):
        if request.url.path in ('/api/v1/setup/location/review', '/api/v1/setup/location/apply'):
            from fastapi.responses import JSONResponse
            return JSONResponse({'error': 'synthetic_acceptance_scope'}, status_code=403)
        return await call_next(request)

    return application, journal


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--owner-pid', type=int, required=True)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--port', type=int, choices=[0], default=0)
    args = parser.parse_args(argv)
    if args.owner_pid <= 0:
        parser.error('A disposable installed desktop owner is required')
    try:
        data_dir = validate_data_directory(args.data_dir)
    except ValueError as error:
        parser.error(str(error))
    settings = Settings.from_environment(data_dir)
    application, journal = create_installed_search_app(data_dir, settings.session_token)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(('127.0.0.1', 0))
        listener.listen(128)
        listener.setblocking(False)
        journal.record('bound', port=listener.getsockname()[1])
        server = EngineServer(uvicorn.Config(application, log_level='warning', access_log=False,
                              timeout_graceful_shutdown=3), application.state.begin_shutdown)
        from jobscout_engine.owner import watch_owner
        finished = watch_owner(args.owner_pid, server)
        try:
            print(json.dumps({'event': 'bound', 'port': listener.getsockname()[1]}), flush=True)
            server.run(sockets=[listener])
            journal.record('server_finished', server_finished=True)
        finally:
            finished.set()


if __name__ == '__main__':
    from multiprocessing import freeze_support
    freeze_support()
    main()
