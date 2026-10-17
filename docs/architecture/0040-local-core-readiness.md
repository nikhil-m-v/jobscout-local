# 0040 — Optional local core checks

Date: 2026-10-17. Status: 22C implemented and verified locally; contract declared before implementation. Source/tests/docs published as `9d14791`. Included in the rebuilt local 0.1.0 package; installer remains local and has not been installed for acceptance.

## User outcome and scope

First use offers an explicit **Check this computer** action. Before running, it explains that the check reads basic device facts and creates, reads back and removes one tiny temporary file in the configured personal-data folder. It sends nothing online and accesses no career records, keys, models or result pages. The existing read-only storage inspection stays separate. Navigation and Stop waiting remain available. No overall ready badge, hardware minimum, Windows support claim or inference-speed recommendation is derived from these observations.

## Contract

Authenticated `POST /api/v1/setup/check` accepts an empty body and no query/path arguments. The fixed native command and development route expose no selected path. The exact no-store response contains `system` (windows/linux/macos/other), `process_bits` (32/64/null), `logical_processors` (1–65536/null), `memory_bytes` (safe nonnegative integer/null), and `storage` (verified/unavailable/cleanup_needed/busy). Memory is total physical memory reported by the Windows API; other platforms return unknown until a bounded implementation is added. Names, serial numbers, OS versions, CPU/GPU models, process lists, environment values and private paths are excluded.

The engine runs synchronous checks in a worker. A per-app lock bounds concurrent probes to one. The storage test creates one exclusive random `.jobscout-check-` temporary file in the existing configured data directory, writes a fixed nonpersonal marker, flushes and requests OS synchronization, reads it back and removes only that owned file. It neither creates missing directories nor scans/opens/moves/deletes existing files or the database. A verified result requires exact readback and successful cleanup. It does not establish SQLite transaction health, future save success, power-loss durability or secure erasure.

On write/read/close failure, cleanup still runs. Cleanup failure returns cleanup_needed and retains only the exact owned filename in engine memory; the next explicit check must remove that file before creating another. There is no directory sweep, startup cleanup or automatic retry. Abrupt termination can leave a tiny nonpersonal check file; restart forgets its ownership, and setup does not delete old matching names. Busy reports another check finishing, with no new probe. Leaving/stopping/timeout discards UI results but cannot recall OS work; the worker must finish its cleanup. Cancellation must not release the lock early.

Frontend validation rejects unknown fields, values and out-of-bounds numbers with fixed text. Results remain transient, clear before retry and on leaving, and are never persisted in setup progress, logged, exported or sent to providers. Old paired components give recoverable unavailable guidance. No dependency, schema, version, model or download change. Storage selection/migration and interactive installed release acceptance remain separate.

## Finite exit checklist

- Engine tests: exact authenticated empty request, no-store, bounded facts, real disposable write/read/remove, unchanged records, error/cleanup recovery, concurrency and no injected provider/vault/model access.
- Frontend tests: strict response bounds, explicit operation, stop/retry/late result handling, fixed transport, accurate device/storage guidance and setup integration.
- Complete existing engine/frontend suites, production build and offline Rust check; inspect synthetic browser keyboard, responsive/theme, successful and interrupted flows.
- Update privacy/setup, roadmap, memory and dated progress; record remaining evidence limits. No push or release signoff is implied.

## Verification and remaining limits

All 412 engine tests, 156 frontend tests and 17 report/audit tests pass. The 22 added engine cases cover real disposable write/read/remove, exact auth/request/no-store behavior, unchanged existing files/database, injected external services unused, missing directories, create/open/write/flush/sync/seek/read/close failures, wrong readback, cleanup failure/recovery, concurrent requests with responsive metadata reads, bounded device facts and unknown facts without blocking storage. Five added frontend checks cover strict response/transport, explicit and duplicate requests, stop/leave/new-generation handling, fixed failure guidance and rendered facts. The existing setup integration check also covers the new panel. Production typecheck/build and offline Rust compile check pass.

Synthetic browser review covers keyboard Run/Stop waiting, returned focus, busy during an unfinished check, successful readback/cleanup, pending navigation, unchecked reopening, and light/dark layouts. At a 560px viewport, document/client widths match. A deliberately delayed disposable engine exercises pending operations; this is a test harness, not product latency. The first preview reported unavailable storage when its default temporary directory became unavailable; a fresh workspace-local disposable preview passed. No root cause beyond that observed scope is claimed. Restricted test/build processes stalled and were stopped; scoped process permission completed the same checks. Screenshots and harness stay ignored.

The paired engine/frontend/native Windows NSIS package rebuilt successfully (0.1.0, about 22.16 MiB). A separate smoke test of the actual packaged engine verifies auth/no-store, storage inspection, two explicit write/read/remove checks, unchanged synthetic database bytes, Windows memory measurement and clean owner-triggered shutdown. Only setup routes were called. The package has not been installed or exercised through the native UI in this slice; package/engine success is not installed/accessibility/resource/CI or search-quality acceptance. No provider/page/vault/model/private-profile operation or spending. Folder selection/migration, full setup acceptance, milestone 21 human gates and owner 23 release gates remain open.
