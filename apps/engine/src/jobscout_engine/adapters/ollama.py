import httpx
from jobscout_engine.domain.contracts import ModelStatus


class OllamaProvider:
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def health(self) -> ModelStatus:
        try:
            async with httpx.AsyncClient(timeout=1.2, trust_env=False) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                models = response.json()["models"]
                if not isinstance(models, list):
                    raise ValueError("Invalid model list")
            return ModelStatus(
                provider="ollama", status="available", installed_models=len(models)
            )
        except (httpx.ConnectError, httpx.TimeoutException):
            return ModelStatus(provider="ollama", status="unavailable")
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return ModelStatus(provider="ollama", status="error")

