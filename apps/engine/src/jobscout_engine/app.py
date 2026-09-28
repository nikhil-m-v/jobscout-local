from contextlib import asynccontextmanager
import secrets
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool
from jobscout_engine import __version__
from jobscout_engine.adapters.ollama import OllamaProvider
from jobscout_engine.config import Settings
from jobscout_engine.domain.contracts import EngineHealth, ModelProvider
from jobscout_engine.storage import Database


def create_app(settings: Settings, model_provider: ModelProvider | None = None) -> FastAPI:
    database = Database(settings.data_dir)
    provider = model_provider or OllamaProvider(settings.ollama_url)
    bearer = HTTPBearer(auto_error=False)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await run_in_threadpool(database.initialize)
        yield

    application = FastAPI(
        title="JobScout local engine", version=__version__, lifespan=lifespan,
        docs_url=None, redoc_url=None, openapi_url=None,
    )

    async def require_session(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> None:
        if credentials is None or not secrets.compare_digest(
            credentials.credentials, settings.session_token
        ):
            raise HTTPException(status_code=401, detail="A valid app session is required.")

    @application.get(
        "/api/v1/health", response_model=EngineHealth, dependencies=[Depends(require_session)]
    )
    async def health() -> EngineHealth:
        storage_ready = await run_in_threadpool(database.is_ready)
        return EngineHealth(
            version=__version__, database="ready" if storage_ready else "error",
            local_ai=await provider.health(),
        )

    return application

