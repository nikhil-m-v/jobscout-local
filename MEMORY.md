# JobScout — resume here

Last checkpoint: 2026-10-01. This is project memory for contributors and future assistant sessions, not a store for user information.

## Direction

Build an open-source Windows job finder that keeps personal career information local. Think big, act small: one useful, reviewable improvement per session. The UI matters from the first increment: minimal Apple-inspired glass, responsive layouts, Light/Dark/System appearance, keyboard access, and smooth background work.

The governing promise is in [docs/privacy.md](docs/privacy.md). Resumes, profiles, embeddings, and AI analysis never go to online providers. Generic, reviewed job criteria may be sent when online discovery is implemented. Do not promise network anonymity: IP metadata and provider-account association remain visible.

## Current state

- Public repository: https://github.com/nikhil-m-v/jobscout-local, branch `main`.
- Published foundation: `5e438cf`; published responsive glass UI: `4370c00`.
- React/TypeScript/Vite UI; Tauri 2 Windows shell configured; Python/FastAPI engine; SQLite startup; replaceable Ollama health adapter.
- Browser preview starts the real local engine, uses session authentication, and shows actual engine/storage/runtime status.
- Windows development prerequisites are installed: Rust/Cargo stable MSVC, Visual Studio C++ Desktop workload, and the documented Python desktop extra. Native NSIS installer generation succeeds; installer execution and upgrade behavior remain unverified.
- Overview, Settings, and labeled planned-feature pages exist. Appearance is saved locally through a styled Settings control. The sidebar uses a more translucent glass fill, page changes use a brief reduced-motion-aware transition, and static UI text is not selectable. Glass has opaque and accessibility fallbacks.
- My profile selects a local PDF/DOCX up to 10 MiB. Text-based PDFs (up to 50 pages and bounded extracted text) can be read by a disposable local worker and shown in an editable, session-only review. DOCX body/table extraction is also implemented. Reviewed text can now be explicitly saved, loaded after restart, replaced, and deleted locally. OCR remains future work. The picker contract is in `docs/architecture/0002-resume-selection.md`.
- No model inference, embeddings, RAG, Tavily search, key storage, or application tracking is implemented yet. The privacy boundary for future search is a documented contract, not an implemented filter.
- The prior privacy increment is commit `882079a`; day 2 adds the first resume-selection slice. Check Git status before publication.

## Evidence and limitations

Frontend type checking/production bundling passed during today's UI work. The foundation engine check passed earlier today. Browser views were inspected in light/dark and compact sizes; no horizontal overflow was observed in the 320-pixel glass preview. These do not establish native Windows performance.

The final privacy copy/layout build also passed. The privacy panel was reached by keyboard and inspected at desktop and 390-pixel widths without horizontal overflow. Current screenshots are linked from the README; `docs/images/privacy-settings.png` shows the disclosure panel.

WebView2 is available. Native compilation and bundled Python sidecar packaging have succeeded, producing an NSIS installer. Installer execution/upgrade behavior, native resume picker behavior, model inference, and GPU performance remain unverified. Ollama was unavailable in the observed earlier preview; the workspace handled that state.

Day 2: frontend build, four selection-contract tests, and the existing engine test passed. Browser preview verified synthetic selection, rejected replacement, navigation retention, and removal. Light/dark picker views were inspected; the 390-pixel light view had no horizontal overflow. See [2026-09-30](docs/progress/2026-09-30.md).

Git metadata writes require the environment's scoped approval path. Approved Git commands successfully fetched existing history, committed, and pushed without force. Do not change Windows ACLs to bypass the sandbox. The GitHub connector can independently verify published files. Fetch and inspect status before changing history; never overwrite unrelated work.

Day 3: local PDF extraction and editable review are implemented. Twenty engine tests cover text extraction, image-only/encrypted/corrupt/oversized/complex PDFs, decoder isolation, cancellation, timeouts, authentication, and non-persistence. Browser and native Windows preview both extracted the synthetic PDF and displayed the editable review; native file selection and the bundled engine were exercised. Frontend and native packaging checks passed.

## Start the next session

1. Read `AGENTS.md`, this file, the privacy contract, and [the roadmap](docs/roadmap.md). Check local status and remote history.
2. Follow the revised **search-first roadmap**: measure production resource use, close native import/profile checks, then build public criteria and the outbound privacy boundary before discovery. Model setup and generation are optional later increments.
3. Review the generated NSIS installer and verify clean install/uninstall behavior before release packaging work.
4. Use the repository `.venv` if present. `npm run dev` launches the local browser preview. Follow `README.md` to recreate dependencies; do not assume yesterday's preview process is still running.
5. End with the relevant checks, a clean reviewable commit, confirmed publication when authorized, and an updated checkpoint/progress entry. Do not mark planned features complete based on placeholder screens.

