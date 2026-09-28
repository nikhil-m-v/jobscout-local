from typing import Literal, Protocol
from pydantic import BaseModel


class ModelStatus(BaseModel):
    provider: str
    status: Literal["available", "unavailable", "error"]
    installed_models: int = 0


class ModelProvider(Protocol):
    async def health(self) -> ModelStatus: ...


class EngineHealth(BaseModel):
    status: Literal["ready"] = "ready"
    version: str
    database: Literal["ready", "error"]
    local_ai: ModelStatus

