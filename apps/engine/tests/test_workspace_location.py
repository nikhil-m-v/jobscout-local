from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import threading
import subprocess
import sys
from unittest.mock import Mock

from fastapi.testclient import TestClient
import pytest

from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.storage import Database
from jobscout_engine import workspace_location as module
from jobscout_engine.workspace_location import WorkspaceLocation, LocationFailure, CONFIG
from test_data_controls import seed, PROFILE, NOTES

TOKEN = 'synthetic-location-' + 'x' * 32
HEADERS = {'Authorization': 'Bearer ' + TOKEN}
BASE = '/api/v1/setup/location'


def app(root, forbidden=None):
    forbidden = forbidden or Mock()
    return create_app(Settings(root, TOKEN), model_provider=forbidden, secret_store=forbidden,
                      provider_connection=forbidden, search_provider=forbidden)


def review(client, destination):
    result = client.post(BASE + '/review', headers=HEADERS, json={'destination': str(destination)})
    assert result.status_code == 200, result.text
    assert result.headers['cache-control'] == 'no-store'
    return result.json()


def apply(client, value):
    return client.post(BASE + '/apply', headers=HEADERS,
                       json={'review_token': value['review_token'], 'confirmed': True})


def test_copy_switch_restart_tracking_deletion_and_retained_copies(tmp_path):
    root, destination, third = [tmp_path / name for name in ['original', 'chosen', 'third']]
    original = seed(root)
    profile, jobs = original.load_profile(), original.load_jobs()
    forbidden = Mock()
    with TestClient(app(root, forbidden)) as client:
        value = review(client, destination)
        assert not destination.exists()
        assert PROFILE not in str(value) and NOTES not in str(value)
        assert value['database_bytes'] > 0 and value['free_bytes'] > 0
        result = apply(client, value)
        assert result.status_code == 200
        assert result.json() == {'folder': str(destination), 'retained_folders': [str(root)]}
        assert apply(client, value).status_code == 409
        assert client.get('/api/v1/profile', headers=HEADERS).json()['profile'] == profile
        assert client.get('/api/v1/jobs', headers=HEADERS).json()['jobs'] == jobs
        assert client.get('/api/v1/setup/storage', headers=HEADERS).json()['folder'] == str(destination)
        assert client.post('/api/v1/setup/check', headers=HEADERS).json()['storage'] == 'verified'
        assert forbidden.mock_calls == []
    with TestClient(app(root)) as client:
        assert client.get(BASE, headers=HEADERS).json()['folder'] == str(destination)
        assert client.get('/api/v1/jobs', headers=HEADERS).json()['jobs'] == jobs
        assert apply(client, review(client, third)).status_code == 200
        assert client.get(BASE, headers=HEADERS).json()['retained_folders'] == [str(root), str(destination)]
        counts = client.get('/api/v1/data', headers=HEADERS).json()['review']
        assert client.request('DELETE', '/api/v1/data', headers=HEADERS,
                              json={'confirmed': True, 'review_token': counts['review_token']}).status_code == 200
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}
    assert original.load_jobs() == jobs and Database(destination).load_jobs() == jobs
    with TestClient(app(root)) as client:
        assert client.get('/api/v1/jobs', headers=HEADERS).json() == {'jobs': []}


@pytest.mark.parametrize('body', [{}, {'destination': 1}, {'destination': 'relative'},
    {'destination': 'x', 'private': 'marker'}, {'confirmed': False, 'review_token': 'a'*64},
    {'confirmed': True, 'review_token': 'z'*64}])
