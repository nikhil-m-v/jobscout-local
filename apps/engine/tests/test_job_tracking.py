"""Private synthetic tracker lifecycle, concurrency and outbound isolation."""
import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.storage import Database
from jobscout_engine.domain.saved_jobs import TrackingConflict, validate_snapshot
from test_saved_jobs import app, SNAPSHOT, HEADERS

NOTES = 'SYNTHETIC_PRIVATE_TRACKER_584729 <img src="https://tracker.example.com">\nInterview Tuesday'


def test_stage_notes_restart_replace_clear_delete_and_duplicate(tmp_path):
    with TestClient(app(tmp_path)) as client:
        saved = client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True}).json()['job']
        assert (saved['stage'], saved['notes'], saved['revision']) == ('saved', '', 0)
        route = '/api/v1/jobs/' + saved['id']
        for revision, stage in enumerate(['applied', 'interview', 'saved']):
            response = client.patch(route, headers=HEADERS, json={'stage': stage, 'notes': NOTES, 'revision': revision, 'confirmed': True})
            assert response.status_code == 200 and response.headers['cache-control'] == 'no-store'
            updated = response.json()['job']
            assert updated == {**saved, 'stage': stage, 'notes': NOTES, 'revision': revision + 1}
        assert client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': {**SNAPSHOT, 'title': 'Different'}, 'confirmed': True}).json()['job'] == updated
        client.delete('/api/v1/profile', headers=HEADERS)
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': [updated]}
        assert client.patch(route, headers=HEADERS, json={'stage': 'saved', 'notes': '', 'revision': 3, 'confirmed': True}).json()['job']['notes'] == ''
    assert all(b'SYNTHETIC_PRIVATE_TRACKER_584729' not in path.read_bytes() for path in tmp_path.iterdir() if path.is_file())
    with TestClient(app(tmp_path)) as client:
        client.patch(route, headers=HEADERS, json={'stage': 'interview', 'notes': NOTES, 'revision': 4, 'confirmed': True})
        client.delete(route, headers=HEADERS)
        assert client.patch(route, headers=HEADERS, json={'stage': 'applied', 'notes': NOTES, 'revision': 5, 'confirmed': True}).json() == {'error': 'saved_job_missing'}
    with TestClient(app(tmp_path)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}
    assert all(b'SYNTHETIC_PRIVATE_TRACKER_584729' not in path.read_bytes() for path in tmp_path.iterdir() if path.is_file())


@pytest.mark.parametrize('change', [{'stage': 'offer'}, {'stage': None}, {'notes': 1}, {'notes': 'x' * 4001}, {'notes': '\x00'}, {'notes': '\ud800'}, {'revision': True}, {'revision': -1}, {'revision': 2147483647}, {'confirmed': False}, {'profile': 'PRIVATE'}])
def test_invalid_tracking_is_fixed_and_preserves_record(tmp_path, change):
    with TestClient(app(tmp_path)) as client:
        job = client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True}).json()['job']
        response = client.patch('/api/v1/jobs/' + job['id'], headers={**HEADERS, 'Content-Type': 'application/json'}, content=json.dumps({'stage': 'applied', 'notes': NOTES, 'revision': 0, 'confirmed': True, **change}))
        assert response.status_code == 422 and response.json() == {'error': 'invalid_job_tracking'}
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': [job]}


def test_tracking_auth_body_bounds_and_conflict(tmp_path):
    with TestClient(app(tmp_path)) as client:
        job = client.put('/api/v1/jobs', headers=HEADERS, json={'candidate': SNAPSHOT, 'confirmed': True}).json()['job']
        route = '/api/v1/jobs/' + job['id']
        assert client.patch(route).status_code == 401
        for body in [' ' * 50001, '{"stage":"saved","notes":"","revision":0,"confirmed":false,"confirmed":true}', '{}']:
            assert client.patch(route, headers={**HEADERS, 'Content-Type': 'application/json'}, content=body).status_code == 422
        value = {'stage': 'applied', 'notes': NOTES, 'revision': 0, 'confirmed': True}
        assert client.patch('/api/v1/jobs/not-uuid', headers=HEADERS, json=value).status_code == 422
        assert client.patch(route, headers=HEADERS, json=value).status_code == 200
        conflict = client.patch(route, headers=HEADERS, json={**value, 'notes': 'Stale'})
        assert conflict.status_code == 409 and conflict.json() == {'error': 'tracking_conflict'}
        assert client.get('/api/v1/jobs', headers=HEADERS).json()['jobs'][0]['notes'] == NOTES


