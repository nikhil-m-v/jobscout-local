import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.storage import Database
from jobscout_engine.domain.saved_jobs import validate_snapshot, SavedJobsFull, MAX_SAVED_JOBS
from test_health import OfflineModel

HEADERS = {'Authorization': 'Bearer synthetic-token'}
SNAPSHOT = {'title': 'Synthetic engineer', 'url': 'https://jobs.example.com/role',
            'snippet': 'SYNTHETIC_SAVED_CONTENT_918273 Must work with ET time zone overlap.',
            'provider': 'tavily', 'source_index': 1, 'retrieved_at': '2026-10-12T03:00:00Z'}


def app(path):
    return create_app(Settings(data_dir=path, session_token='synthetic-token'), OfflineModel())


def test_save_restart_duplicate_delete_and_private_record_independence(tmp_path):
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}
        client.put('/api/v1/profile', headers=HEADERS, json={'text': 'SYNTHETIC_PRIVATE_PROFILE', 'reviewed': True})
        response = client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True})
        assert response.status_code == 200 and response.headers['cache-control'] == 'no-store'
        saved = response.json()['job']
        assert saved['retrieved_at'] == '2026-10-12T03:00:00+00:00'
        assert saved['source_index'] == 1 and 'SYNTHETIC_PRIVATE_PROFILE' not in response.text
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': [saved]}
        duplicate = {**SNAPSHOT, 'url': SNAPSHOT['url'] + '?utm_source=synthetic#fragment', 'title': 'Changed listing'}
        assert client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': duplicate, 'confirmed': True}).json()['job'] == saved
        client.delete('/api/v1/profile', headers=HEADERS)
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': [saved]}
        for _ in range(2):
            deleted = client.delete('/api/v1/jobs/' + saved['id'], headers=HEADERS)
            assert deleted.json() == {'deleted': True} and deleted.headers['cache-control'] == 'no-store'
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}
    for file in tmp_path.iterdir():
        if file.is_file():
            assert b'SYNTHETIC_SAVED_CONTENT_918273' not in file.read_bytes()


@pytest.mark.parametrize('change', [
    {'url': 'http://jobs.example.com/1'}, {'url': 'https://127.0.0.1/1'},
    {'url': 'https://user:secret@jobs.example.com/1'}, {'url': 'https://jobs.example.com:444/1'},
    {'snippet': '\ud800'}, {'title': '\x00'}, {'title': ' '}, {'title': 'a' * 513},
    {'snippet': 'a' * 16385}, {'source_index': True}, {'source_index': 5}, {'source_index': -1},
    {'retrieved_at': '2026-10-12'}, {'retrieved_at': '2026-10-12T03:00:00+05:30'},
    {'provider': 'other'}, {'profile': 'SYNTHETIC_PRIVATE_PROFILE'},
])
def test_invalid_input_rejected_without_echo(tmp_path, change):
    with TestClient(app(tmp_path)) as client:
        response = client.put('/api/v1/jobs', headers={**HEADERS, 'Content-Type': 'application/json'}, content=json.dumps({'candidate': {**SNAPSHOT, **change}, 'confirmed': True}))
        assert response.status_code == 422 and response.json() == {'error': 'invalid_saved_job'}
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}


def test_auth_confirmation_duplicate_fields_and_body_bounds(tmp_path):
    with TestClient(app(tmp_path)) as client:
        for method, route in [('get', '/api/v1/jobs'), ('put', '/api/v1/jobs'), ('delete', '/api/v1/jobs/00000000-0000-4000-8000-000000000001')]:
            assert getattr(client, method)(route).status_code == 401
        for value in [{'candidate': SNAPSHOT}, {'candidate': SNAPSHOT, 'confirmed': False}, {'candidate': SNAPSHOT, 'confirmed': True, 'query': 'private'}]:
            assert client.put('/api/v1/jobs', headers=HEADERS, json=value).status_code == 422
        body = '{"candidate":' + json.dumps(SNAPSHOT) + ',"confirmed":false,"confirmed":true}'
        assert client.put('/api/v1/jobs', headers={**HEADERS, 'Content-Type': 'application/json'}, content=body).status_code == 422
        assert client.put('/api/v1/jobs', headers={**HEADERS, 'Content-Type': 'application/json'}, content=' ' * 120001).status_code == 422
        assert client.delete('/api/v1/jobs/not-a-uuid', headers=HEADERS).status_code == 422


