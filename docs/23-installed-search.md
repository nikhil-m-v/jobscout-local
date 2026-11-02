# Milestone 23 — installed active-search closure

This finite check runs the release desktop under the existing separate
`app.jobscout.installedacceptance` identity. The acceptance-only frozen sidecar
uses production application, search adapter, server and owner-watcher code with
`httpx.MockTransport`, an in-memory synthetic key and an offline model stub.
It has no live-provider mode, endpoint override or real vault/model fallback.
The production engine entry point and application behavior are unchanged.

This is installed production-code lifecycle evidence with a synthetic transport
engine. Its distinct engine hash does not establish acceptance of the exact
production frozen engine or live-provider behavior. Cancellation cannot recall
real requests already sent or guarantee that they are unbilled.

## Repeatable finite procedure

Use the same `--report-dir work/ci/<new-owned-directory>` for all checker actions
in a new repetition. Existing case/seed reports are never overwritten. The
default report directory is the original 2026-11-02 run.

1. Retain prior acceptance artifacts. With no acceptance installation active,
   run `npm run acceptance:installed:build -- --synthetic-search` using the paired
   production package's `CARGO_TARGET_DIR`. The build restores and verifies the
   production desktop, engine and installer hashes. The generated manifest binds
   the synthetic wrapper, engine, desktop, installer and notice file separately.
   Notices come from the verified production dependency bundle; this does not
   claim a complete synthetic-sidecar inventory or license clearance.
2. Use `scripts/check-installed-acceptance.ps1 -Action Install`. Existing runtime,
   empty dedicated data/vault namespace and production fingerprint guards apply.
   No runtime acquisition, production installation replacement or key setup.
3. Run `scripts/check-installed-search.py seed` with the installed desktop closed.
   This uses the installed synthetic engine and production storage APIs to seed
   a synthetic profile/job/Interview stage/note. Complete response identities and
   SQLite integrity are retained in ignored evidence.
4. Launch the installed desktop. Observe connected startup and synthetic saved
   records. Prepare a manual broader plan for Software engineer, India, Remote,
   any seniority, and no skills. Review the displayed five scopes and query, then
   explicitly Find jobs. The first mock response returns one synthetic candidate;
   the second waits for cancellation under the ordinary adapter timeout.
5. Promptly run `scripts/check-installed-search.py active --case normal` while
   the second request is pending. Run `closing --case normal` and immediately
   close the actual window normally. The fresh closing mark must still show an
   active uncancelled wait; do not pause between marking and closing. Run
   `scripts/check-installed-search.py closed --case normal`. It requires
   attempted=2/completed=1 before closure, an observed cancellation, no third
   dispatch, shutdown before transport cancellation, server completion, explicit
   loopback connection refusal and zero snapshot-owned
   desktop/engine/WebView processes afterward. Close within the existing search
   timeout; timeout alone does not pass this cancellation check.
6. Run `records` while closed to compare the complete saved responses and SQLite
   integrity. Relaunch, observe connected startup and run `idle` to record zero
   automatic dispatches. Explicitly prepare/confirm another search, capture
   `active --case forced`, run `closing --case forced`, and immediately run the
   guarded installed helper's `Terminate`
   action. It terminates only the manifest-owned desktop; descendants must exit
   independently. Run `closed --case forced` and `records`.
7. Relaunch once more, observe saved records and zero automatic dispatches with
   `idle`, snapshot, close normally and verify `Closed`. Preserve all session
   journals in ignored evidence before guarded `Uninstall` removes the synthetic
   identity storage. Confirm production fingerprints/artifact hashes unchanged.

The checker prefers PowerShell 7 when available and changes no execution policy.
Process snapshots retain handles and exclude children created before their
purported parents, preventing historical parent-PID reuse from claiming unrelated
processes. The forced-desktop action also retains its target handle before
identity checks. The listener probe allows Windows enough time to return an
explicit refusal; a timeout or other socket error is not a pass. No shutdown
latency is inferred from when an after-close verifier is invoked.

The wrapper rejects other storage identities, reparse points, relocated storage
configurations and new folder changes, while allowing production's initial
self-pointing routing files. Each launch creates a new atomic journal of
fixed events/counters, PID and loopback port. It records no bodies, headers, keys,
profile text, notes or local paths. Invalid synthetic requests fail closed.
Reports must stay ignored; the full synthetic saved-response fixture is not
installer content. No provider, result-page, download or inference request is
needed by this procedure.

## Evidence scope

Status — 2026-11-02: both marked normal/forced closure cases, full saved-record
comparison/integrity, search-free connected restarts, recovered tracker rendering
and guarded uninstall pass. Exact hashes, reports, harness corrections and limits
are in [the dated progress note](progress/2026-11-02.md).

Record observed results, exact package hashes and limitations in the dated
progress note. Keep full normal/forced cleanup evidence distinct from automated
source regressions. The check does not close ordinary installer wizard/shortcut,
fresh-user/runtime/upgrade, full accessibility/theme/OS, production resource,
hosted CI, human search usefulness, license/source delivery or release gates.
