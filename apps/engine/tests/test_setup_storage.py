from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.setup_storage import inspect_storage


def test_storage_route_is_private_read_only_and_does_not_use_other_services(tmp_path):
    forbidden = Mock()
    forbidden.health.side_effect = AssertionError('model must not be called')
    forbidden.contains.side_effect = AssertionError('vault must not be called')
    token = 'synthetic-session-' + 's' * 32
    app = create_app(Settings(tmp_path, token), model_provider=forbidden,
                     secret_store=forbidden, provider_connection=forbidden, search_provider=forbidden)
    with TestClient(app) as client:
        before = {p.name: p.read_bytes() for p in tmp_path.iterdir()}
        assert client.get('/api/v1/setup/storage').status_code == 401
        assert client.get('/api/v1/setup/storage', headers={'Authorization': 'Bearer wrong'}).status_code == 401
        headers = {'Authorization': f'Bearer {token}'}
        result = client.get('/api/v1/setup/storage', headers=headers)
        assert result.status_code == 200
        assert result.headers['cache-control'] == 'no-store'
        assert set(result.json()) == {'folder', 'free_bytes'}
        assert result.json()['folder'] == str(tmp_path.absolute())
        assert isinstance(result.json()['free_bytes'], int)
        assert result.json()['free_bytes'] >= 0
        assert client.get('/api/v1/setup/storage?path=unrelated', headers=headers).status_code == 422
        assert client.post('/api/v1/setup/storage', headers=headers).status_code == 405
        assert {p.name: p.read_bytes() for p in tmp_path.iterdir()} == before
        assert forbidden.mock_calls == []


@pytest.mark.parametrize('available, expected', [(0, 0), (123456789, 123456789), (-1, None), (True, None), (2**53, None)])
def test_space_is_bounded_and_zero_is_not_unknown(tmp_path, monkeypatch, available, expected):
    probe = Mock(return_value=SimpleNamespace(free=available))
    monkeypatch.setattr('jobscout_engine.setup_storage.shutil.disk_usage', probe)
    assert inspect_storage(tmp_path)['free_bytes'] == expected
    probe.assert_called_once_with(tmp_path)


def test_unavailable_drive_does_not_leak_errors_or_use_parent(tmp_path, monkeypatch):
    probe = Mock(side_effect=OSError('PRIVATE diagnostic'))
    monkeypatch.setattr('jobscout_engine.setup_storage.shutil.disk_usage', probe)
    result = inspect_storage(tmp_path)
    assert result == {'folder': str(tmp_path.absolute()), 'free_bytes': None}
    assert 'PRIVATE' not in str(result)
    probe.reset_mock()
    missing = tmp_path / 'missing'
    assert inspect_storage(missing) == {'folder': str(missing.absolute()), 'free_bytes': None}
    probe.assert_not_called()
    assert not missing.exists()


def test_invalid_display_folder_is_not_returned(tmp_path):
    assert inspect_storage(tmp_path / 'invalid\nfolder') == {'folder': None, 'free_bytes': None}
