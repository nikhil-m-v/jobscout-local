import asyncio
import json
import logging
import httpx
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.adapters.tavily import TavilyConnection, ProviderCheckFailure, USAGE_ENDPOINT, MAX_RESPONSE_BYTES
from jobscout_engine.adapters.secrets import UnavailableSecretStore
from jobscout_engine.storage import Database
from test_health import OfflineModel
from test_providers import MemorySecrets, KEY, HEADERS

URL = '/api/v1/providers/tavily/check'
VALID = {'key': {'usage': 150, 'limit': 1000}, 'account': {'current_plan': 'SYNTHETIC_PRIVATE_ACCOUNT'}}


class Chunks(httpx.AsyncByteStream):
    def __init__(self, chunks):
        self.chunks = chunks
        self.closed = False

    async def __aiter__(self):
        for chunk in self.chunks:
            yield chunk

    async def aclose(self):
        self.closed = True


def response(data=VALID, status=200, headers=None, chunks=None):
    stream = Chunks(chunks if chunks is not None else [json.dumps(data).encode()])
    return httpx.Response(status, headers=headers if headers is not None else {'Content-Type': 'application/json'}, stream=stream)


def app(tmp_path, store, connection):
    return create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), OfflineModel(),
                      secret_store=store, provider_connection=connection)


def test_explicit_check_captures_only_fixed_endpoint_and_saved_auth_no_private_content(tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.INFO)
    captured = []
    def handler(request):
        captured.append(request)
        return response()
    store = MemorySecrets()
    store.save(KEY)
    connection = TavilyConnection(transport=httpx.MockTransport(handler))
    def forbidden(*args, **kwargs):
        raise AssertionError('Check accessed personal profile storage')
    with TestClient(app(tmp_path, store, connection)) as client:
        assert client.post(URL, json={'confirmed': True}).status_code == 401
        monkeypatch.setattr(Database, 'load_profile', forbidden)
        monkeypatch.setattr(Database, 'save_profile', forbidden)
        assert client.get('/api/v1/providers/tavily', headers=HEADERS).status_code == 200
        assert captured == []  # Opening Settings/local status cannot connect.
        result = client.post(URL, headers=HEADERS, json={'confirmed': True})
        assert result.status_code == 200
        assert result.json() == {'provider': 'tavily', 'connection_verified': True, 'dispatch_available': False}
        assert result.headers['cache-control'] == 'no-store'
        assert 'SYNTHETIC_PRIVATE_ACCOUNT' not in result.text
        assert KEY not in result.text
        # No durable/session-wide verified flag; local status never sends a check.
        assert client.get('/api/v1/providers/tavily', headers=HEADERS).json()['connection_verified'] is False
        assert client.post('/api/v1/search', headers=HEADERS, json={}).status_code == 404
    assert len(captured) == 1
    request = captured[0]
    assert request.method == 'GET'
    assert str(request.url) == USAGE_ENDPOINT
    assert not request.url.query and request.content == b''
    assert request.headers['authorization'] == 'Bearer ' + KEY
    assert set(request.headers) == {'host', 'authorization', 'accept', 'accept-encoding', 'user-agent', 'connection'}
    assert request.headers['accept-encoding'] == 'identity'
    assert not any('PRIVATE' in value for name, value in request.headers.items() if name != 'authorization')
    assert KEY not in caplog.text and 'SYNTHETIC_PRIVATE_ACCOUNT' not in caplog.text


@pytest.mark.parametrize('payload', [
    None, [], {}, {'confirmed': False}, {'confirmed': 1},
    {'confirmed': True, 'profile': 'PRIVATE_MARKER'}, {'confirmed': True, 'query': 'PRIVATE_MARKER'},
    {'confirmed': True, 'key': KEY}, {'confirmed': True, 'endpoint': 'https://example.test'},
])
def test_confirmation_rejects_unknown_personal_and_provider_fields_before_key_access(tmp_path, payload):
    class ForbiddenStore(MemorySecrets):
        def read(self):
            raise AssertionError('Invalid body read credentials')
    def handler(request):
        raise AssertionError('Invalid body sent a provider request')
    with TestClient(app(tmp_path, ForbiddenStore(), TavilyConnection(transport=httpx.MockTransport(handler)))) as client:
        result = client.post(URL, headers=HEADERS, content=json.dumps(payload))
        assert result.status_code == 422
        assert result.json() == {'error': 'provider_confirmation_required'}
        assert result.headers['cache-control'] == 'no-store'


