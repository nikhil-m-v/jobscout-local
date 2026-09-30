from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
import socket
import pytest
from fastapi.testclient import TestClient
from jobscout_engine.adapters.docx import DocxParser
from jobscout_engine.domain.documents import ImportFailure
from jobscout_engine.app import create_app
from jobscout_engine.config import Settings
from test_health import OfflineModel

def make_docx(body, extra=None):
    out = BytesIO()
    with ZipFile(out, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", body)
        for name, value in (extra or {}).items():
            archive.writestr(name, value)
    return out.getvalue()

def document(body):
    return '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>'

def test_body_tables_and_external_content_are_local(monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("Document extraction must not use network")
    monkeypatch.setattr(socket, "socket", forbidden)
    data = make_docx(document('<w:p><w:r><w:t>SYNTHETIC</w:t><w:tab/><w:t>ROLE</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table skill</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:altChunk/>'), {"word/_rels/document.xml.rels": '<Relationships><Relationship Target="https://example.invalid/private" TargetMode="External"/></Relationships>'})
    result = DocxParser().extract(data)
    assert result.text == "SYNTHETIC\tROLE\n\nTable skill"
    assert result.page_count is None and result.empty_pages == []

@pytest.mark.parametrize("data,code", [(b"", "empty_file"), (b"invalid", "invalid_docx"), (make_docx(document("")), "no_docx_text"), (make_docx('<!DOCTYPE x [<!ENTITY x "secret">]>' + document("")), "invalid_docx"), (make_docx(document('<w:p><w:r><w:t>' + 'x'*200001 + '</w:t></w:r></w:p>')), "too_much_text"), (make_docx(document("") + ' '* (4*1024*1024)), "complex_docx")])
def test_fixed_errors(data, code):
    with pytest.raises(ImportFailure, match=code):
        DocxParser().extract(data)

def test_authenticated_worker_api_without_persistence(tmp_path):
    settings = Settings(data_dir=tmp_path, session_token="test-token")
    with TestClient(create_app(settings, model_provider=OfflineModel())) as client:
        headers = {"Authorization": "Bearer test-token"}
        assert client.post("/api/v1/imports").status_code == 401
        task = client.post("/api/v1/imports", headers=headers).json()["id"]
        response = client.put(f"/api/v1/imports/{task}/docx", headers={**headers, "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}, content=make_docx(document('<w:p><w:r><w:t>SYNTHETIC DOCX</w:t></w:r></w:p>')))
        assert response.status_code == 200
        assert response.json()["text"] == "SYNTHETIC DOCX"
        assert response.json()["page_count"] is None
        assert response.headers["cache-control"] == "no-store"
    for file in tmp_path.rglob("*"):
        if file.is_file():
            assert b"SYNTHETIC DOCX" not in file.read_bytes()


def test_archive_expansion_limit():
    data = make_docx(document(""), {"word/media/large.bin": b"x" * (16 * 1024 * 1024)})
    with pytest.raises(ImportFailure, match="complex_docx"):
        DocxParser().extract(data)

def test_utf16_entity_declaration_is_rejected():
    xml = ('<?xml version="1.0" encoding="utf-16"?><!DOCTYPE x [<!ENTITY x "secret">]>' + document("" )).encode("utf-16")
    with pytest.raises(ImportFailure, match="invalid_docx"):
        DocxParser().extract(make_docx(xml))
