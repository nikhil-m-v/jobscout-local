"""Count-only review, atomic deletion and logical byte removal with synthetic data."""
import json
import sqlite3
import threading
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.storage import Database
from jobscout_engine.domain.saved_jobs import validate_snapshot
from test_saved_jobs import app, HEADERS, SNAPSHOT

PROFILE = 'SYNTHETIC_PROFILE_CLEAR_773819'
NOTES = 'SYNTHETIC_NOTES_CLEAR_921482'


def seed(path):
    database = Database(path)
    database.initialize()
    database.save_profile(PROFILE)
    job = database.save_job(validate_snapshot(SNAPSHOT))
    database.update_job(job['id'], {'stage': 'interview', 'notes': NOTES, 'revision': 0})
    return database


def review(client):
    response = client.get('/api/v1/data', headers=HEADERS)
    assert response.status_code == 200 and response.headers['cache-control'] == 'no-store'
    value = response.json()['review']
    assert set(value) == {'profile_present', 'saved_jobs', 'jobs_with_notes', 'review_token'}
    assert PROFILE not in response.text and NOTES not in response.text and SNAPSHOT['snippet'] not in response.text
    return value


def test_atomic_clear_restart_original_file_and_owned_byte_removal(tmp_path):
    original = tmp_path / 'original-synthetic.txt'
    original.write_text(PROFILE)
    data = tmp_path / 'data'
    database = seed(data)
    with TestClient(app(data)) as client:
        value = review(client)
        assert (value['profile_present'], value['saved_jobs'], value['jobs_with_notes']) == (True, 1, 1)
        response = client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': value['review_token']})
        assert response.status_code == 200 and response.json() == {'deleted': True}
        assert response.headers['cache-control'] == 'no-store'
    with TestClient(app(data)) as client:
        assert client.get('/api/v1/profile', headers=HEADERS).json() == {'profile': None}
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}
        assert review(client)['saved_jobs'] == 0
    assert database.is_ready() and original.read_text() == PROFILE
    for path in data.iterdir():
        if path.is_file():
            assert all(marker.encode() not in path.read_bytes() for marker in [PROFILE, NOTES, SNAPSHOT['snippet']])


@pytest.mark.parametrize('value', [{}, {'confirmed': False, 'review_token': 'a' * 64}, {'confirmed': True, 'review_token': 'z' * 64}, {'confirmed': True, 'review_token': True}, {'confirmed': True, 'review_token': 'a' * 64, 'scope': 'all'}])
def test_invalid_confirmation_keeps_data(tmp_path, value):
    database = seed(tmp_path)
    with TestClient(app(tmp_path)) as client:
        assert client.request('DELETE', '/api/v1/data', headers=HEADERS, json=value).json() == {'error': 'invalid_data_review'}
    assert database.load_profile()['text'] == PROFILE and database.load_jobs()[0]['notes'] == NOTES


def test_auth_body_bounds_duplicates_and_changed_review(tmp_path):
    database = seed(tmp_path)
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/data').status_code == 401
        assert client.delete('/api/v1/data').status_code == 401
        value = review(client)
        for body in [' ' * 1025, '{"confirmed":false,"confirmed":true,"review_token":"' + value['review_token'] + '"}']:
            assert client.request('DELETE', '/api/v1/data', headers={**HEADERS, 'Content-Type': 'application/json'}, content=body).status_code == 422
        job = database.load_jobs()[0]
        database.update_job(job['id'], {'stage': 'applied', 'notes': 'New synthetic note', 'revision': 1})
        response = client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': value['review_token']})
        assert response.status_code == 409 and response.json() == {'error': 'data_review_changed'}
        assert database.load_jobs()[0]['notes'] == 'New synthetic note'
        assert database.load_profile()['text'] == PROFILE


def test_review_session_binding_and_repeated_clear_with_fresh_review(tmp_path):
    database = seed(tmp_path)
    token = database.review_data('other-session')['review_token']
    with TestClient(app(tmp_path)) as client:
        assert client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': token}).status_code == 409
        for _ in range(2):
            token = review(client)['review_token']
            assert client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': token}).json() == {'deleted': True}