def test_exact_bounded_requests(tmp_path, body):
    with TestClient(app(tmp_path)) as client:
        for suffix in ['/review', '/apply']:
            assert client.post(BASE + suffix, json=body).status_code == 401
            assert client.post(BASE + suffix, headers=HEADERS, json=body).status_code in (409, 422)
            assert client.post(BASE + suffix + '?extra=1', headers=HEADERS, json=body).status_code == 422
        assert client.get(BASE + '?extra=1', headers=HEADERS).status_code == 422
        assert client.post(BASE+'/review', headers={**HEADERS, 'Content-Type':'application/json'},
                           content='{"destination":"a","destination":"b"}').status_code == 422
        assert client.post(BASE+'/review', headers={**HEADERS, 'Content-Type':'application/json'},
                           content=b'x'*16385).status_code == 422


@pytest.mark.parametrize('kind', ['same', 'child', 'parent', 'existing', 'missing_parent', 'relative', 'traversal', 'control'])
def test_invalid_destinations_never_write(tmp_path, kind):
    root = tmp_path / 'original'
    seed(root)
    manager = WorkspaceLocation(root, TOKEN)
    paths = {'same': root, 'child': root/'child', 'parent': tmp_path, 'existing': root/'jobscout.db',
             'missing_parent': tmp_path/'missing'/'new', 'relative': Path('relative'),
             'traversal': tmp_path/'..'/'other', 'control': str(tmp_path/'bad')+'\n'}
    before = set(tmp_path.rglob('*'))
    with pytest.raises((LocationFailure, OSError)):
        manager.review(str(paths[kind]))
    assert set(tmp_path.rglob('*')) == before


def test_stale_expired_replaced_and_wrong_reviews(tmp_path, monkeypatch):
    root, dest = tmp_path/'root', tmp_path/'dest'
    db = seed(root)
    manager = WorkspaceLocation(root, TOKEN)
    token = manager.review(str(dest))['review_token']
    db.save_profile('SYNTHETIC updated')
    with pytest.raises(LocationFailure, match='review_changed'): manager.apply(token)
    assert not dest.exists()
    token = manager.review(str(dest))['review_token']
    manager.review(str(tmp_path/'other'))
    with pytest.raises(LocationFailure, match='review_changed'): manager.apply(token)
    token = manager.review(str(dest))['review_token']
    monkeypatch.setattr(module.time, 'monotonic', lambda: float('inf'))
    with pytest.raises(LocationFailure, match='review_changed'): manager.apply(token)
    assert not dest.exists()


@pytest.mark.parametrize('failure', ['space', 'mkdir', 'copy', 'verify', 'commit'])
def test_failure_preserves_source_and_routing(tmp_path, monkeypatch, failure):
    root, dest = tmp_path/'root', tmp_path/'dest'
    database = seed(root)
    before = database.path.read_bytes()
    manager = WorkspaceLocation(root, TOKEN)
    token = manager.review(str(dest))['review_token']
    if failure == 'space': monkeypatch.setattr(module.shutil, 'disk_usage', lambda _: Mock(free=0))
    if failure == 'mkdir': monkeypatch.setattr(Path, 'mkdir', Mock(side_effect=OSError('PRIVATE')))
    if failure == 'copy': monkeypatch.setattr(manager, '_copy', Mock(side_effect=OSError('PRIVATE')))
    if failure == 'commit': monkeypatch.setattr(module.os, 'replace', Mock(side_effect=OSError('PRIVATE')))
    if failure == 'verify':
        original = Database.review_data
        monkeypatch.setattr(Database, 'review_data', lambda self, secret: {'review_token': 'bad'}
                            if self.path.parent == dest else original(self, secret))
    with pytest.raises((LocationFailure, OSError)): manager.apply(token)
    assert manager.active == root and not (root/CONFIG).exists()
    assert database.path.read_bytes() == before
    monkeypatch.undo()
    restarted = WorkspaceLocation(root, TOKEN)
    restarted.load()
    assert restarted.active == root