def test_additive_upgrade_retains_profile_and_saved_job_limit_is_atomic(tmp_path):
    path = tmp_path / 'jobscout.db'
    with sqlite3.connect(path) as connection:
        connection.execute('CREATE TABLE profile (id INTEGER PRIMARY KEY, text TEXT, saved_at TEXT)')
        connection.execute("INSERT INTO profile VALUES (1, 'SYNTHETIC_EXISTING_PROFILE', '2026-10-11')")
        connection.execute('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)')
        connection.execute('INSERT INTO schema_version VALUES (1)')
    database = Database(tmp_path)
    database.initialize()
    assert database.load_profile()['text'] == 'SYNTHETIC_EXISTING_PROFILE'
    for i in range(MAX_SAVED_JOBS - 1):
        database.save_job(validate_snapshot({**SNAPSHOT, 'url': f'https://jobs.example.com/{i}'}))
    def save(i):
        try:
            database.save_job(validate_snapshot({**SNAPSHOT, 'url': f'https://jobs.example.com/concurrent-{i}'}))
            return True
        except SavedJobsFull:
            return False
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(save, [1, 2])) == [False, True]
    jobs = database.load_jobs()
    assert len(jobs) == MAX_SAVED_JOBS
    assert database.save_job({key: jobs[0][key] for key in SNAPSHOT}) == jobs[0]
    with TestClient(app(tmp_path)) as client:
        assert client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True}).json() == {'error': 'saved_jobs_full'}
    database.delete_job(jobs[0]['id'])
    assert save(3)


def test_storage_failure_is_fixed_and_keeps_prior_copy(tmp_path, monkeypatch):
    database = Database(tmp_path)
    database.initialize()
    original = database.save_job(validate_snapshot(SNAPSHOT))
    def fail(*args):
        raise sqlite3.OperationalError('SYNTHETIC_PRIVATE_DIAGNOSTIC')
    with TestClient(app(tmp_path)) as client:
        for method, name, route in [('get', 'load_jobs', '/api/v1/jobs'), ('put', 'save_job', '/api/v1/jobs'), ('delete', 'delete_job', '/api/v1/jobs/' + original['id'])]:
            with monkeypatch.context() as patch:
                patch.setattr(Database, name, fail)
                response = getattr(client, method)(route, headers=HEADERS, **({'json': {'candidate': SNAPSHOT, 'confirmed': True}} if method == 'put' else {}))
                assert response.status_code == 503 and response.json() == {'error': 'storage_unavailable'}
    assert database.load_jobs() == [original]


def test_saved_job_write_rolls_back_and_closes_handle(tmp_path, monkeypatch):
    database = Database(tmp_path)
    database.initialize()
    original = sqlite3.connect
    handles = []
    class FailingConnection(sqlite3.Connection):
        def execute(self, sql, parameters=()):
            result = super().execute(sql, parameters)
            if sql.startswith('INSERT INTO saved_jobs'):
                raise sqlite3.OperationalError('synthetic write failure')
            return result
    def failing(*args, **kwargs):
        handle = original(*args, **kwargs, factory=FailingConnection)
        handles.append(handle)
        return handle
    with monkeypatch.context() as patch:
        patch.setattr('jobscout_engine.storage.sqlite3.connect', failing)
        with pytest.raises(sqlite3.OperationalError):
            database.save_job(validate_snapshot(SNAPSHOT))
    assert database.load_jobs() == []
    with pytest.raises(sqlite3.ProgrammingError, match='closed'):
        handles[0].execute('SELECT 1')


def test_saving_loading_deleting_never_accesses_provider_vault_model_or_network(tmp_path, monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError('Local saving must not access external services')
    class ForbiddenServices:
        read = contains = save = delete = health = check = search = search_variant = forbidden
    import httpx
    monkeypatch.setattr(httpx.AsyncClient, 'send', forbidden)
    services = ForbiddenServices()
    application = create_app(Settings(data_dir=tmp_path, session_token='synthetic-token'), services,
                             secret_store=services, provider_connection=services, search_provider=services)
    with TestClient(application) as client:
        saved = client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True}).json()['job']
        saved = client.patch('/api/v1/jobs/' + saved['id'], headers=HEADERS, json={'stage': 'interview', 'notes': 'SYNTHETIC_PRIVATE_NOTE', 'revision': 0, 'confirmed': True}).json()['job']
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': [saved]}
        assert client.delete('/api/v1/jobs/' + saved['id'], headers=HEADERS).json() == {'deleted': True}
