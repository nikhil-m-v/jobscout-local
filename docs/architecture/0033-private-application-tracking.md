# 0033 — Private application stages and notes

Date: 2026-10-12. Status: implemented; native/installed interaction remains milestone 23.

## Behavior and boundary

Extend [saved candidate snapshots](0032-bounded-local-job-snapshots.md) with one user-recorded stage: Saved, Applied or Interview, and optional private notes. Stages are reversible labels, not verified employer outcomes. Changing them never applies, submits a form, contacts an employer or opens a result page. No provider, vault, model or outbound-search access is added. Snapshot content, source/retrieval/save timestamps and candidate identity stay unchanged. Same-link saves preserve tracking as well as the first snapshot.

Notes are bounded to 4,000 characters, rendered as escaped plain text, and never included in query criteria, match evidence, diagnostics or browser storage. The frontend uses a conservative 4,000 UTF-16-unit editing limit; engine validation also rejects unsupported control characters and invalid Unicode. No attachment, HTML rendering, history, scheduling or inferred stage is introduced. The existing 200-record limit bounds total retention.

## Persistence and update contract

SQLite initialization additively introduces `stage`, `notes` and `revision` columns and schema marker 3. Existing records default to Saved, empty notes and revision zero. Repeat initialization preserves existing profile/snapshot/tracking data. No new dependency, setup, secret, model, storage location or application-version change. Rebuild the paired frontend/engine/native bridge. Installed upgrade and downgrade compatibility are not established by synthetic migration tests.

An explicit session-authenticated PATCH to the fixed local candidate UUID route accepts only stage, notes, current revision and confirmation, with a 50,000-byte streamed-body limit and five-second read timeout. SQLite work runs in the existing thread pool. A serialized transaction checks the revision before updating both fields and incrementing it. Conflicting writers return a fixed conflict; removed records return missing and cannot be recreated by tracking. Errors never echo notes, request input or storage diagnostics. Responses use no-store. Native transport and the existing restrictive development proxy expose this same route.

## Interaction and recovery

Saved jobs displays the stored stage and notes. Edit stage and notes opens a labeled stage selector and notes field. Save changes waits for validated acknowledgement; Discard draft is explicit. Unsaved drafts stay in the in-memory hook during navigation and disappear on close/reload, as disclosed beside the editor. They never enter browser local storage. Confirmed removal also discards that candidate's draft and deletes its stage and notes.

Uncertain saves retain the last loaded record and the draft, disable further writes and require reload. Reconnection queues a read without repeating a write. If the loaded revision differs from the draft, show the latest saved details and require discarding the stale draft before editing again. A successful update preserves list order; keyboard focus returns to the Saved jobs heading. Existing removal cancellation retains the copy and restores its control's focus. Controls use semantic colors, visible focus and responsive opaque surfaces in both themes.

## Retention and evidence

Clearing results, deleting/replacing the profile or removing a provider key retains tracker records. Existing uninstall data retention applies. Clearing notes or confirmed candidate removal uses SQLite secure-delete and the existing DELETE journal mode; synthetic checks verify distinctive note bytes are absent from app-owned files. This is not encryption, secure disk erasure or backup removal. Broader data controls remain milestone 20.

See [dated progress](../progress/2026-10-12.md) for restart, upgrade, validation, concurrency/rollback, no-external-service, uncertain-write/reconnect, safe rendering and synthetic browser evidence. Browser reload is not a native restart; packaging is not installed acceptance. Native/installed tracking, genuine installed upgrade and workload resources remain owner 23; representative quality remains owner 21. Next: 20 — privacy and data controls.