@pytest.mark.parametrize('body', [b'x' * 257, b'{', b'\xff', b'{"confirmed":false,"confirmed":true}'])
def test_confirmation_json_is_bounded_and_duplicate_keys_are_rejected(tmp_path, body):
    with TestClient(app(tmp_path, MemorySecrets(), TavilyConnection())) as client:
        assert client.post(URL, headers=HEADERS, content=body).json() == {'error': 'provider_confirmation_required'}
        assert client.post(URL, headers={**HEADERS, 'Content-Type': 'text/plain'}, content=b'{"confirmed":true}').status_code == 422


def test_missing_or_unavailable_key_never_dispatches(tmp_path):
    def handler(request):
        raise AssertionError('No key must never dispatch')
    connection = TavilyConnection(transport=httpx.MockTransport(handler))
    for store, code in [(MemorySecrets(), 'provider_key_missing'), (UnavailableSecretStore(), 'secret_store_unavailable')]:
        with TestClient(app(tmp_path, store, connection)) as client:
            result = client.post(URL, headers=HEADERS, json={'confirmed': True})
            assert result.json() == {'error': code}


@pytest.mark.parametrize('status,code', [
    (301, 'provider_unavailable'), (302, 'provider_unavailable'), (307, 'provider_unavailable'),
    (401, 'provider_invalid_key'), (403, 'provider_invalid_key'), (429, 'provider_rate_limited'),
    (432, 'provider_quota_exhausted'), (433, 'provider_quota_exhausted'),
    (400, 'provider_unavailable'), (500, 'provider_unavailable'),
])
def test_status_errors_never_echo_body_follow_redirects_or_retry(tmp_path, status, code):
    captured = []
    def handler(request):
        captured.append(request)
        return response({'detail': KEY + ' PRIVATE_MARKER'}, status,
                        {'Location': 'https://example.test/collect', 'Set-Cookie': 'private=marker'})
    store = MemorySecrets(); store.save(KEY)
    with TestClient(app(tmp_path, store, TavilyConnection(transport=httpx.MockTransport(handler)))) as client:
        result = client.post(URL, headers=HEADERS, json={'confirmed': True})
        assert result.json() == {'error': code}
        assert result.headers['cache-control'] == 'no-store'
    assert len(captured) == 1 and str(captured[0].url) == USAGE_ENDPOINT


@pytest.mark.parametrize('value', [None, [], {}, {'key': {}, 'account': {}},
    {'key': {'usage': True, 'limit': 1}, 'account': {}},
    {'key': {'usage': -1, 'limit': 1}, 'account': {}},
    {'key': {'usage': 1, 'limit': 1}, 'account': []},
    {'key': {'usage': 1, 'limit': 1_000_000_001}, 'account': {}},
])
def test_unexpected_usage_shape_is_not_accepted(value):
    connection = TavilyConnection(transport=httpx.MockTransport(lambda request: response(value)))
    with pytest.raises(ProviderCheckFailure, match='^provider_invalid_response$'):
        asyncio.run(connection.check(KEY))


