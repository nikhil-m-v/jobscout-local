# Milestone 23D — stop active work when the desktop closes

This slice addresses engine shutdown ordering. The [decision](architecture/0043-stop-work-before-engine-shutdown.md) explains why work cancellation must happen before HTTP requests drain. Closing the desktop must stop unsent broader-search variants and release active parser work while retaining the existing bounded owner shutdown.

## Privacy and recovery

The change has no new setup step or retained permission. No profile, resume, note, query or token is added to diagnostics. Requests already sent to a provider cannot be recalled; stopping cannot guarantee that they are unbilled. Restart retains explicitly saved records and requires a new review before searching. Unsaved drafts remain transient. Shutdown never automatically retries, saves or deletes career records.

## Evidence

Implemented locally and verified on 2026-10-22. Nine synthetic shutdown regressions cover a credential read racing shutdown for single search, broader search and connection checks; cancellation of active single-search/connection waits; rejection before reading new request bodies; broader cancellation before a real HTTP server drains requests, retaining earlier results; parser-child cleanup; and completion of an already accepted storage write. The complete engine suite passes 463 tests. Shared validation also passes 162 frontend, 30 report/audit and 12 notice tests, both synthetic evaluations, public-plan verification, typechecking and frontend build.

The frozen-sidecar check in [check-packaged-lifecycle.py](../scripts/check-packaged-lifecycle.py) creates fresh synthetic storage, explicitly saves a synthetic profile and completes an actual frozen DOCX import. It then leaves a PDF upload incomplete and exits its disposable owner both normally and forcibly. In each case the import returns cancellation before HTTP draining, the engine exits with code zero and its loopback listener closes. The second run verifies the saved profile after restart; a final read-only database check verifies integrity and that the unsaved import never replaced the saved profile. The original 23D check called no health/model routes. The [23E follow-up](23-installed-lifecycle.md) additionally verifies the real workspace-health route, including its existing optional Ollama status probe on loopback; no inference, provider, credential, search or result-page routes are called.

```powershell
.venv/Scripts/python.exe scripts/check-packaged-lifecycle.py --engine apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe --report work/ci/packaged-lifecycle.json
```

The Windows packaging job runs this check after rebuilding the paired installer and retains its hash-bound, content-free JSON result alongside the package audit. A failure prevents the normal installer-artifact upload. This workflow change has local evidence only; hosted execution remains unverified. See [today's progress](progress/2026-10-22.md) for package identity and validation details.

These checks cover a source parser being interrupted and a frozen import upload being interrupted. They do not establish interruption of an actively parsing frozen child, arbitrary engine termination, installed desktop/WebView descendant cleanup or temporary-extraction cleanup. Automated source and sidecar checks do not close interactive installed-desktop acceptance.

## Remaining release checks

The [23E installed follow-up](23-installed-lifecycle.md) now passes for normal/forced desktop closure during active parsing, owned-process cleanup and saved-record restart. Active-search closure, arbitrary engine termination, normal installer wizard/shortcuts, upgrade/fresh-user/runtime, full accessibility/OS/themes, workload resources and milestone-21 human search-quality acceptance remain separate gates. Provider, result-page, credential and model work still requires its existing explicit authorization.
