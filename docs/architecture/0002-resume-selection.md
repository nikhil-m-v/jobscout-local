# 0002 — Local resume selection boundary

Status: accepted for the first resume-import slice.

The My profile picker accepts one PDF or DOCX up to 10 MiB. It checks the final filename extension, file size, and any specific MIME type reported by the operating system. Missing or generic MIME data is allowed because Windows and browser file pickers do not always provide a specific type. This is immediate UI guidance, not proof that the bytes are safe or parseable.

The selected `File` is never read or retained by this slice. React keeps only the filename, size, and format in memory, and clears them when the user removes the selection or closes the app. Navigation keeps the metadata during the current session. A rejected replacement keeps the prior selection. The filename is rendered as plain text and may contain personal information, so it must not be logged, sent to a provider, or persisted without an explicit import action.

The next local engine parser must validate bytes, format structure, and resource limits before extraction. It must not fetch embedded URLs or external document resources. Extracted text remains local and should be shown for review before persistence. Oversized, empty, corrupt, encrypted, and scanned documents need distinct recoverable guidance. No parsing, OCR, or saved profile is implied by the picker.


## Extraction implementation

PDF extraction accepts at most 10 pages (reduced from 50 on 2026-10-01), enforced by the engine before text extraction. Picker guidance and the recoverable page-limit error show the same limit. DOCX pagination is not reliably available; its size/text/complexity bounds still apply.

Explicit extraction sends file bytes only to the authenticated loopback engine, without the filename. PDF and DOCX use the same disposable worker, memory limit, cancellation, and timeout. Neither files nor extracted text are persisted. The selection now retains the browser File in memory so users can explicitly extract or retry it.

DOCX uses Python's standard-library ZIP/XML reader without adding a dependency. It reads only word/document.xml, rejects duplicate package entries, encrypted entries and DTD/entity declarations, and bounds package count, expanded size, document XML, and extracted text. It never follows relationships or opens external resources. Body paragraphs, including table-cell paragraphs, retain document order. Headers, footers, images and embedded documents are omitted; users must review the original for missing details. DOCX returns no page count because OOXML does not reliably determine rendered pagination.
