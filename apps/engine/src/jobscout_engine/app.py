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
from jobscout_engine.config import Settings
from jobscout_engine.domain.contracts import EngineHealth, ModelProvider
from jobscout_engine.storage import Database
from jobscout_engine.domain.documents import ImportFailure, MAX_DOCUMENT_BYTES, MAX_TEXT_CHARACTERS
from jobscout_engine.imports import ImportService


def create_app(settings: Settings, model_provider: ModelProvider | None = None,
               import_service: ImportService | None = None) -> FastAPI:
    database = Database(settings.data_dir)
    provider = model_provider or OllamaProvider(settings.ollama_url)
    bearer = HTTPBearer(auto_error=False)
    imports = import_service or ImportService()

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

