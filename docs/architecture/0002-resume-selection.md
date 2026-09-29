# 0002 — Local resume selection boundary

Status: accepted for the first resume-import slice.

The My profile picker accepts one PDF or DOCX up to 10 MiB. It checks the final filename extension, file size, and any specific MIME type reported by the operating system. Missing or generic MIME data is allowed because Windows and browser file pickers do not always provide a specific type. This is immediate UI guidance, not proof that the bytes are safe or parseable.

The selected `File` is never read or retained by this slice. React keeps only the filename, size, and format in memory, and clears them when the user removes the selection or closes the app. Navigation keeps the metadata during the current session. A rejected replacement keeps the prior selection. The filename is rendered as plain text and may contain personal information, so it must not be logged, sent to a provider, or persisted without an explicit import action.

The next local engine parser must validate bytes, format structure, and resource limits before extraction. It must not fetch embedded URLs or external document resources. Extracted text remains local and should be shown for review before persistence. Oversized, empty, corrupt, encrypted, and scanned documents need distinct recoverable guidance. No parsing, OCR, or saved profile is implied by the picker.
