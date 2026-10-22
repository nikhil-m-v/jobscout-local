"""Synthetic shutdown races: no provider, vault, model or personal data access."""
import asyncio
import multiprocessing
import socket
import threading

import httpx
import pytest
import uvicorn

from jobscout_engine.adapters.tavily import TavilyConnection
from jobscout_engine.adapters.tavily_search import TavilySearch
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.imports import ImportService
from jobscout_engine.server import EngineServer
from jobscout_engine.storage import Database
from test_broader_discovery import confirmation
from test_discovery_api import CONFIRMATION
from test_health import OfflineModel
from test_pdf_import import sleeping_worker
from test_provider_connection import response
from test_providers import HEADERS, KEY, MemorySecrets
from test_tavily_search import ITEM


def application(tmp_path, handler, *, store=None, imports=None):
    secrets = store if store is not None else MemorySecrets()
    secrets.save(KEY)
    transport = httpx.MockTransport(handler)
    return create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel(),
                      secret_store=secrets, import_service=imports,
                      search_provider=TavilySearch(transport=transport),
                      provider_connection=TavilyConnection(transport=transport))


def outbound(kind):
    if kind == 'check':
        return '/api/v1/providers/tavily/check', {'confirmed': True}
    return '/api/v1/search', confirmation() if kind == 'broader' else CONFIRMATION


async def wait_until(predicate, timeout=5):
    async def wait():
        while not predicate():
            await asyncio.sleep(.01)
    await asyncio.wait_for(wait(), timeout)


@pytest.mark.parametrize('kind', ['single', 'broader', 'check'])
def test_shutdown_during_credential_read_never_dispatches(tmp_path, kind):
    async def scenario():
        reading, release = threading.Event(), threading.Event()
        class PausedSecrets(MemorySecrets):
            def read(self):
                reading.set()
                assert release.wait(5), 'Synthetic credential reader was not released'
                return KEY
        calls = []
        app = application(tmp_path, lambda request: calls.append(request), store=PausedSecrets())
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local') as client:
                path, body = outbound(kind)
                pending = asyncio.create_task(client.post(path, headers=HEADERS, json=body))
                try:
                    await wait_until(reading.is_set)
                    app.state.begin_shutdown()
                    release.set()
                    result = await asyncio.wait_for(pending, 2)
                    assert result.status_code == 503
                    assert result.json() == {'error': 'workspace_closing'}
                    assert result.headers['cache-control'] == 'no-store'
                    assert calls == []
                finally:
                    release.set()
                    if not pending.done():
                        pending.cancel()
                    await asyncio.gather(pending, return_exceptions=True)
    asyncio.run(scenario())


@pytest.mark.parametrize('kind', ['single', 'check'])
def test_shutdown_cancels_active_online_wait(tmp_path, kind):
    async def scenario():
        entered, stopped = asyncio.Event(), asyncio.Event()
        calls = []
        async def handler(request):
            calls.append(request)
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()
        app = application(tmp_path, handler)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local') as client:
                path, body = outbound(kind)
                pending = asyncio.create_task(client.post(path, headers=HEADERS, json=body))
                try:
                    await asyncio.wait_for(entered.wait(), 2)
                    app.state.begin_shutdown()
                    app.state.begin_shutdown()  # Repeated shutdown is harmless.
                    result = await asyncio.wait_for(pending, 2)
                    assert result.status_code == 503 and result.json() == {'error': 'workspace_closing'}
                    assert stopped.is_set() and len(calls) == 1
                finally:
                    if not pending.done():
                        pending.cancel()
                    await asyncio.gather(pending, return_exceptions=True)
    asyncio.run(scenario())


def test_shutdown_rejects_new_work_without_reading_body_or_touching_records(tmp_path):
    async def scenario():
        def forbidden(request):
            pytest.fail('Closing workspace dispatched a provider request')
        app = application(tmp_path, forbidden)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local') as client:
                assert (await client.put('/api/v1/profile', headers=HEADERS,
                                         json={'text': 'SYNTHETIC SAVED PROFILE', 'reviewed': True})).status_code == 200
                app.state.begin_shutdown()
                async def unread_body():
                    pytest.fail('Closing workspace read a new request body')
                    yield b''
                assert (await client.post('/api/v1/imports')).status_code == 401
                for path in ['/api/v1/imports', '/api/v1/search', '/api/v1/setup/location/apply']:
                    result = await client.post(path, headers=HEADERS, content=unread_body())
                    assert result.status_code == 503 and result.json() == {'error': 'workspace_closing'}
                result = await client.put('/api/v1/profile', headers=HEADERS, content=unread_body())
                assert result.status_code == 503
        assert Database(tmp_path).load_profile()['text'] == 'SYNTHETIC SAVED PROFILE'
    asyncio.run(scenario())


