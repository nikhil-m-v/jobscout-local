from dataclasses import dataclass
from typing import Protocol

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_TEXT_CHARACTERS = 200_000
MAX_PAGES = 50


class ImportFailure(Exception):
    """Only fixed codes cross the parser boundary; never exception/document text."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


@dataclass
class ExtractedDocument:
    text: str
    page_count: int
    empty_pages: list[int]


class DocumentParser(Protocol):
    def extract(self, data: bytes) -> ExtractedDocument: ...
