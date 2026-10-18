from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import threading
from unittest.mock import Mock

from fastapi.testclient import TestClient
import pytest

from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine import setup_check as module
from jobscout_engine.setup_check import CoreCheck, MARKER, device_facts


def test_fixed_authenticated_route_leaves_records_and_other_services_untouched(tmp_path):
    forbidden = Mock()
    token = 'synthetic-session-' + 'c' * 32
    app = create_app(Settings(tmp_path, token), model_provider=forbidden,
                     secret_store=forbidden, provider_connection=forbidden, search_provider=forbidden)
    with TestClient(app) as client:
        before = {p.name: p.read_bytes() for p in tmp_path.iterdir()}
        route = '/api/v1/setup/check'
        assert client.post(route).status_code == 401
        assert client.post(route, headers={'Authorization': 'Bearer wrong'}).status_code == 401
        headers = {'Authorization': f'Bearer {token}'}
        assert client.get(route, headers=headers).status_code == 405
        for suffix, body in [('?path=private', b''), ('', b'{}'), ('', b'\x00'), ('', b'private' * 10000)]:
            result = client.post(route + suffix, content=body, headers=headers)
            assert result.status_code == 422
            assert result.json() == {'error': 'invalid_setup_request'}
        result = client.post(route, headers=headers)
        assert result.status_code == 200
        assert result.headers['cache-control'] == 'no-store'
        assert set(result.json()) == {'system', 'process_bits', 'logical_processors', 'memory_bytes', 'storage'}
        assert result.json()['storage'] == 'verified'
        assert {p.name: p.read_bytes() for p in tmp_path.iterdir()} == before
        assert forbidden.mock_calls == []


def test_only_owned_file_is_removed_and_marker_is_fixed(tmp_path, monkeypatch):
    existing = tmp_path / '.jobscout-check-existing'
    existing.write_bytes(b'untouched')
    original = module.os.fsync
    def sync(descriptor):
        files = [p for p in tmp_path.iterdir() if p != existing]
        assert len(files) == 1
        assert files[0].read_bytes() == MARKER
        original(descriptor)
    monkeypatch.setattr(module.os, 'fsync', sync)
    assert CoreCheck(tmp_path).run()['storage'] == 'verified'
    assert list(tmp_path.iterdir()) == [existing]
    assert existing.read_bytes() == b'untouched'


def test_missing_directory_is_not_created(tmp_path):
    missing = tmp_path / 'missing'
    assert CoreCheck(missing).run()['storage'] == 'unavailable'
    assert not missing.exists()


@pytest.mark.parametrize('operation', ['mkstemp', 'fdopen', 'fsync'])
def test_io_failures_are_fixed_and_cleanup_still_runs(tmp_path, monkeypatch, operation):
    target = module.tempfile if operation == 'mkstemp' else module.os
    monkeypatch.setattr(target, operation, Mock(side_effect=OSError('PRIVATE path details')))
    result = CoreCheck(tmp_path).run()
    assert result['storage'] == 'unavailable'
    assert 'PRIVATE' not in str(result)
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize('failure', ['write', 'flush', 'seek', 'read', 'close', 'mismatch'])
def test_stream_failure_never_verifies_and_removes_the_file(tmp_path, monkeypatch, failure):
    original = module.os.fdopen
    class Stream:
        def __init__(self, descriptor, mode):
            self.real = original(descriptor, mode)
        def __enter__(self):
            return self
        def __exit__(self, *args):
            self.real.close()
            if failure == 'close':
                raise OSError('PRIVATE close error')
        def __getattr__(self, name):
            if name == failure:
                return Mock(side_effect=OSError('PRIVATE stream error'))
            if name == 'read' and failure == 'mismatch':
                return lambda size: b'wrong'
            return getattr(self.real, name)
    monkeypatch.setattr(module.os, 'fdopen', Stream)
    assert CoreCheck(tmp_path).run()['storage'] == 'unavailable'
    assert list(tmp_path.iterdir()) == []


def test_cleanup_failure_blocks_new_files_until_explicit_retry_can_remove_owned_file(tmp_path, monkeypatch):
    check = CoreCheck(tmp_path)
    original = Path.unlink
    monkeypatch.setattr(Path, 'unlink', Mock(side_effect=PermissionError('PRIVATE')))
    assert check.run()['storage'] == 'cleanup_needed'
    files = list(tmp_path.iterdir())
    assert len(files) == 1
    assert files[0].read_bytes() == MARKER
    assert check.run()['storage'] == 'cleanup_needed'
    assert list(tmp_path.iterdir()) == files
    monkeypatch.setattr(Path, 'unlink', original)
    assert check.run()['storage'] == 'verified'
    assert list(tmp_path.iterdir()) == []


def test_inflight_probe_is_bounded_and_event_loop_remains_responsive(tmp_path, monkeypatch):
    entered, release = threading.Event(), threading.Event()
    original = module.os.fsync
    def slow_sync(descriptor):
        entered.set()
        assert release.wait(5)
        original(descriptor)
    token = 'synthetic-session-' + 'c' * 32
    with TestClient(create_app(Settings(tmp_path, token))) as client, ThreadPoolExecutor() as pool:
        monkeypatch.setattr(module.os, 'fsync', slow_sync)
        headers = {'Authorization': f'Bearer {token}'}
        run = pool.submit(client.post, '/api/v1/setup/check', headers=headers)
        try:
            assert entered.wait(5)
            second = client.post('/api/v1/setup/check', headers=headers)
            assert second.json()['storage'] == 'busy'
            assert client.get('/api/v1/setup/storage', headers=headers).status_code == 200
            assert len(list(tmp_path.glob('.jobscout-check-*'))) == 1
        finally:
            release.set()
        assert run.result(timeout=5).json()['storage'] == 'verified'
        assert not list(tmp_path.glob('.jobscout-check-*'))


@pytest.mark.parametrize('cpus,memory,expected_cpu,expected_memory', [
    (1, 0, 1, 0), (65536, 2**53 - 1, 65536, 2**53 - 1),
    (0, -1, None, None), (65537, 2**53, None, None),
    (True, True, None, None), ('4', 2.5, None, None), (None, None, None, None),
])
def test_device_facts_are_bounded(cpus, memory, expected_cpu, expected_memory, monkeypatch):
    monkeypatch.setattr(module.os, 'cpu_count', lambda: cpus)
    monkeypatch.setattr(module, 'physical_memory', lambda: memory)
    facts = device_facts()
    assert facts['logical_processors'] == expected_cpu
    assert facts['memory_bytes'] == expected_memory
    assert facts['process_bits'] in (32, 64)
    assert facts['system'] in ('windows', 'linux', 'macos', 'other')


def test_unavailable_device_facts_do_not_prevent_storage_probe(tmp_path, monkeypatch):
    monkeypatch.setattr(module.os, 'cpu_count', Mock(side_effect=OSError('PRIVATE')))
    monkeypatch.setattr(module, 'physical_memory', Mock(side_effect=OSError('PRIVATE')))
    result = CoreCheck(tmp_path).run()
    assert result['logical_processors'] is result['memory_bytes'] is None
    assert result['storage'] == 'verified'