@pytest.mark.parametrize('damage', ['missing_db', 'missing_folder', 'missing_config', 'bad_json', 'extra_field', 'oversize', 'wrong_owner'])
def test_bad_selected_storage_fails_closed(tmp_path, damage):
    root, dest = tmp_path/'root', tmp_path/'dest'
    seed(root)
    manager = WorkspaceLocation(root, TOKEN)
    manager.load()
    manager.apply(manager.review(str(dest))['review_token'])
    if damage in ['missing_db', 'missing_folder']:
        (dest/'jobscout.db').unlink()
        if damage == 'missing_folder':
            (dest/module.OWNER).unlink()
            dest.rmdir()
    elif damage == 'missing_config': (root/CONFIG).unlink()
    elif damage == 'wrong_owner': (dest/module.OWNER).write_text('wrong')
    elif damage == 'bad_json': (root/CONFIG).write_text('{')
    elif damage == 'oversize': (root/CONFIG).write_text('x'*(module.MAX_CONFIG+1))
    else:
        value = json.loads((root/CONFIG).read_text()); value['extra'] = True
        (root/CONFIG).write_text(json.dumps(value))
    with pytest.raises(LocationFailure, match='configuration_unavailable'):
        with TestClient(app(root)): pass
    if damage in ['missing_db', 'missing_folder']: assert not (dest/'jobscout.db').exists()
    assert Database(root).load_profile()['text'] == PROFILE


def test_switch_blocks_other_requests_and_duplicate_copy(tmp_path, monkeypatch):
    root, dest = tmp_path/'root', tmp_path/'dest'
    seed(root)
    entered, release = threading.Event(), threading.Event()
    original = WorkspaceLocation._copy
    def slow(self, *args):
        entered.set()
        assert release.wait(10)
        return original(self, *args)
    monkeypatch.setattr(WorkspaceLocation, '_copy', slow)
    with TestClient(app(root)) as client, ThreadPoolExecutor() as pool:
        value = review(client, dest)
        run = pool.submit(apply, client, value)
        try:
            assert entered.wait(5)
            for route in [BASE, '/api/v1/profile', '/api/v1/jobs', '/api/v1/data', '/api/v1/setup/check']:
                assert client.get(route, headers=HEADERS).json() == {'error': 'location_busy'}
            assert apply(client, value).json() == {'error': 'location_busy'}
            assert client.get(BASE).status_code == 401
        finally: release.set()
        assert run.result().status_code == 200