def test_server_shutdown_cancels_broader_wait_before_drain_and_preserves_results(tmp_path):
    async def scenario():
        entered, stopped = asyncio.Event(), asyncio.Event()
        calls = []
        async def handler(request):
            calls.append(request)
            if len(calls) == 2:
                entered.set()
                try:
                    await asyncio.Event().wait()
                finally:
                    stopped.set()
            return response({'results': [ITEM]})
        app = application(tmp_path, handler)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen(128)
            listener.setblocking(False)
            port = listener.getsockname()[1]
            server = EngineServer(uvicorn.Config(app, log_level='error', access_log=False,
                                               timeout_graceful_shutdown=3), app.state.begin_shutdown)
            running = asyncio.create_task(server.serve(sockets=[listener]))
            pending = None
            try:
                await wait_until(lambda: server.started or running.done())
                assert server.started
                async with httpx.AsyncClient(base_url=f'http://127.0.0.1:{port}', trust_env=False) as client:
                    pending = asyncio.create_task(client.post('/api/v1/search', headers=HEADERS, json=confirmation()))
                    await asyncio.wait_for(entered.wait(), 2)
                    server.should_exit = True  # The exact signal used by the Windows owner watcher.
                    result = (await asyncio.wait_for(pending, 2)).json()
                    await asyncio.wait_for(running, 2)
                    assert stopped.is_set() and len(calls) == 2
                    assert len(result['candidates']) == 1
                    assert result['coverage'] == {'attempted': 2, 'completed': 1, 'max_requests': 5,
                                                  'stop_reason': 'cancelled', 'failures': []}
                    assert not server.server_state.tasks
                    assert Database(tmp_path).is_ready()
            finally:
                server.should_exit = True
                if pending is not None:
                    if not pending.done():
                        pending.cancel()
                    await asyncio.gather(pending, return_exceptions=True)
                await asyncio.wait_for(running, 5)
    asyncio.run(scenario())


def test_shutdown_cancels_active_parser_and_reaps_child(tmp_path):
    async def scenario():
        imports = ImportService(timeout=15, worker=sleeping_worker)
        before = {child.pid for child in multiprocessing.active_children()}
        app = application(tmp_path, lambda _: pytest.fail('Import contacted provider'), imports=imports)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local') as client:
                reserved = (await client.post('/api/v1/imports', headers=HEADERS)).json()['id']
                pending = asyncio.create_task(client.put(f'/api/v1/imports/{reserved}/pdf',
                                                       headers={**HEADERS, 'Content-Type': 'application/pdf'},
                                                       content=b'SYNTHETIC DOCUMENT'))
                try:
                    await wait_until(lambda: {child.pid for child in multiprocessing.active_children()} != before)
                    assert imports.task and imports.task.running
                    app.state.begin_shutdown()
                    result = await asyncio.wait_for(pending, 3)
                    assert result.status_code == 422 and result.json() == {'error': 'cancelled'}
                    assert imports.task is None
                    assert {child.pid for child in multiprocessing.active_children()} == before
                finally:
                    app.state.begin_shutdown()
                    if not pending.done():
                        pending.cancel()
                    await asyncio.gather(pending, return_exceptions=True)
        assert Database(tmp_path).load_profile() is None
    asyncio.run(scenario())


def test_shutdown_allows_accepted_storage_write_to_finish(tmp_path, monkeypatch):
    async def scenario():
        writing, release = threading.Event(), threading.Event()
        original = Database.save_profile

        def paused_save(database, text):
            writing.set()
            assert release.wait(5), 'Synthetic storage writer was not released'
            return original(database, text)

        monkeypatch.setattr(Database, 'save_profile', paused_save)
        app = application(tmp_path, lambda _: pytest.fail('Save contacted provider'))
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://local') as client:
                pending = asyncio.create_task(client.put('/api/v1/profile', headers=HEADERS,
                                                        json={'text': 'SYNTHETIC ACCEPTED SAVE', 'reviewed': True}))
                try:
                    await wait_until(writing.is_set)
                    app.state.begin_shutdown()
                    release.set()
                    assert (await asyncio.wait_for(pending, 2)).status_code == 200
                finally:
                    release.set()
                    await asyncio.gather(pending, return_exceptions=True)
        assert Database(tmp_path).load_profile()['text'] == 'SYNTHETIC ACCEPTED SAVE'
    asyncio.run(scenario())