@pytest.mark.parametrize('headers,chunks', [
    ({'Content-Type': 'text/html'}, [b'<script>PRIVATE_MARKER</script>']),
    ({'Content-Type': 'application/json', 'Content-Encoding': 'gzip'}, [b'compressed']),
    ({'Content-Type': 'application/json', 'Content-Length': '999999'}, [b'{}']),
    ({'Content-Type': 'application/json', 'Content-Length': 'bad'}, [b'{}']),
    ({'Content-Type': 'application/json'}, [b'a' * 8192, b'b' * 8192, b'x']),
    ({'Content-Type': 'application/json'}, [b'\xff']),
    ({'Content-Type': 'application/json'}, [b'{"key":{},"key":{},"account":{}}']),
])
def test_response_bytes_content_type_encoding_and_json_are_bounded(headers, chunks):
    outgoing = response(headers=headers, chunks=chunks)
    connection = TavilyConnection(transport=httpx.MockTransport(lambda request: outgoing))
    with pytest.raises(ProviderCheckFailure, match='^provider_invalid_response$'):
        asyncio.run(connection.check(KEY))
    assert outgoing.is_closed


def test_exact_response_byte_limit_is_accepted_but_never_returned():
    data = json.dumps(VALID).encode()
    outgoing = response(chunks=[data + b' ' * (MAX_RESPONSE_BYTES - len(data))])
    asyncio.run(TavilyConnection(transport=httpx.MockTransport(lambda request: outgoing)).check(KEY))
    assert outgoing.is_closed


def test_transport_configuration_ignores_proxies_netrc_and_keeps_tls_verification(monkeypatch):
    original = httpx.AsyncClient
    config = []
    def factory(**kwargs):
        config.append(kwargs)
        return original(**kwargs)
    monkeypatch.setenv('HTTPS_PROXY', 'http://example.test:9999')
    monkeypatch.setenv('SSL_CERT_FILE', 'not-an-available-certificate')
    monkeypatch.setattr(httpx, 'AsyncClient', factory)
    asyncio.run(TavilyConnection(transport=httpx.MockTransport(lambda request: response())).check(KEY))
    assert config[0]['trust_env'] is False
    assert config[0]['follow_redirects'] is False
    assert config[0]['verify'] is True


@pytest.mark.parametrize('error,code', [(httpx.ConnectError('PRIVATE_MARKER'), 'provider_unavailable'),
                                     (httpx.ReadTimeout('PRIVATE_MARKER'), 'provider_timeout')])
def test_offline_and_timeout_diagnostics_are_fixed(error, code):
    def handler(request):
        raise error
    with pytest.raises(ProviderCheckFailure, match='^' + code + '$'):
        asyncio.run(TavilyConnection(transport=httpx.MockTransport(handler)).check(KEY))


def test_total_timeout_closes_response_without_retry(monkeypatch):
    import jobscout_engine.adapters.tavily as module
    monkeypatch.setattr(module, 'CHECK_TIMEOUT_SECONDS', 0.03)
    class Slow(Chunks):
        async def __aiter__(self):
            await asyncio.sleep(10)
            yield b'{}'
    stream = Slow([])
    connection = TavilyConnection(transport=httpx.MockTransport(lambda request: httpx.Response(200, headers={'Content-Type': 'application/json'}, stream=stream)))
    with pytest.raises(ProviderCheckFailure, match='^provider_timeout$'):
        asyncio.run(connection.check(KEY))
    assert stream.closed


def test_overlapping_check_is_rejected_without_duplicate_provider_dispatch(tmp_path):
    class WaitingConnection:
        def __init__(self):
            self.started = asyncio.Event()
            self.release = asyncio.Event()
            self.calls = 0

        async def check(self, key):
            self.calls += 1
            self.started.set()
            await self.release.wait()
    async def run():
        connection = WaitingConnection()
        store = MemorySecrets(); store.save(KEY)
        application = app(tmp_path, store, connection)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=application), base_url='http://local.test') as client:
            first = asyncio.create_task(client.post(URL, headers=HEADERS, json={'confirmed': True}))
            await asyncio.wait_for(connection.started.wait(), timeout=1)
            busy = await client.post(URL, headers=HEADERS, json={'confirmed': True})
            assert busy.status_code == 409 and busy.json() == {'error': 'provider_check_busy'}
            connection.release.set()
            assert (await first).status_code == 200
            assert connection.calls == 1
    asyncio.run(run())