def test_second_engine_lease_and_stable_secret_namespace(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr('jobscout_engine.app.create_secret_store', lambda directory: calls.append(directory) or Mock())
    root, dest = tmp_path/'root', tmp_path/'dest'
    with TestClient(create_app(Settings(root, TOKEN))) as client:
        with pytest.raises(LocationFailure, match='workspace_in_use'):
            with TestClient(app(root)): pass
        assert apply(client, review(client, dest)).status_code == 200
        with pytest.raises(LocationFailure, match='configuration_unavailable'):
            with TestClient(app(dest)): pass
    with TestClient(create_app(Settings(root, TOKEN))): pass
    assert calls == [root, root]


@pytest.mark.skipif(os.name != 'nt', reason='Windows path policy')
@pytest.mark.parametrize('destination', ['\\\\server\\share\\new', '\\\\?\\C:\\new', 'C:\\new:stream', 'C:\\NUL', 'C:\\new.', 'C:\\new '])
def test_windows_unsafe_names(destination):
    with pytest.raises(LocationFailure): module.local_path(destination)


@pytest.mark.parametrize('phase', ['before_commit', 'after_commit'])
def test_real_process_interruption_has_one_restart_target(tmp_path, phase):
    root, dest = tmp_path/'root', tmp_path/'dest'
    original = seed(root)
    profile, jobs = original.load_profile(), original.load_jobs()
    # A disposable child exits abruptly at either side of the routing commit.
    code = '''
import os, sys
from pathlib import Path
from jobscout_engine.workspace_location import WorkspaceLocation
m = WorkspaceLocation(Path(sys.argv[1]), 'synthetic-interruption-' + 'x'*32)
m.load()
commit = m._commit
def interrupt(*args):
    if sys.argv[3] == 'after_commit': commit(*args)
    os._exit(17)
m._commit = interrupt
m.apply(m.review(sys.argv[2])['review_token'])
'''
    result = subprocess.run([sys.executable, '-c', code, str(root), str(dest), phase],
                            capture_output=True, timeout=15)
    assert result.returncode == 17
    with TestClient(app(root)) as client:
        assert client.get(BASE, headers=HEADERS).json()['folder'] == str(dest if phase == 'after_commit' else root)
        assert client.get('/api/v1/profile', headers=HEADERS).json()['profile'] == profile
        assert client.get('/api/v1/jobs', headers=HEADERS).json()['jobs'] == jobs
    assert original.load_profile() == profile
    assert Database(dest).load_jobs() == jobs  # retained copy, never swept


def test_destination_created_after_review_and_parent_replacement_are_rejected(tmp_path):
    root, parent = tmp_path/'root', tmp_path/'parent'
    seed(root); parent.mkdir()
    manager = WorkspaceLocation(root, TOKEN)
    dest = parent/'dest'
    token = manager.review(str(dest))['review_token']
    dest.mkdir(); marker = dest/'unrelated.txt'; marker.write_text('KEEP')
    with pytest.raises(LocationFailure, match='location_exists'): manager.apply(token)
    assert marker.read_text() == 'KEEP'
    other = parent/'other'
    token = manager.review(str(other))['review_token']
    parent.rename(tmp_path/'previous-parent'); parent.mkdir()
    with pytest.raises(LocationFailure, match='review_changed'): manager.apply(token)
    assert not other.exists()


def test_source_hardlink_and_reparse_ancestors_are_rejected(tmp_path, monkeypatch):
    root = tmp_path/'root'; seed(root)
    manager = WorkspaceLocation(root, TOKEN)
    os.link(root/'jobscout.db', tmp_path/'linked.db')
    with pytest.raises(LocationFailure, match='invalid_location'): manager.review(str(tmp_path/'dest'))
    (tmp_path/'linked.db').unlink()
    original = Path.lstat
    def reparse(self, *args, **kwargs):
        value = original(self, *args, **kwargs)
        if self == tmp_path:
            return Mock(st_mode=value.st_mode, st_file_attributes=0x400)
        return value
    monkeypatch.setattr(Path, 'lstat', reparse)
    with pytest.raises(LocationFailure, match='invalid_location'): manager.review(str(tmp_path/'dest'))


def test_migration_waits_for_existing_storage_work(tmp_path, monkeypatch):
    root, dest = tmp_path/'root', tmp_path/'dest'
    entered, release = threading.Event(), threading.Event()
    original = Database.save_profile
    def slow(self, text):
        entered.set(); assert release.wait(10)
        return original(self, text)
    monkeypatch.setattr(Database, 'save_profile', slow)
    with TestClient(app(root)) as client, ThreadPoolExecutor() as pool:
        value = review(client, dest)
        pending = pool.submit(client.put, '/api/v1/profile', headers=HEADERS, json={'text': 'SYNTHETIC revised', 'reviewed': True})
        try:
            assert entered.wait(5)
            assert apply(client, value).json() == {'error': 'location_busy'}
        finally: release.set()
        assert pending.result().status_code == 200
        assert apply(client, value).json() == {'error': 'location_review_changed'}
        assert not dest.exists()


def test_free_space_rechecked_and_error_responses_do_not_echo_paths(tmp_path, monkeypatch):
    root, dest = tmp_path/'root', tmp_path/'dest'
    with TestClient(app(root)) as client:
        value = review(client, dest)
        monkeypatch.setattr(module.shutil, 'disk_usage', Mock(side_effect=OSError('PRIVATE path')))
        result = apply(client, value)
        assert result.status_code == 503
        assert result.headers['cache-control'] == 'no-store'
        assert result.json() == {'error': 'location_unavailable'}
        assert not dest.exists()