Detailed record: [2026-09-30](docs/progress/2026-09-30.md). Approximate next 30 working sessions: [roadmap](docs/roadmap.md). No recurring automation has been scheduled.

DOCX follow-up (2026-09-30): bounded ZIP/XML extraction now shares the authenticated import lifecycle and session-only editable review. Ten new synthetic tests pass, bringing the engine suite to 30. Frontend typecheck/build and four selection tests pass. No new dependency. Browser/native DOCX interaction has not yet been visually verified. Included in the import-and-profile publication checkpoint below.

DOCX native packaging check: `npm run desktop:build` passed and produced the Windows NSIS installer. This verifies compilation/packaging, not DOCX UI interaction or installer lifecycle.

Reviewed-text persistence (2026-09-30): one SQLite profile (text + timestamp), explicit save after review, reload/review saved text, inline delete confirmation, and separate draft discard. No original file or filename is saved. DELETE journaling and secure_delete remove old records without retained WAL frames; no encryption or secure-erasure claim. See architecture decision 0003. All 44 engine tests, frontend build/typecheck, four picker tests, and native NSIS packaging passed. Browser verified DOCX extraction/edit/save, save gating, reload dropping unsaved edits, saved-text review, draft discard retaining saved text, and delete confirmation/keep flow; narrow and desktop dark views had no horizontal overflow. Native profile UI and installer lifecycle remain unverified. Synthetic preview record was cleaned up. Included in the import-and-profile publication checkpoint below.

## Publication checkpoint — 2026-09-30

User authorized committing and pushing the completed DOCX import and reviewed-profile storage work to the existing repository. Commit title: `Add local DOCX import and reviewed profile storage`. Remote main matched the starting PDF commit before publication. Validation remains 44 engine tests, frontend build/typecheck, four picker tests, browser synthetic workflow checks, and native installer generation. No personal data, local database, credentials, or generated installer is included. Next action remains local runtime setup and recovery guidance. Verify remote history when resuming.

## Roadmap revision — 2026-09-30

User requested recording the search-first, optional-AI direction in the roadmap. The no-model core discovers, filters, ranks, saves and tracks jobs. Small local embeddings are optional; generative LLM assistance comes later only when evaluated benefits justify resource cost. Personal processing remains local and discovery stays behind the reviewed generic-query privacy gate. Increments 1–7 remain; 8 starts production resource measurements, 10–15 cover criteria/boundary/provider/privacy verification, 23 targets a usable core alpha, and 24–30 add optional AI. This supersedes earlier next-action notes about immediate Ollama setup. Next concrete action: measure installed/temp footprint, cold startup, idle RAM and peak import RAM in the production app, then set budgets. Documentation-only change; no application behavior or dependency change.

## Timeline re-estimate — 2026-09-30

The 30-session plan is an upper allowance for the broader AI-assisted product, not a minimum. From the current checkpoint, target 4–6 additional sessions for a first search demo, 10–15 total for a model-free personal alpha, and 16–25 total for an optional-AI alpha. Reassess after the first search demo; defer optional AI first if source quality, privacy verification, or Windows release work takes longer.

## Resource baseline continuation — 2026-09-30

Added a dependency-free Windows production-engine benchmark and [baseline](docs/resource-baseline.md). Three synthetic DOCX runs passed: health readiness 2.16–2.20 s, idle private memory 48.04–48.41 MiB, sampled import private peak 73.19–74.52 MiB, temporary engine extraction 29.22 MiB, installer 22.04 MiB. The benchmark uses isolated ignored storage and never reads personal documents. Process enumeration required scoped sandbox approval. Full desktop/WebView2 RAM, installed footprint, reboot-cold startup, PDF peak and installer lifecycle remain unmeasured; milestone 8 is partial. Next concrete action: native DOCX save/restart/delete and installer lifecycle, completing desktop resource measurements. Next feature: controlled public search criteria, followed by outbound validation and query preview. User authorized publishing this baseline and the pending search-first roadmap documentation together. Commit title: `Record search-first roadmap and production engine baseline`. Verify publication against remote main when resuming.

## Immediate-action continuation — 2026-09-30

