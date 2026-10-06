import asyncio
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.adapters.tavily_search import TavilySearch, SEARCH_ENDPOINT
from jobscout_engine.adapters.secrets import UnavailableSecretStore
from jobscout_engine.config import Settings
from jobscout_engine.storage import Database
from test_health import OfflineModel
from test_search import CRITERIA
from test_providers import MemorySecrets, HEADERS, KEY
from test_provider_connection import response
from test_tavily_search import VALID

URL = '/api/v1/search'
CONFIRMATION = {'criteria': CRITERIA, 'provider': 'tavily', 'query_version': 1,
                'reviewed_query': 'Software engineer jobs', 'confirmed': True}


def app(tmp_path, store, transport):
    return create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel(),
                      secret_store=store, search_provider=TavilySearch(transport=transport))


def test_full_preview_confirmation_dispatch_privacy_flow(tmp_path, monkeypatch, caplog):
    captured = []
    def handler(request):
        captured.append(request)
        return response(VALID)
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(handler))) as client:
        # Distinctive private fixture lives only in the isolated local database.
        saved = client.put('/api/v1/profile', headers=HEADERS,
                           json={'text': 'PRIVATE_PERSON PRIVATE_CONTACT PRIVATE_CAREER', 'reviewed': True})
        assert saved.status_code == 200
        def forbidden(*args, **kwargs):
            raise AssertionError('Search accessed profile')
        monkeypatch.setattr(Database, 'load_profile', forbidden)
        assert client.post(URL, json=CONFIRMATION).status_code == 401
        preview = client.post('/api/v1/search/preview', headers=HEADERS, json=CRITERIA).json()
        assert preview['provider'] == 'tavily' and preview['dispatch_available'] is True
        assert captured == []
        result = client.post(URL, headers=HEADERS, json=CONFIRMATION)
        assert result.status_code == 200 and result.headers['cache-control'] == 'no-store'
        assert set(result.json()) == {'query', 'provider', 'candidates', 'retrieved_at', 'duplicates_removed', 'discarded_results'}
        assert result.json()['duplicates_removed'] == 0
        assert result.json()['retrieved_at'].endswith('Z')
        assert result.json()['query'] == preview['query']
        assert result.json()['candidates'][0]['snippet'] == VALID['results'][0]['content']
        assert KEY not in result.text
        assert len(captured) == 1 and str(captured[0].url) == SEARCH_ENDPOINT
        assert json.loads(captured[0].content)['query'] == preview['query']
        assert 'PRIVATE_' not in captured[0].content.decode()
        assert 'PRIVATE_' not in caplog.text and KEY not in caplog.text
        store.delete()
        assert client.post(URL, headers=HEADERS, json=CONFIRMATION).json() == {'error': 'provider_key_missing'}
        assert len(captured) == 1


@pytest.mark.parametrize('payload', [
    None, {}, {**CONFIRMATION, 'confirmed': False}, {**CONFIRMATION, 'confirmed': 1},
    {**CONFIRMATION, 'provider': 'other'}, {**CONFIRMATION, 'query_version': True},
    {**CONFIRMATION, 'query_version': 2}, {**CONFIRMATION, 'reviewed_query': 'Private identity'},
    {**CONFIRMATION, 'criteria': {**CRITERIA, 'notes': 'PRIVATE_MARKER'}},
    {**CONFIRMATION, 'criteria': {**CRITERIA, 'role': 'PRIVATE_MARKER'}},
    {**CONFIRMATION, 'key': KEY}, {**CONFIRMATION, 'endpoint': 'https://collector.example.com'},
    {**CONFIRMATION, 'profile': 'PRIVATE_MARKER'},
])
def test_confirmation_is_exact_and_rejected_before_secret_access(tmp_path, payload):
    class ForbiddenStore(MemorySecrets):
        def read(self):
            raise AssertionError('Invalid confirmation read key')
    def forbidden(request):
        raise AssertionError('Invalid confirmation dispatched')
    with TestClient(app(tmp_path, ForbiddenStore(), httpx.MockTransport(forbidden))) as client:
        result = client.post(URL, headers=HEADERS, content=json.dumps(payload))
        assert result.status_code == 422 and result.json() == {'error': 'search_confirmation_required'}
        assert result.headers['cache-control'] == 'no-store'


@pytest.mark.parametrize('body', [b'x' * 6145, b'{', b'\xff', b'{"confirmed":false,"confirmed":true}', b'[' * 1500])
def test_confirmation_body_is_bounded_and_duplicate_safe(tmp_path, body):
    with TestClient(app(tmp_path, MemorySecrets(), httpx.MockTransport(lambda request: response()))) as client:
        assert client.post(URL, headers=HEADERS, content=body).status_code == 422
        assert client.post(URL, headers={**HEADERS, 'Content-Type': 'text/plain'}, json=CONFIRMATION).status_code == 422


def test_missing_and_unavailable_key_never_dispatch(tmp_path):
    def forbidden(request):
        raise AssertionError('No usable key dispatched')
    for store, code in [(MemorySecrets(), 'provider_key_missing'), (UnavailableSecretStore(), 'secret_store_unavailable')]:
        with TestClient(app(tmp_path, store, httpx.MockTransport(forbidden))) as client:
            result = client.post(URL, headers=HEADERS, json=CONFIRMATION)
            assert result.json() == {'error': code}


def test_provider_errors_are_fixed_and_no_store(tmp_path):
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, httpx.MockTransport(lambda request: response({'detail': KEY}, 429)))) as client:
        result = client.post(URL, headers=HEADERS, json=CONFIRMATION)
        assert result.status_code == 503 and result.json() == {'error': 'provider_rate_limited'}
        assert result.headers['cache-control'] == 'no-store'


def test_overlapping_dispatch_is_rejected_and_lock_recovers(tmp_path):
    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()
        calls = []
        async def handler(request):
            calls.append(request); started.set()
            await release.wait()
            return response(VALID)
        store = MemorySecrets(); store.save(KEY)
        application = app(tmp_path, store, httpx.MockTransport(handler))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=application), base_url='http://local') as client:
            first = asyncio.create_task(client.post(URL, headers=HEADERS, json=CONFIRMATION))
            await asyncio.wait_for(started.wait(), 2)
            duplicate = await client.post(URL, headers=HEADERS, json=CONFIRMATION)
            assert duplicate.status_code == 409 and duplicate.json() == {'error': 'search_busy'}
            release.set()
            assert (await first).status_code == 200
            assert (await client.post(URL, headers=HEADERS, json=CONFIRMATION)).status_code == 200
            assert len(calls) == 2
    asyncio.run(scenario())