def test_delete_rollback_closes_handles_and_fixed_errors(tmp_path, monkeypatch):
    database = seed(tmp_path)
    token = database.review_data('synthetic-token')['review_token']
    original = sqlite3.connect
    handles = []
    class Failing(sqlite3.Connection):
        def execute(self, sql, parameters=()):
            result = super().execute(sql, parameters)
            if sql == 'DELETE FROM saved_jobs':
                raise sqlite3.OperationalError('SYNTHETIC_PRIVATE_DIAGNOSTIC')
            return result
    def failing(*args, **kwargs):
        handle = original(*args, **kwargs, factory=Failing)
        handles.append(handle)
        return handle
    with monkeypatch.context() as patch:
        patch.setattr('jobscout_engine.storage.sqlite3.connect', failing)
        with pytest.raises(sqlite3.OperationalError):
            database.clear_career_data('synthetic-token', token)
    with pytest.raises(sqlite3.ProgrammingError, match='closed'):
        handles[0].execute('SELECT 1')
    assert database.load_profile()['text'] == PROFILE and database.load_jobs()[0]['notes'] == NOTES
    with TestClient(app(tmp_path)) as client:
        with monkeypatch.context() as patch:
            def fail(*args):
                raise sqlite3.OperationalError('SYNTHETIC_PRIVATE_DIAGNOSTIC')
            patch.setattr(Database, 'clear_career_data', fail)
            response = client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': token})
            assert response.status_code == 503 and response.json() == {'error': 'storage_unavailable'}


def test_deletion_blocks_overlapping_writes_and_duplicate_deletion(tmp_path, monkeypatch):
    database = seed(tmp_path)
    entered, release = threading.Event(), threading.Event()
    original = Database.clear_career_data
    def delayed(*args):
        entered.set()
        assert release.wait(10)
        original(*args)
    monkeypatch.setattr(Database, 'clear_career_data', delayed)
    with TestClient(app(tmp_path)) as client, ThreadPoolExecutor(max_workers=1) as pool:
        token = review(client)['review_token']
        body = {'confirmed': True, 'review_token': token}
        future = pool.submit(lambda: client.request('DELETE', '/api/v1/data', headers=HEADERS, json=body))
        try:
            assert entered.wait(5)
            assert client.put('/api/v1/profile', json={'text': 'UNAUTHORIZED', 'reviewed': True}).status_code == 401
            response = client.put('/api/v1/profile', headers=HEADERS, json={'text': 'OLD_DRAFT', 'reviewed': True})
            assert response.status_code == 409 and response.json() == {'error': 'data_busy'}
            assert client.request('DELETE', '/api/v1/data', headers=HEADERS, json=body).status_code == 409
        finally:
            release.set()
        assert future.result().status_code == 200
    assert database.load_profile() is None and database.load_jobs() == []


def test_review_and_delete_never_use_provider_vault_model_or_network(tmp_path, monkeypatch):
    seed(tmp_path)
    def forbidden(*args, **kwargs):
        raise AssertionError('Data controls must stay local')
    class Services:
        read = contains = save = delete = health = check = search = search_variant = forbidden
    import httpx
    monkeypatch.setattr(httpx.AsyncClient, 'send', forbidden)
    services = Services()
    application = create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), services,
                             secret_store=services, provider_connection=services, search_provider=services)
    with TestClient(application) as client:
        token = review(client)['review_token']
        assert client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': token}).json() == {'deleted': True}


def test_clear_rejects_an_already_running_profile_write(tmp_path, monkeypatch):
    database = seed(tmp_path)
    entered, release = threading.Event(), threading.Event()
    original = Database.save_profile
    def delayed(*args):
        entered.set(); assert release.wait(10)
        return original(*args)
    monkeypatch.setattr(Database, 'save_profile', delayed)
    with TestClient(app(tmp_path)) as client, ThreadPoolExecutor(max_workers=1) as pool:
        token = review(client)['review_token']
        future = pool.submit(lambda: client.put('/api/v1/profile', headers=HEADERS, json={'text': 'NEW_SYNTHETIC_PROFILE', 'reviewed': True}))
        try:
            assert entered.wait(5)
            response = client.request('DELETE', '/api/v1/data', headers=HEADERS, json={'confirmed': True, 'review_token': token})
            assert response.status_code == 409 and response.json() == {'error': 'data_busy'}
        finally:
            release.set()
        assert future.result().status_code == 200
    assert database.load_profile()['text'] == 'NEW_SYNTHETIC_PROFILE' and len(database.load_jobs()) == 1
