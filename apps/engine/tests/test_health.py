from fastapi.testclient import TestClient
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.domain.contracts import ModelStatus


class OfflineModel:
    async def health(self) -> ModelStatus:
        return ModelStatus(provider="ollama", status="unavailable")


def test_engine_requires_session_and_works_without_a_model(tmp_path):
    token = "test-session-token-" + "a" * 32
    settings = Settings(data_dir=tmp_path, session_token=token)
    with TestClient(create_app(settings, OfflineModel())) as client:
        assert client.get("/api/v1/health").status_code == 401
        assert client.get(
            "/api/v1/health", headers={"Authorization": "Bearer wrong"}
        ).status_code == 401
        response = client.get(
            "/api/v1/health", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["database"] == "ready"
        assert response.json()["local_ai"]["status"] == "unavailable"
        assert "session_token" not in response.text
    assert (tmp_path / "jobscout.db").exists()
    # A second startup must preserve and accept the existing schema.
    with TestClient(create_app(settings, OfflineModel())) as client:
        assert client.get(
            "/api/v1/health", headers={"Authorization": f"Bearer {token}"}
        ).json()["database"] == "ready"

