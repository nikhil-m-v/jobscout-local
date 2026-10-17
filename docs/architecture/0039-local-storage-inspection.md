# 0039 — Explicit local storage inspection

Date: 2026-10-17. Status: 22B implemented; contract declared before implementation. Source/tests/docs published in `9d14791` with 22C; included in the rebuilt local 0.1.0 package. Installed acceptance remains pending. Earlier verification below records the original 22B evidence.

## Contract and finite scope

The workspace step offers an explicit Check storage action. Authenticated `GET /api/v1/setup/storage` accepts no user-selected path. It returns exactly `folder` (configured absolute personal-data directory, or null if unavailable/too long) and `free_bytes` (nonnegative safe integer, or null). The snapshot is transient, marked no-store, and never added to guide progress, logs, exports or provider requests. The folder may include a personal account name and is displayed only locally as escaped text.

The engine performs one disk-space query against the existing configured directory in a worker thread. It does not enumerate files, read career records, probe writes, create folders, migrate data, inspect credentials, contact a provider or query a model. Missing/inaccessible storage yields unknown space, never a substituted parent drive or invented zero. Zero is a real full-drive result. No arbitrary minimum or readiness certificate is inferred from available bytes; space changes and subsequent saves can fail.

The native command has a fixed route and no path argument; the development bridge uses the existing custom-header boundary. The frontend validates exact fields and bounds, clears old results before retry, ignores completion after leaving, and provides fixed failure/retry text without raw diagnostics. Checks run only on a click; reopening starts unchecked. Continue and Finish later remain usable during a check.

No dependency, schema, download, migration, stored permission or version change. Upgrade requires the paired frontend, native bridge and engine; older engines show a recoverable unavailable state. Folder selection/migration, writable-storage verification, device compatibility and installer locations remain separate later work. This snapshot concerns personal-data storage, not shared model storage or application install size.

## Exit checklist

- Engine: session enforcement, exact response/no-store, real disposable directory, unavailable and zero space, no record/file mutation, no provider/model/credential access.
- Frontend: strict malformed-response rejection, explicit-only check, pending/retry/unmount handling, readable folder wrapping and honest space guidance.
- Integration: development/native bridge, frontend tests/build, engine regression suite and Rust check when available; synthetic browser exercise with evidence scope stated.
- Update privacy/setup guidance, roadmap and dated checkpoint. No publication or installed acceptance implied.

## Verification

All 390 engine tests, 151 frontend tests and 17 report/audit tests pass. Production frontend typecheck/build and offline Rust `cargo check` pass. Eight new engine cases cover authentication, response bounds, no-store, unsupported query/method, unchanged disposable database/files, unused injected model/vault/provider services, unavailable storage and zero space. Frontend checks cover exact validation, fixed browser transport/abort, duplicate suppression, stale-result clearing, retry and ignored late success/failure after leaving.

Synthetic browser evidence: keyboard-triggered successful storage inspection against the disposable engine, unchecked state after reload/reopening, unavailable state with previous results removed after stopping the preview, successful check after restart/reopening, visible pending state with Continue/Finish later still enabled, and keyboard focus advancing to Continue. A 560px viewport reports equal document/client widths; dark screenshot is local/ignored. One duplicate separator was removed after visual inspection. Full OS accessibility, light-theme visual review, installed/package acceptance, workload/resource measurements and CI remain outside this evidence. Restricted preview/test processes initially could not make progress; scoped process permission allowed the same synthetic preview/suite to run. No real provider, vault, model, private-profile or result-page operation occurred.
