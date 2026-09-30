import sqlite3
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from test_health import OfflineModel

HEADERS = {"Authorization": "Bearer synthetic-token"}

def app(path):
    return create_app(Settings(data_dir=path, session_token="synthetic-token"), OfflineModel())

def test_restart_replacement_and_deletion_remove_owned_text(tmp_path):
    original = "SYNTHETIC_PRIVATE_ORIGINAL_92847 " * 2000
    replacement = "SYNTHETIC_REVIEWED_REPLACEMENT_65849"
    with TestClient(app(tmp_path)) as client:
        assert client.get("/api/v1/profile", headers=HEADERS).json() == {"profile": None}
        response = client.put("/api/v1/profile", headers=HEADERS, json={"text": original, "reviewed": True})
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
    with TestClient(app(tmp_path)) as client:
        assert client.get("/api/v1/profile", headers=HEADERS).json()["profile"]["text"] == original
        response = client.put("/api/v1/profile", headers=HEADERS, json={"text": replacement, "reviewed": True})
        assert response.json()["profile"]["text"] == replacement
    for file in tmp_path.iterdir():
        if file.is_file():
            assert b"SYNTHETIC_PRIVATE_ORIGINAL_92847" not in file.read_bytes()
    with TestClient(app(tmp_path)) as client:
        assert client.get("/api/v1/profile", headers=HEADERS).json()["profile"]["text"] == replacement
        response = client.delete("/api/v1/profile", headers=HEADERS)
        assert response.json() == {"deleted": True}
        assert response.headers["cache-control"] == "no-store"
        assert client.delete("/api/v1/profile", headers=HEADERS).status_code == 200
    with TestClient(app(tmp_path)) as client:
        assert client.get("/api/v1/profile", headers=HEADERS).json() == {"profile": None}
    for file in tmp_path.iterdir():
        if file.is_file():
            assert replacement.encode() not in file.read_bytes()
    assert not list(tmp_path.glob("*-wal"))
    assert not list(tmp_path.glob("*-journal"))

@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_profile_requires_session(tmp_path, method):
    with TestClient(app(tmp_path)) as client:
        response = getattr(client, method)("/api/v1/profile")
        assert response.status_code == 401

@pytest.mark.parametrize("payload", [
    {"text": "SYNTHETIC_PRIVATE", "reviewed": False},
    {"text": "SYNTHETIC_PRIVATE"},
    {"text": "SYNTHETIC_PRIVATE", "reviewed": True, "filename": "SYNTHETIC_PRIVATE"},
    {"text": "  ", "reviewed": True},
    {"text": "x" * 200001, "reviewed": True},
    {"text": "SYNTHETIC_PRIVATE\u0000", "reviewed": True},
    {"text": "\ud800", "reviewed": True},
    {"text": ["SYNTHETIC_PRIVATE"], "reviewed": True},
])
def test_validation_does_not_echo_or_change_saved_profile(tmp_path, payload):
    import json
    with TestClient(app(tmp_path)) as client:
        client.put("/api/v1/profile", headers=HEADERS, json={"text": "kept", "reviewed": True})
        response = client.put("/api/v1/profile", headers={**HEADERS, "Content-Type": "application/json"}, content=json.dumps(payload))
        assert response.status_code == 422
        assert response.json() == {"error": "invalid_review"}
        assert client.get("/api/v1/profile", headers=HEADERS).json()["profile"]["text"] == "kept"

def test_oversized_and_malformed_uploads(tmp_path):
    with TestClient(app(tmp_path)) as client:
        for content in (b"x" * 1200129, b'{"text": "SYNTHETIC_PRIVATE",'):
            response = client.put("/api/v1/profile", headers={**HEADERS, "Content-Type": "application/json"}, content=content)
            assert response.status_code == 422
            assert response.json() == {"error": "invalid_review"}

def test_storage_failure_is_fixed_and_recoverable(tmp_path, monkeypatch):
    from jobscout_engine.storage import Database
    def fail(*args):
        raise sqlite3.OperationalError("SYNTHETIC_PRIVATE_DATABASE_PATH")
    with TestClient(app(tmp_path)) as client:
        monkeypatch.setattr(Database, "save_profile", fail)
        response = client.put("/api/v1/profile", headers=HEADERS, json={"text": "SYNTHETIC_PRIVATE", "reviewed": True})
        assert response.status_code == 503
        assert response.json() == {"error": "storage_unavailable"}
        monkeypatch.setattr(Database, "delete_profile", fail)
        assert client.delete("/api/v1/profile", headers=HEADERS).json() == {"error": "storage_unavailable"}
