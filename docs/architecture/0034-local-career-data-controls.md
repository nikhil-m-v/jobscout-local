# 0034 — Reviewed local career-data deletion

Date: 2026-10-12. Status: implemented for current owned career records/session copies; native/installed acceptance remains owner 23.

## One coherent control

Settings → Your local data reviews counts for the saved profile, saved candidates and candidates with private notes. Keep my data is initially focused; cancellation preserves saved records and current drafts. Confirm deletion explicitly deletes all owned career records together and releases current-session copies. Existing per-profile/per-candidate removal remains available for narrower choices. No export, filesystem picker, arbitrary deletion path, network request or credential operation is introduced.

| Current data | Retention and deletion |
|---|---|
| Reviewed saved profile | One SQLite row; individual profile deletion keeps jobs/notes, while the combined control removes both tables |
| Saved candidate snapshots, stages and notes | Up to 200 SQLite records; per-candidate removal deletes its snapshot/stage/notes, and the combined control removes all |
| Selected resume/file reference, extracted document, edited/reviewed text | Session-only frontend references; confirmed combined deletion remounts the workflow and aborts/releases the import hook |
| Tracker drafts, reviewed public query, discovery results, local assessments and selected filters | Session-only hook/component state; confirmed combined deletion remounts the workflow and invalidates late analysis/discovery responses |
| Engine import/analysis/search content | Request/worker-local memory, no career-content disk cache; the operation boundary rejects deletion while mutating/import/search/analysis requests are active and rejects overlapping new operations during deletion |
| Provider credential | Separate OS-vault record, retained; remove explicitly in Online discovery, including before uninstall if desired |
| Appearance/accessibility choices | Display-only browser/webview storage, retained |
| Original resume files and external backups/provider records | Outside JobScout ownership, retained |
| Optional embeddings, indexes, model downloads/history | Not implemented by the current runtime; future implementations must extend inventory, retention and deletion checks before activation |
| Shared Ollama runtime/models, packaged binaries/extraction and developer build caches | No career-data deletion target; no shared-model or arbitrary directory removal |

Current production data-bearing writes are owned by `Database`. Parsers use bounded worker memory and do not persist imported documents or extracted text; online candidates/assessments are transient until explicitly saved. Engine discovery retains bounded UUID cancellation/replay accounting and progress counts, not returned candidate content. Retain replay protection when deleting career records. No durable query history or derived career index exists to delete. Future retention cannot rely on this inventory unchanged.

## Engine review and atomic deletion

Authenticated fixed local GET `/api/v1/data` returns counts and an opaque session-bound review token, never raw profile/snapshot/note content. The token is an HMAC of the exact current rows under the engine session secret; it is transient and not logged. DELETE accepts only token and true confirmation, with a 1,024-byte streamed-body cap, duplicate-field rejection and five-second read timeout. Native transport and the restrictive development proxy expose only the fixed route. No provider, vault, model or result-page access is permitted.

Storage uses a serialized SQLite transaction to compare the reviewed state and delete both tables atomically. Changed records or a different engine session require a fresh review; no expanded deletion is silently authorized. SQLite secure-delete and the existing DELETE journal mode remove owned record bytes under normal transaction completion. Rollback preserves both tables if any operation fails; handles close. Schema markers and database readiness remain. No new schema/dependency/setup/model/version change.

An engine request boundary counts active profile/job/import/search/analysis mutations before their body handling. Deletion rejects active operations; new ones receive a fixed busy error while deletion runs. Reads remain possible. New deliberate saves after completed deletion may create new records; this is not a permanent erasure policy. Fixed errors and no-store responses avoid raw diagnostics/content echoes.

## Session clearing and failure semantics

Confirmation first remounts the frontend workflow: profile/job hook views, tracker drafts, imported file/document/text, reviewed query, results, local assessments and filter state are released. The data-control state persists across this remount so progress/recovery remain visible in Settings. Existing import/analysis/discovery cleanup invalidates late replies. While deleting or uncertain, career controls/navigation and provider setup are disabled; appearance and workspace connection recovery remain usable.

The UI waits for validated acknowledgement before claiming disk deletion. A lost/malformed/error response clears the session but leaves disk outcome unknown, as disclosed before confirmation. Review remaining local data performs a read, never a write retry. A changed connection invalidates review/late deletion acknowledgements; reconnection does not repeat a deletion. A fresh count review unlocks work and offers a new explicit choice. Cancellation restores the review control; completion/uncertainty focuses Your local data. This promises logical release of app references, not physical zeroing of managed memory or secure disk erasure.

## Setup, retention and evidence

Existing installation/uninstall retention is unchanged: local records and credentials remain unless explicitly removed; original files, backups and shared models are outside this operation. Settings states these limits and the lack of automatic encryption. No migration or wizard/download change is required. Rebuild/restart frontend, engine and native bridge together for the new command; native/installed interaction and fresh-user/upgrade checks remain milestone 23.

See [dated progress](../progress/2026-10-12.md) for atomic restart/byte-removal/rollback, changed-review/session binding, overlapping-operation and no-external-service tests; frontend acknowledgement/reconnect/safe disclosure tests; and synthetic browser cancellation, saved/unsaved-copy clearing, reload and compact-theme evidence. These do not prove installed/native deletion or secure erasure.

Next: 21 — representative search-quality review. Use independently reviewed cases and existing offline evidence first; additional live/provider/page requests require a fresh exact reviewed plan.
