import json
import os
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.adapters.secrets import (
    WindowsSecretStore, UnavailableSecretStore, SecretStoreUnavailable,
)
from jobscout_engine.domain.providers import provider_status
from jobscout_engine.storage import Database
from test_health import OfflineModel

URL = '/api/v1/providers/tavily'
HEADERS = {'Authorization': 'Bearer synthetic-token', 'Content-Type': 'application/json'}
KEY = 'tvly-SYNTHETIC-ONLY-NOT-A-REAL-KEY'


class MemorySecrets:
    def __init__(self):
        self.key = None
        self.writes = 0

    def contains(self):
        return self.key is not None

    def read(self):
        return self.key

    def save(self, key):
        self.key = key
        self.writes += 1

    def delete(self):
        self.key = None


def app(tmp_path, store):
    return create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'),
                      OfflineModel(), secret_store=store)


def test_authenticated_save_replace_restart_remove_never_returns_secret(tmp_path, monkeypatch, caplog):
    import httpx
    def forbidden(*args, **kwargs):
        raise AssertionError('Provider setup accessed profile or network')
    store = MemorySecrets()
    with TestClient(app(tmp_path, store)) as client:
        for method in ('get', 'put', 'delete'):
            assert getattr(client, method)(URL).status_code == 401
        monkeypatch.setattr(Database, 'load_profile', forbidden)
        monkeypatch.setattr(Database, 'save_profile', forbidden)
        monkeypatch.setattr(httpx.AsyncClient, 'request', forbidden)
        assert client.get(URL, headers=HEADERS).json() == provider_status(False)
        for key in (KEY, KEY + '-replacement'):
            response = client.put(URL, headers=HEADERS, json={'key': key})
            assert response.json() == provider_status(True)
            assert key not in response.text
            assert response.headers['cache-control'] == 'no-store'
            assert store.key == key
        assert client.post('/api/v1/providers/tavily/check', headers=HEADERS, json={}).status_code == 422
    with TestClient(app(tmp_path, store)) as client:
        assert client.get(URL, headers=HEADERS).json() == provider_status(True)
        for _ in range(2):
            response = client.delete(URL, headers=HEADERS)
            assert response.json() == provider_status(False)
            assert response.headers['cache-control'] == 'no-store'
    assert KEY not in caplog.text
    for file in tmp_path.rglob('*'):
        if file.is_file():
            assert KEY.encode() not in file.read_bytes()


@pytest.mark.parametrize('payload', [
    None, [], KEY, {}, {'key': KEY, 'profile': 'PRIVATE_MARKER'},
    {'key': KEY, 'endpoint': 'https://example.test'}, {'key': False}, {'key': 123},
    {'key': ''}, {'key': ' ' + KEY}, {'key': KEY + '\n'}, {'key': 'a' * 513},
    {'key': '\x00'}, {'key': '\ud800'}, {'key': 'é'},
])
def test_invalid_payload_is_fixed_non_echo_and_never_saved(tmp_path, payload):
    store = MemorySecrets()
    with TestClient(app(tmp_path, store)) as client:
        response = client.put(URL, headers=HEADERS, content=json.dumps(payload))
        assert response.status_code == 422
        assert response.json() == {'error': 'invalid_provider_key'}
        assert response.headers['cache-control'] == 'no-store'
        assert store.writes == 0


@pytest.mark.parametrize('body', [
    b'x' * 2049, b'{', b'\xff', b'[' * 1500,
    b'{"key":"PRIVATE_MARKER","key":"synthetic"}',
])
def test_malformed_bounded_duplicate_json_is_rejected(tmp_path, body):
    store = MemorySecrets()
    with TestClient(app(tmp_path, store)) as client:
        response = client.put(URL, headers=HEADERS, content=body)
        assert response.status_code == 422
        assert response.json() == {'error': 'invalid_provider_key'}
        assert client.put(URL, headers={**HEADERS, 'Content-Type': 'text/plain'}, content=json.dumps({'key': KEY})).status_code == 422
    assert store.writes == 0


def test_unavailable_store_fails_closed_without_plaintext_fallback(tmp_path):
    with TestClient(app(tmp_path, UnavailableSecretStore())) as client:
        for method in ('get', 'put', 'delete'):
            kwargs = {'json': {'key': KEY}} if method == 'put' else {}
            response = getattr(client, method)(URL, headers=HEADERS, **kwargs)
            assert response.status_code == 503
            assert response.json() == {'error': 'secret_store_unavailable'}
            assert response.headers['cache-control'] == 'no-store'
    assert not (tmp_path / 'provider.json').exists()


@pytest.mark.skipif(os.name != 'nt', reason='Windows Credential Manager integration')
def test_windows_vault_persists_isolates_replaces_and_removes_synthetic_key(tmp_path):
    first = WindowsSecretStore(tmp_path / 'workspace-a')
    second = WindowsSecretStore(tmp_path / 'workspace-b')
    # New random pytest directory gives each run a dedicated credential namespace.
    assert not first.contains()
    assert not second.contains()
    try:
        first.save(KEY)
        reloaded = WindowsSecretStore(tmp_path / 'workspace-a')
        assert reloaded.contains()
        assert reloaded.read() == KEY
        assert not second.contains()
        first.save(KEY + '-replacement')
        # Inspect this test's own credential only, not any user credentials.
        import ctypes
        from jobscout_engine.adapters.secrets import _Credential
        pointer = ctypes.POINTER(_Credential)()
        assert first._api.CredReadW(first._target, 1, 0, ctypes.byref(pointer))
        try:
            assert ctypes.string_at(pointer.contents.CredentialBlob, pointer.contents.CredentialBlobSize) == (KEY + '-replacement').encode()
            assert pointer.contents.Persist == 2
        finally:
            first._api.CredFree(pointer)
        first.delete()
        first.delete()
        assert not reloaded.contains()
        assert reloaded.read() is None
    finally:
        first.delete()
        second.delete()


@pytest.mark.skipif(os.name != 'nt', reason='Windows error handling')
def test_windows_vault_errors_are_fixed_and_write_buffer_is_cleared(tmp_path):
    store = WindowsSecretStore(tmp_path)
    class BrokenApi:
        def CredReadW(self, *args):
            import ctypes
            ctypes.set_last_error(5)
            return False

        def CredDeleteW(self, *args):
            import ctypes
            ctypes.set_last_error(5)
            return False

        def CredWriteW(self, pointer, flags):
            self.credential = pointer._obj
            return False

    store._api = BrokenApi()
    for operation in (store.contains, store.read, store.delete, lambda: store.save(KEY)):
        with pytest.raises(SecretStoreUnavailable, match='^secret_store_unavailable$'):
            operation()
    import ctypes
    value = store._api.credential
    assert ctypes.string_at(value.CredentialBlob, value.CredentialBlobSize) == b'\0' * len(KEY)
