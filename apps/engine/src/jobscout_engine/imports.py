import asyncio
from functools import partial
from dataclasses import asdict, dataclass, field
import multiprocessing
from multiprocessing.connection import Connection
import os
import threading
import time
from uuid import UUID, uuid4

from starlette.concurrency import run_in_threadpool
from jobscout_engine.domain.documents import ImportFailure

PARSER_TIMEOUT_SECONDS = 20
RESERVATION_SECONDS = 60


def watch_parent() -> None:
    from multiprocessing.connection import wait
    parent = multiprocessing.parent_process()
    if parent is not None:
        # Tauri may terminate its engine sidecar abruptly on exit. A child must
        # not outlive it, even if parsing never returns to Python code.
        wait([parent.sentinel], timeout=PARSER_TIMEOUT_SECONDS + 5)
        os._exit(1)


def parse_worker(connection: Connection, data: bytes, format: str = "pdf") -> None:
    from jobscout_engine.worker_limits import limit_memory
    try:
        threading.Thread(target=watch_parent, daemon=True).start()
        memory_guard = limit_memory()
        from jobscout_engine.adapters.pdf import PdfParser
        from jobscout_engine.adapters.docx import DocxParser
        parser = DocxParser() if format == "docx" else PdfParser()
        result = {"result": asdict(parser.extract(data))}
    except ImportFailure as error:
        result = {"error": error.code}
    except BaseException:
        result = {"error": "worker_unavailable"}
    try:
        connection.send(result)
    finally:
        connection.close()


@dataclass
class ImportTask:
    id: UUID = field(default_factory=uuid4)
    created: float = field(default_factory=time.monotonic)
    cancelled: asyncio.Event = field(default_factory=asyncio.Event)
    running: bool = False


class ImportService:
    """One bounded import at a time; no file or extraction is persisted."""

    def __init__(self, timeout: float = PARSER_TIMEOUT_SECONDS, worker=parse_worker):
        self.task: ImportTask | None = None
        self.timeout = timeout
        self.worker = worker

    def reserve(self) -> ImportTask:
        if self.task and (self.task.running or time.monotonic() - self.task.created < RESERVATION_SECONDS):
            raise ImportFailure("busy")
        self.task = ImportTask()
        return self.task

    def claim(self, task_id: UUID) -> ImportTask:
        task = self.task
        if task is None or task.id != task_id or time.monotonic() - task.created >= RESERVATION_SECONDS:
            raise ImportFailure("expired")
        if task.running:
            raise ImportFailure("busy")
        task.running = True
        return task

    def cancel(self, task_id: UUID) -> None:
        if self.task and self.task.id == task_id:
            self.task.cancelled.set()
            if not self.task.running:
                self.task = None

    def release(self, task: ImportTask) -> None:
        if self.task is task:
            self.task = None

    async def extract(self, data: bytes, task: ImportTask, disconnected, format: str = "pdf") -> dict:
        if task.cancelled.is_set():
            raise ImportFailure("cancelled")
        context = multiprocessing.get_context("spawn")
        receiver, sender = context.Pipe(duplex=False)
        process = context.Process(target=partial(parse_worker, format=format) if format == "docx" else self.worker, args=(sender, data), daemon=True)
        started = False
        try:
            # Spawn and pipe transfer may block on Windows; keep health/cancel responsive.
            await run_in_threadpool(process.start)
            started = True
            sender.close()
            deadline = time.monotonic() + self.timeout
            while True:
                if task.cancelled.is_set() or await disconnected():
                    raise ImportFailure("cancelled")
                if time.monotonic() >= deadline:
                    raise ImportFailure("timeout")
                if receiver.poll():
                    message = await run_in_threadpool(receiver.recv)
                    if "error" in message:
                        raise ImportFailure(message["error"])
                    return message["result"]
                if not process.is_alive():
                    raise ImportFailure("complex_docx" if format == "docx" else "complex_pdf")
                await asyncio.sleep(0.04)
        except (EOFError, OSError):
            raise ImportFailure("worker_unavailable") from None
        finally:
            if started:
                if process.is_alive():
                    process.terminate()
                await run_in_threadpool(process.join)
                process.close()
            receiver.close()
            sender.close()