Extended the benchmark with a generated 20-page PDF option. Three packaged-engine PDF imports passed: readiness 2.23–2.35 s, sampled private-memory peak 74.82–81.75 MiB. No new dependencies or personal input. Native app launch through Computer Use timed out at its app-approval step; no JobScout window appeared on the subsequent inventory. Requested manual opening of the existing release app. Native save/restart/delete, installer lifecycle, full desktop RAM, installed footprint and reboot-cold startup remain pending. No current-user JobScout uninstall registration was found; this does not prove absence in other accounts or portable locations. Next action: access the native release window and verify synthetic DOCX save/restart/delete; then installer lifecycle and desktop measurements. Changes in this continuation are local and unpublished.

Native follow-up: launch succeeded on the next user-authorized attempt. My profile initially showed a load failure; manual Reload succeeded with an empty saved profile. Fixed startup coordination in source: defer the profile read until engine health connects, retry reads on reconnection, disable profile actions while disconnected, and distinguish waiting/check failure copy. Frontend production build/typecheck passed. Native file selection is blocked by Computer Use's WebView2 target mismatch even after its prescribed refresh/retry; requested manual selection of the synthetic fixture. Full native save/restart/delete remains unverified. One full process-tree snapshot with the dialog open: 11 processes, 342.19 MiB private commitment, 617.05 MiB summed working set (not idle/peak baseline). Source fix not yet packaged or visually verified. Next: finish manual-assisted native workflow, rebuild and verify startup fix, then installer lifecycle. No publication yet.

## Native verification — 2026-10-01

Native synthetic DOCX extraction, expected editable text, review gating and explicit save succeeded. Closed the app normally and began the full native rebuild with the startup loading fix. Saved synthetic text remains for restart verification; no personal profile existed before this test. Next: rebuilt app startup/saved-text reload, deletion, and installer lifecycle. See [today's progress](docs/progress/2026-10-01.md). Pending changes remain unpublished.

Native rebuild investigation: Tauri could not remove the release sidecar executable even outside the sandbox. A verified app-owned engine process remained after UI closure; stopping it allowed compilation to proceed. Resolve engine-tree shutdown before installer verification. Do not stop unrelated or unverifiable processes or change ACLs. Synthetic saved profile remains available for restart checks.

Rebuild and NSIS packaging subsequently passed (22.04 MiB). The rebuilt native app automatically loaded the 84-character saved synthetic profile after restart without Reload; Review saved text confirmed its content. Native import/review/save/restart is now verified. Inline deletion confirmation is open; final deletion awaits the Computer Use skill's action-time confirmation. Next reliability change: ensure the complete app-owned engine process tree exits when the desktop closes, then verify installer lifecycle. No publication in this continuation.

Installer continuation — 2026-10-01: clean per-user installation into an isolated test directory passed (32.69 MiB), installed launch connected and loaded the synthetic profile, and same-version `/UPDATE` preserved the database fingerprint. True version upgrades remain untested. Normal window closure reproduced the orphan engine. Uninstall returned success and removed desktop/registration but left a locked engine executable; after stopping only the verified test orphan, normal uninstall removed all app files. Default retained profile stayed unchanged. Test registration was cleaned up. See [installation checks](docs/installation-checks.md). Next immediate action: fix complete app-owned engine-tree shutdown, then repeat uninstall without manual recovery. Interactive data cleanup, shortcuts, fresh-user/WebView2 and version migration remain unverified. Changes remain unpublished.

Shutdown fix — 2026-10-01: Windows engine now retains a process handle to its owning desktop and requests bounded server shutdown on owner exit; shell no longer kills only the frozen launcher. No dependency/network/storage changes. All 45 engine tests pass; frontend/Rust release/NSIS packaging pass. Fixed installed app connected; normal close left zero app-owned processes, and normal silent uninstall removed all app files/registration with unchanged retained profile and no manual cleanup. Architecture decision 0004 records boundaries and limits. Active-import/abrupt packaged exit, fallback timeout, interactive cleanup/shortcuts, fresh-user/WebView2 and actual version upgrades remain unverified. Next feature: controlled public search criteria. Latest fixes/verification/benchmark changes remain local and unpublished.

## Publication checkpoint — 2026-10-01

User authorized publishing the pending profile-startup fix, Windows engine shutdown fix, PDF benchmark extension and native/installer verification records. Commit title: `Fix Windows engine lifecycle and verify installer removal`. Remote history checked before publication. Evidence: 45 engine tests, frontend typecheck/build, native Rust/NSIS packaging, synthetic profile restart, and fixed installed close/uninstall without manual cleanup. No local data, fingerprints, private logs or binaries included. Next: controlled public search criteria; remaining release limitations are in the installation report. Verify remote main when resuming.
