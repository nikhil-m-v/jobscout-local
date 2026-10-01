from contextlib import asynccontextmanager
import asyncio
import secrets
import json
import sqlite3
from uuid import UUID
from typing import Literal
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.requests import ClientDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool
from jobscout_engine import __version__
from jobscout_engine.adapters.ollama import OllamaProvider
from jobscout_engine.adapters.secrets import SecretStore, SecretStoreUnavailable, create_secret_store
from jobscout_engine.adapters.tavily import TavilyConnection, ProviderCheckFailure
from jobscout_engine.domain.providers import MAX_PROVIDER_BODY_BYTES, validate_tavily_key, provider_status
from jobscout_engine.config import Settings
from jobscout_engine.domain.contracts import EngineHealth, ModelProvider
from jobscout_engine.storage import Database
from jobscout_engine.domain.documents import ImportFailure, MAX_DOCUMENT_BYTES, MAX_TEXT_CHARACTERS
from jobscout_engine.imports import ImportService
from jobscout_engine.domain.search import (
    construct_public_query, reject_duplicate_keys, InvalidSearchCriteria,
    MAX_CRITERIA_BYTES, QUERY_VERSION,
)


def create_app(settings: Settings, model_provider: ModelProvider | None = None,
               import_service: ImportService | None = None,
               secret_store: SecretStore | None = None,
               provider_connection: TavilyConnection | None = None) -> FastAPI:
    database = Database(settings.data_dir)
    provider = model_provider or OllamaProvider(settings.ollama_url)
    bearer = HTTPBearer(auto_error=False)
    imports = import_service or ImportService()
    provider_secrets = secret_store if secret_store is not None else create_secret_store(settings.data_dir)
    secret_lock = asyncio.Lock()
    connection = provider_connection if provider_connection is not None else TavilyConnection()
    connection_lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await run_in_threadpool(database.initialize)
        yield
        if imports.task:
            imports.cancel(imports.task.id)

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

    @application.exception_handler(ImportFailure)
    async def import_error(_: Request, error: ImportFailure):
        status = 409 if error.code == "busy" else 413 if error.code == "too_large" else 422
        return JSONResponse({"error": error.code}, status_code=status,
                            headers={"Cache-Control": "no-store"})

    def profile_response(value, status=200):
        return JSONResponse(value, status_code=status, headers={"Cache-Control": "no-store"})

    @application.get("/api/v1/providers/tavily", dependencies=[Depends(require_session)])
    async def load_search_provider():
        try:
            async with secret_lock:
                saved = await run_in_threadpool(provider_secrets.contains)
            return profile_response(provider_status(saved))
        except SecretStoreUnavailable:
            return profile_response({"error": "secret_store_unavailable"}, 503)

    @application.put("/api/v1/providers/tavily", dependencies=[Depends(require_session)])
    async def save_search_provider(request: Request):
        async def read_key():
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > MAX_PROVIDER_BODY_BYTES:
                    raise ValueError()
                body.extend(chunk)
            return json.loads(body, object_pairs_hook=reject_duplicate_keys)
        try:
            if request.headers.get("content-type") != "application/json":
                raise ValueError()
            key = validate_tavily_key(await asyncio.wait_for(read_key(), timeout=5))
        except (ValueError, UnicodeError, RecursionError, asyncio.TimeoutError, ClientDisconnect):
            return profile_response({"error": "invalid_provider_key"}, 422)
        try:
            async with secret_lock:
                await run_in_threadpool(provider_secrets.save, key)
            return profile_response(provider_status(True))
        except SecretStoreUnavailable:
            return profile_response({"error": "secret_store_unavailable"}, 503)

    @application.delete("/api/v1/providers/tavily", dependencies=[Depends(require_session)])
    async def remove_search_provider():
        try:
            async with secret_lock:
                await run_in_threadpool(provider_secrets.delete)
            return profile_response(provider_status(False))
        except SecretStoreUnavailable:
            return profile_response({"error": "secret_store_unavailable"}, 503)

    @application.post("/api/v1/providers/tavily/check", dependencies=[Depends(require_session)])
    async def check_search_provider(request: Request):
        async def read_confirmation():
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > 256:
                    raise ValueError()
                body.extend(chunk)
            return json.loads(body, object_pairs_hook=reject_duplicate_keys)
        try:
            if request.headers.get("content-type") != "application/json":
                raise ValueError()
            value = await asyncio.wait_for(read_confirmation(), timeout=5)
            if not isinstance(value, dict) or set(value) != {"confirmed"} or value["confirmed"] is not True:
                raise ValueError()
        except (ValueError, UnicodeError, RecursionError, asyncio.TimeoutError, ClientDisconnect):
            return profile_response({"error": "provider_confirmation_required"}, 422)
        if connection_lock.locked():
            return profile_response({"error": "provider_check_busy"}, 409)
        try:
            async with connection_lock:
                async with secret_lock:
                    key = await run_in_threadpool(provider_secrets.read)
                if key is None:
                    return profile_response({"error": "provider_key_missing"}, 409)
                await connection.check(key)
            # Transient evidence only. No account details or verification persistence.
            return profile_response({"provider": "tavily", "connection_verified": True,
                                     "dispatch_available": False})
        except SecretStoreUnavailable:
            return profile_response({"error": "secret_store_unavailable"}, 503)
        except ProviderCheckFailure as error:
            return profile_response({"error": error.code}, 503)

    @application.post("/api/v1/search/preview", dependencies=[Depends(require_session)])
    async def preview_search(request: Request):
        # Local construction only. Never echo invalid input or retain query history.
        async def read_criteria():
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > MAX_CRITERIA_BYTES:
                    raise InvalidSearchCriteria()
                body.extend(chunk)
            return json.loads(body, object_pairs_hook=reject_duplicate_keys)

        try:
            if request.headers.get("content-type") != "application/json":
                raise InvalidSearchCriteria()
            value = await asyncio.wait_for(read_criteria(), timeout=5)
            query = construct_public_query(value)
        except (ValueError, UnicodeError, RecursionError, asyncio.TimeoutError, ClientDisconnect):
            return profile_response({"error": "invalid_search_criteria"}, 422)
        # Presence only: never read the key or contact a provider for a preview.
        configured_provider = None
        try:
            async with secret_lock:
                if await run_in_threadpool(provider_secrets.contains):
                    configured_provider = "tavily"
        except SecretStoreUnavailable:
            pass  # Local query construction remains usable without vault access.
        return profile_response({"query": query, "query_version": QUERY_VERSION,
                                 "provider": configured_provider, "dispatch_available": False})

    @application.get("/api/v1/profile", dependencies=[Depends(require_session)])
    async def load_profile():
        try:
            return profile_response({"profile": await run_in_threadpool(database.load_profile)})
        except sqlite3.Error:
            return profile_response({"error": "storage_unavailable"}, 503)

    @application.put("/api/v1/profile", dependencies=[Depends(require_session)])
    async def save_profile(request: Request):
        # Parse manually so validation responses never echo private input.
        async def read_review():
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > 1_200_128:
                    raise ValueError()
                body.extend(chunk)
            return json.loads(body)
        try:
            if request.headers.get("content-type") != "application/json":
                raise ValueError()
            value = await asyncio.wait_for(read_review(), timeout=10)
            if (not isinstance(value, dict) or set(value) != {"text", "reviewed"}
                or value["reviewed"] is not True or not isinstance(value["text"], str)
                or not value["text"].strip() or len(value["text"]) > MAX_TEXT_CHARACTERS
                or "\x00" in value["text"]):
                raise ValueError()
            # Reject unpaired surrogates before passing text to SQLite.
            value["text"].encode("utf-8")
        except (ValueError, UnicodeError, RecursionError, asyncio.TimeoutError, ClientDisconnect):
            return profile_response({"error": "invalid_review"}, 422)
        try:
            return profile_response({"profile": await run_in_threadpool(database.save_profile, value["text"])})
        except sqlite3.Error:
            return profile_response({"error": "storage_unavailable"}, 503)

    @application.delete("/api/v1/profile", dependencies=[Depends(require_session)])
    async def delete_profile():
        try:
            await run_in_threadpool(database.delete_profile)
            return profile_response({"deleted": True})
        except sqlite3.Error:
            return profile_response({"error": "storage_unavailable"}, 503)

    @application.post("/api/v1/imports", dependencies=[Depends(require_session)])
    async def reserve_import():
        return JSONResponse({"id": str(imports.reserve().id)}, headers={"Cache-Control": "no-store"})

    @application.delete("/api/v1/imports/{task_id}", dependencies=[Depends(require_session)])
    async def cancel_import(task_id: UUID):
        imports.cancel(task_id)
        return JSONResponse({"cancelled": True}, headers={"Cache-Control": "no-store"})

    @application.put("/api/v1/imports/{task_id}/{format}", dependencies=[Depends(require_session)])
    async def extract_document(task_id: UUID, format: Literal["pdf", "docx"], request: Request):
        task = imports.claim(task_id)
        try:
            if request.headers.get("content-type") != ("application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document") :
                raise ImportFailure("invalid_pdf" if format == "pdf" else "invalid_docx")
            length = request.headers.get("content-length")
            if length and (not length.isdecimal() or len(length) > 8 or int(length) > MAX_DOCUMENT_BYTES):
                raise ImportFailure("too_large")

            async def read_document():
                data = bytearray()
                async for chunk in request.stream():
                    if task.cancelled.is_set():
                        raise ImportFailure("cancelled")
                    if len(data) + len(chunk) > MAX_DOCUMENT_BYTES:
                        raise ImportFailure("too_large")
                    data.extend(chunk)
                return bytes(data)

            read_task = asyncio.create_task(read_document())
            cancel_task = asyncio.create_task(task.cancelled.wait())
            try:
                done, _ = await asyncio.wait({read_task, cancel_task}, timeout=20,
                                             return_when=asyncio.FIRST_COMPLETED)
                if cancel_task in done:
                    raise ImportFailure("cancelled")
                if read_task not in done:
                    raise ImportFailure("timeout")
                data = read_task.result()
            finally:
                for pending in (read_task, cancel_task):
                    pending.cancel()
                await asyncio.gather(read_task, cancel_task, return_exceptions=True)
            result = await imports.extract(data, task, request.is_disconnected, format)
            return JSONResponse(result, headers={"Cache-Control": "no-store"})
        except ClientDisconnect:
            raise ImportFailure("cancelled") from None
        finally:
            imports.release(task)

    return application

