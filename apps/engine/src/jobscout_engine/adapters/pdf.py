from io import BytesIO
import logging
import warnings

from pypdf import Configuration, PdfReader, apply_configuration
from pypdf.errors import DependencyError, LimitReachedError
from jobscout_engine.domain.documents import (
    ExtractedDocument, ImportFailure, MAX_DOCUMENT_BYTES, MAX_PAGES, MAX_TEXT_CHARACTERS,
)

MAX_STREAM_BYTES = 4 * 1024 * 1024
PDF_CONFIGURATION = Configuration(
    maximum_declared_stream_length=MAX_STREAM_BYTES,
    array_based_stream_maximum_output_length=MAX_STREAM_BYTES,
    zlib_maximum_output_length=MAX_STREAM_BYTES,
    lzw_maximum_output_length=MAX_STREAM_BYTES,
    run_length_maximum_output_length=MAX_STREAM_BYTES,
    image_maximum_buffer_size=MAX_STREAM_BYTES,
    page_tree_maximum_entries=5_000,
    xform_maximum_invocations_per_extraction=100,
    jbig2dec_binary=None,  # Never launch an external decoder or create its temp files.
    disable_legacy_handling=True,
)


class PdfParser:
    def extract(self, data: bytes) -> ExtractedDocument:
        if not data:
            raise ImportFailure("empty_file")
        if len(data) > MAX_DOCUMENT_BYTES:
            raise ImportFailure("too_large")
        if not data.startswith(b"%PDF-"):
            raise ImportFailure("invalid_pdf")
        # Parser diagnostics can contain document content. This adapter runs in
        # its own process so disabling diagnostics cannot affect the engine.
        previous_logging = logging.root.manager.disable
        logging.disable(logging.CRITICAL)
        try:
            with warnings.catch_warnings(), apply_configuration(PDF_CONFIGURATION):
                warnings.simplefilter("ignore")
                reader = PdfReader(BytesIO(data), strict=True)
                if reader.is_encrypted:
                    raise ImportFailure("encrypted_pdf")
                count = len(reader.pages)
                if count == 0:
                    raise ImportFailure("no_pages")
                if count > MAX_PAGES:
                    raise ImportFailure("too_many_pages")
                pages: list[str] = []
                empty: list[int] = []
                total = 0
                for number, page in enumerate(reader.pages, 1):
                    content = page.get_contents()
                    if content is not None and len(content.get_data()) > MAX_STREAM_BYTES:
                        raise ImportFailure("complex_pdf")
                    text = (page.extract_text() or "").replace("\x00", "").strip()
                    total += len(text) + 2
                    if total > MAX_TEXT_CHARACTERS:
                        raise ImportFailure("too_much_text")
                    if not text:
                        empty.append(number)
                    pages.append(text)
                if len(empty) == count:
                    raise ImportFailure("no_text")
                return ExtractedDocument("\n\n".join(pages).strip(), count, empty)
        except ImportFailure:
            raise
        except (MemoryError, LimitReachedError, DependencyError):
            raise ImportFailure("complex_pdf") from None
        except Exception:
            raise ImportFailure("invalid_pdf") from None
        finally:
            logging.disable(previous_logging)
