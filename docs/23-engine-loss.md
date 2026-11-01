# Milestone 23 — unexpected engine loss and recovery

This finite continuation tests losing the engine application while the desktop
or a parser child is still running. The production shell signals engine loss to
the interface; the interface clears its connected status and explains that
JobScout must be closed and reopened. A late health response cannot reconnect a
workspace whose engine has exited. There is no automatic engine restart, request
retry, draft save or provider operation. The existing local-only privacy boundary
and explicit search review remain unchanged.

## Frozen crash check

`scripts/check-packaged-crash.py` launches the actual production frozen engine
against a newly created synthetic data directory. It explicitly saves a synthetic
profile and job snapshot, records an Interview stage and private synthetic note,
then sends a synthetic DOCX to the real parser. Only after observing a live parser
child does it forcibly terminate the frozen engine application. The frozen
launcher, parser and disposable owner are separate process identities.

The check retains Windows process handles. An application or parser must be a
child of a retained live parent, use the exact expected executable path, and have
a creation time no earlier than its parent. Parent relationships are checked
again after capture. Termination targets that retained handle rather than a
reusable numeric PID. The crash target is the engine application; parser cleanup
must happen independently. Failure cleanup can stop only previously captured
owned handles and never converts a cleanup failure into a passing observation.

Passing requires all of the following:

- A real frozen parser was observed alive before engine termination.
- The parser exits itself, the launcher exits with failure and the loopback
  listener closes.
- The in-flight import loses its connection instead of reporting success.
- Restart preserves the complete saved profile/job/stage/note records, releases
  the transient import reservation, and successfully parses another DOCX.
- A read-only SQLite integrity check succeeds.

```powershell
.venv/Scripts/python.exe scripts/check-packaged-crash.py --engine apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe --report work/ci/packaged-crash.json
```

The JSON binds the result to the engine SHA-256 and records fixed outcomes and
timing, never records, paths, credentials or request content. No health/model,
provider, credential, job website or download routes are called. The Windows
packaging job runs this after the existing graceful lifecycle check, blocks the
normal installer artifact on failure and retains the report in its packaging
audit. Hosted execution remains pending until a corresponding workflow runs.

Local evidence on 2026-11-01: the frozen crash/restart/parser/storage sequence
passes; six focused ownership-safety regressions pass. The restricted sandbox
announced the loopback binding but failed readiness; the normal-environment retry
passes. The exact engine hash and timing are retained in the ignored report and
dated progress note. This establishes a bounded engine-loss check, not a guarantee
of power-loss durability, interrupted-write recovery, temporary-extraction cleanup
or installed desktop/WebView behavior. Observing the child establishes an
in-flight real import process, not its exact parser instruction or a permanently
stalled parser. The check requires child exit without helper termination; it does
not identify which internal parent-loss/pipe-close path caused that exit.

## Installed desktop follow-up

Use the separate acceptance identity and paired production-engine preparation in
[23E](23-installed-lifecycle.md). Do not target a personal JobScout instance.
Seed only synthetic records; leave provider and optional AI controls unused.

1. Launch the installed acceptance desktop and verify it is connected.
2. Run `scripts/check-installed-acceptance.ps1 -Action Snapshot` immediately before
   the test. It must record the desktop, engine launcher, application and WebViews.
3. Run the helper with `-Action EngineTerminate`. It requires the owned manifest,
   exact desktop and engine hashes, recorded process start instants and the
   desktop → launcher → application relationship. It retains the application OS
   handle before checking identity and kills only that application. It never
   terminates the desktop, WebViews or parser descendants.
4. Confirm the desktop promptly shows offline/reopen guidance. Confirm that
   **Check again** does not reconnect the missing sidecar or retry a write/search.
5. Close normally and run `-Action Closed` to confirm owned-process cleanup.
   Relaunch; verify connected startup and unchanged synthetic saved records. Take
   a fresh snapshot before closing, check cleanup and run guarded uninstall.

The desktop event and late-health protection also have focused frontend coverage.
Record actual installed observations separately from the frozen and source tests.
Active-search closure, a genuine fresh Windows account, upgrade/runtime acquisition,
full accessibility/OS settings, representative resources, licensing and human
search-quality acceptance retain their separate release gates.

## Installed results — 2026-11-01

The current separate-identity release-mode package passes the finite walkthrough.
The production engine is SHA-256
`e690a89382b0988c6bc62e73119e8a36ba45738d5e391f9aeae9feb5a68aeda7`;
the acceptance installer is
`36c422bab53d288d13dd3cae80d22f6030be3f192cb2bd9d7789bd49d93b2493`
and its pre-NSIS desktop candidate is
`6e125e15ad39f8521ee99c01f48d35b3575284b0c55537daf760976ce3461255`.
The installer helper verifies installed desktop (including the exact Tauri marker
change), engine and notices. Initially empty acceptance data/vault namespaces and
existing WebView2 are required. Production artifact hashes are preserved by the
acceptance build; this test does not install or download a runtime.

Observed through the actual installed UI:

- Connected startup, saved-resume presence and the synthetic saved job's Interview
  stage and private note are visible.
- A ten-process snapshot includes two engine and six WebView processes. Killing
  only the retained inner engine leaves the desktop open. Its saved-jobs page
  shows an alert explaining reopening and uncertain saves, **Workspace offline**,
  last-loaded labeling and disabled refresh/edit/remove actions.
- Settings also shows offline/reopen guidance and a disabled **Check again**.
  No key status/check/search or model action is invoked.
- Normal keyboard close leaves zero recorded owned processes. Reopening connects
  again and shows saved-resume presence; a second normal close also leaves zero
  owned processes. A repeated saved-jobs click after restart could not be driven
  because the automation reported `coordinate input geometry is unavailable`;
  record preservation after restart is verified through the real production API,
  not claimed as a second tracker UI pass.
- A comparison with the pre-crash synthetic production-API responses confirms
  unchanged saved profile/job/stage/note records; read-only SQLite integrity is
  `ok`. Guarded uninstall removes test application files/registration and initially
  absent synthetic identity storage. Production database fingerprints remain
  unchanged throughout.

Installed files total 35,736,967 bytes. The saved-jobs and restarted initial-view
snapshots are 480.52/274.23 and 455.22/255.20 MiB summed working set/private
commitment respectively; shared pages may be counted repeatedly. These are two
observations, not stable idle means, startup timing, workload peaks or budgets.
Raw helper manifests/results stay ignored. No normal personal records are read by
the test beyond the existing fingerprint preservation guards.

The final current-engine frozen lifecycle also passes normal/forced-owner active
upload cancellation, listener closure, saved-profile restart and integrity
(0.641/0.610 seconds observed shutdown). The separate real-parser engine-crash
case passes with 2.375 seconds observed parser/listener cleanup, preserved records
and recovered import. Timings describe the observed local checks, not universal
limits. Active installed online-search closure, interrupted accepted writes,
power-loss durability, comprehensive temporary-file cleanup and the other release
gates remain open.