def test_version_two_upgrade_preserves_existing_profile_snapshot_and_defaults(tmp_path):
    with sqlite3.connect(tmp_path / 'jobscout.db') as connection:
        connection.execute('CREATE TABLE profile (id INTEGER PRIMARY KEY, text TEXT, saved_at TEXT)')
        connection.execute("INSERT INTO profile VALUES (1, 'SYNTHETIC_OLD_PROFILE', '2026-10-11')")
        connection.execute('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)')
        connection.executemany('INSERT INTO schema_version VALUES (?)', [(1,), (2,)])
        connection.execute('CREATE TABLE saved_jobs (id TEXT PRIMARY KEY, url TEXT UNIQUE, snapshot TEXT, saved_at TEXT)')
        connection.execute('INSERT INTO saved_jobs VALUES (?, ?, ?, ?)', ('00000000-0000-4000-8000-000000000001', SNAPSHOT['url'], json.dumps(SNAPSHOT), '2026-10-12T03:00:00Z'))
    database = Database(tmp_path)
    database.initialize()
    database.initialize()
    assert database.is_ready()
    assert database.load_profile()['text'] == 'SYNTHETIC_OLD_PROFILE'
    job = database.load_jobs()[0]
    assert {key: job[key] for key in SNAPSHOT} == SNAPSHOT
    assert (job['stage'], job['notes'], job['revision']) == ('saved', '', 0)


def test_concurrent_tracking_has_one_winner_and_rollback_closes_handle(tmp_path, monkeypatch):
    database = Database(tmp_path)
    database.initialize()
    job = database.save_job(validate_snapshot(SNAPSHOT))
    def update(note):
        try:
            return database.update_job(job['id'], {'stage': 'applied', 'notes': note, 'revision': 0})
        except TrackingConflict:
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(update, ['FIRST_SYNTHETIC_NOTE', 'SECOND_SYNTHETIC_NOTE']))
    assert sum(value is not None for value in results) == 1
    before = database.load_jobs()[0]
    original = sqlite3.connect
    handles = []
    class Failing(sqlite3.Connection):
        def execute(self, sql, parameters=()):
            result = super().execute(sql, parameters)
            if sql.startswith('UPDATE saved_jobs'):
                raise sqlite3.OperationalError('SYNTHETIC_PRIVATE_FAILURE')
            return result
    def failing(*args, **kwargs):
        handle = original(*args, **kwargs, factory=Failing)
        handles.append(handle)
        return handle
    with monkeypatch.context() as patch:
        patch.setattr('jobscout_engine.storage.sqlite3.connect', failing)
        with pytest.raises(sqlite3.OperationalError):
            database.update_job(job['id'], {'stage': 'interview', 'notes': NOTES, 'revision': 1})
    assert database.load_jobs() == [before]
    with pytest.raises(sqlite3.ProgrammingError, match='closed'):
        handles[0].execute('SELECT 1')
    with TestClient(app(tmp_path)) as client:
        with monkeypatch.context() as patch:
            def fail(*args):
                raise sqlite3.OperationalError('SYNTHETIC_PRIVATE_FAILURE')
            patch.setattr(Database, 'update_job', fail)
            response = client.patch('/api/v1/jobs/' + job['id'], headers=HEADERS, json={'stage': 'interview', 'notes': NOTES, 'revision': 1, 'confirmed': True})
            assert response.status_code == 503 and response.json() == {'error': 'storage_unavailable'}
