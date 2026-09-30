"""Bounded in-memory OOXML extraction; relationships and embedded resources are never opened."""
from io import BytesIO
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree as ET
from jobscout_engine.domain.documents import ExtractedDocument, ImportFailure, MAX_DOCUMENT_BYTES, MAX_TEXT_CHARACTERS

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MAX_EXPANDED_BYTES = 16 * 1024 * 1024
MAX_XML_BYTES = 4 * 1024 * 1024

class DocxParser:
    def extract(self, data: bytes) -> ExtractedDocument:
        if not data:
            raise ImportFailure("empty_file")
        if len(data) > MAX_DOCUMENT_BYTES:
            raise ImportFailure("too_large")
        try:
            with ZipFile(BytesIO(data)) as archive:
                entries = archive.infolist()
                names = [entry.filename for entry in entries]
                if len(entries) > 1000 or sum(e.file_size for e in entries) > MAX_EXPANDED_BYTES:
                    raise ImportFailure("complex_docx")
                if len(names) != len(set(names)) or "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise ImportFailure("invalid_docx")
                if any(e.flag_bits & 1 for e in entries):
                    raise ImportFailure("encrypted_docx")
                entry = archive.getinfo("word/document.xml")
                if entry.file_size > MAX_XML_BYTES:
                    raise ImportFailure("complex_docx")
                with archive.open(entry) as stream:
                    xml = stream.read(MAX_XML_BYTES + 1)
                if len(xml) > MAX_XML_BYTES:
                    raise ImportFailure("complex_docx")
                # Reject DTDs/entities, including UTF-16/32 spellings, before XML parsing.
                probe = xml.replace(b"\x00", b"").upper()
                if b"<!DOCTYPE" in probe or b"<!ENTITY" in probe:
                    raise ImportFailure("invalid_docx")
                root = ET.fromstring(xml)
                if root.tag != W + "document":
                    raise ImportFailure("invalid_docx")
                body = root.find(W + "body")
                if body is None:
                    raise ImportFailure("invalid_docx")
                paragraphs = []
                total = 0
                for paragraph in body.iter(W + "p"):
                    parts = []
                    for node in paragraph.iter():
                        if node.tag == W + "t":
                            parts.append(node.text or "")
                        elif node.tag == W + "tab":
                            parts.append("\t")
                        elif node.tag in (W + "br", W + "cr"):
                            parts.append("\n")
                    text = "".join(parts).strip()
                    total += len(text) + 2
                    if total > MAX_TEXT_CHARACTERS:
                        raise ImportFailure("too_much_text")
                    if text:
                        paragraphs.append(text)
                if not paragraphs:
                    raise ImportFailure("no_docx_text")
                return ExtractedDocument("\n\n".join(paragraphs), None, [])
        except ImportFailure:
            raise
        except MemoryError:
            raise ImportFailure("complex_docx") from None
        except (BadZipFile, ET.ParseError, KeyError, ValueError, OSError, RuntimeError, NotImplementedError):
            raise ImportFailure("invalid_docx") from None
