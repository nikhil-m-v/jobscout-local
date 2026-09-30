import asyncio
import logging
import multiprocessing
import socket
import subprocess
import time

import pytest
from fastapi.testclient import TestClient
from jobscout_engine.adapters.pdf import PdfParser
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from jobscout_engine.domain.documents import ImportFailure, MAX_DOCUMENT_BYTES
from jobscout_engine.imports import ImportService
from pdf_fixtures import make_pdf
from test_health import OfflineModel


@pytest.fixture(autouse=True)
def restore_logging():
    previous = logging.root.manager.disable
    yield
    logging.disable(previous)


def test_pdf_text_and_page_warning_without_network(monkeypatch, capsys):
    def forbidden(*args, **kwargs):
        raise AssertionError("PDF extraction must not open network connections")
    monkeypatch.setattr(socket, "socket", forbidden)
    result = PdfParser().extract(make_pdf("SYNTHETIC MARKER\nhttps://example.invalid/tracker", pages=2, blank_last=True))
    assert result.text == "SYNTHETIC MARKER\nhttps://example.invalid/tracker"
    assert result.page_count == 2
    assert result.empty_pages == [2]
    assert capsys.readouterr() == ("", "")


def test_pdf_never_launches_external_decoder_or_creates_temp_files(monkeypatch):
    from pypdf import filters
    def forbidden(*args, **kwargs):
        pytest.fail("PDF extraction must not launch decoders or create temporary files")
    monkeypatch.setattr(subprocess, "run", forbidden)
    monkeypatch.setattr(filters, "TemporaryDirectory", forbidden)
    with pytest.raises(ImportFailure, match="complex_pdf"):
        PdfParser().extract(make_pdf(external_filter=True))


def test_compressed_stream_limit():
    data = make_pdf("x" * (4 * 1024 * 1024 + 1), compressed=True)
    assert len(data) < MAX_DOCUMENT_BYTES
    with pytest.raises(ImportFailure, match="complex_pdf"):
        PdfParser().extract(data)


@pytest.mark.parametrize(("data", "code"), [
    (b"", "empty_file"),
    (b"not a PDF", "invalid_pdf"),
    (b"%PDF-1.7\nSYNTHETIC PRIVATE MARKER", "invalid_pdf"),
    (b"%PDF-" + b"x" * MAX_DOCUMENT_BYTES, "too_large"),
    (make_pdf(encrypted=True), "encrypted_pdf"),
    (make_pdf(text=None), "no_text"),
    (make_pdf(pages=0), "no_pages"),
    (make_pdf(text=None, pages=51), "too_many_pages"),
    (make_pdf("x" * 200_001), "too_much_text"),
], ids=['empty', 'wrong-format', 'corrupt', 'oversized', 'encrypted', 'image-only', 'no-pages', 'page-limit', 'text-limit'])
def test_recoverable_errors_do_not_echo_documents(data, code, capsys):
    with pytest.raises(ImportFailure) as failure:
        PdfParser().extract(data)
    assert failure.value.code == code
    assert str(failure.value) == code
    assert capsys.readouterr() == ("", "")


def sleeping_worker(connection, data):
    time.sleep(30)


async def connected():
    return False


@pytest.mark.parametrize("cancel", [False, True])
def test_worker_timeout_and_cancel_release_process(cancel):
    async def scenario():
        service = ImportService(timeout=0.15 if not cancel else 10, worker=sleeping_worker)
        reserved = service.reserve()
        task = service.claim(reserved.id)
        before = {child.pid for child in multiprocessing.active_children()}
        work = asyncio.create_task(service.extract(b"synthetic", task, connected))
        if cancel:
            await asyncio.sleep(0.15)
            service.cancel(task.id)
        with pytest.raises(ImportFailure) as failure:
            await work
        assert failure.value.code == ("cancelled" if cancel else "timeout")
        assert {child.pid for child in multiprocessing.active_children()} == before
        service.release(task)
        assert service.reserve().id != task.id
    asyncio.run(scenario())


def test_reservation_expiry_and_cancellation():
    service = ImportService()
    first = service.reserve()
    with pytest.raises(ImportFailure, match="busy"):
        service.reserve()
    service.cancel(first.id)
    with pytest.raises(ImportFailure, match="expired"):
        service.claim(first.id)
    second = service.reserve()
    second.created -= 61
    assert service.reserve().id != second.id


def test_authenticated_api_extracts_in_worker_without_persisting(tmp_path):
    token = "synthetic-session-" + "a" * 32
    headers = {"Authorization": f"Bearer {token}"}
    settings = Settings(data_dir=tmp_path, session_token=token)
    with TestClient(create_app(settings, OfflineModel())) as client:
        assert client.post("/api/v1/imports").status_code == 401
        reserved = client.post("/api/v1/imports", headers=headers)
        assert reserved.headers["cache-control"] == "no-store"
        path = f'/api/v1/imports/{reserved.json()["id"]}'
        assert client.put(path + "/pdf", content=b"anything").status_code == 401
        assert client.delete(path).status_code == 401
        response = client.put(path + "/pdf", headers={**headers, "Content-Type": "application/pdf"},
                              content=make_pdf(compressed=True))
        assert response.status_code == 200, response.text
        assert "SYNTHETIC RESUME" in response.json()["text"]
        assert response.json()["page_count"] == 1
        assert response.headers["cache-control"] == "no-store"
        assert client.delete(path, headers=headers).status_code == 200
        assert client.get("/api/v1/health", headers=headers).status_code == 200
    for item in tmp_path.iterdir():
        assert item.name in {"jobscout.db", "jobscout.db-shm", "jobscout.db-wal"}
        assert b"SYNTHETIC RESUME" not in item.read_bytes()


@pytest.mark.parametrize(("content", "extra_headers", "code"), [
    (b"%PDF-invalid", {"Content-Type": "application/pdf"}, "invalid_pdf"),
    (b"text", {"Content-Type": "text/plain"}, "invalid_pdf"),
    (b"x" * (MAX_DOCUMENT_BYTES + 1), {"Content-Type": "application/pdf"}, "too_large"),
], ids=['corrupt', 'wrong-content-type', 'oversized'])
def test_api_rejects_invalid_input_and_allows_retry(tmp_path, content, extra_headers, code):
    token = "synthetic-session-" + "a" * 32
    headers = {"Authorization": f"Bearer {token}"}
    with TestClient(create_app(Settings(data_dir=tmp_path, session_token=token), OfflineModel())) as client:
        task_id = client.post("/api/v1/imports", headers=headers).json()["id"]
        response = client.put(f"/api/v1/imports/{task_id}/pdf", content=content, headers={**headers, **extra_headers})
        assert response.json() == {"error": code}
        assert response.status_code in (413, 422)
        assert client.post("/api/v1/imports", headers=headers).status_code == 200
