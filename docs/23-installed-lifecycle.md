# Milestone 23E — installed active-import lifecycle

This finite continuation of [23D](23-lifecycle.md) exercises the installed release-mode desktop, its real bundled engine, parser subprocesses and WebView descendants under the separate `app.jobscout.installedacceptance` identity. It does not use a mocked sidecar or the normal personal workspace.

Status — 2026-10-22: normal and forced desktop closure during active synthetic parsing pass, followed by connected restart, unchanged saved profile/candidate/stage/note, zero recorded owned processes and guarded uninstall. Production data fingerprints remain unchanged. Installed desktop/engine and dependency-notice hashes match the acceptance manifest. The initial installation exposed and led to correction of [missing Python SSL runtime data](architecture/0044-preserve-python-ssl-runtime-data.md); the final walkthrough used the corrected binary.

## Preparation

Build a paired production package, then use `npm run acceptance:installed:build` with the same `CARGO_TARGET_DIR`. The helper collects and validates the dependency-notice bundle, builds the separate acceptance installer and restores the production desktop. The engine and production installer hashes must stay unchanged. No runtime download or production installation replacement is permitted by this procedure.

Run `scripts/check-installed-acceptance.ps1 -Action Install`. Existing-installation, empty test-data/vault-namespace, WebView-runtime and production-data fingerprint guards must pass. Verify the installed engine, desktop and notice file hashes. Seed only the initially empty synthetic identity with a clearly synthetic saved profile and candidate with stage/note. Keep providers and optional AI unused; no searches or job-link navigation.

## Finite checks

1. Launch the installed acceptance executable and confirm its saved synthetic records appear.
2. Import an owned synthetic PDF that keeps the real parser active. Capture `-Action Snapshot` while parser descendants are present; distinguish the idle engine pair from the additional parser process. The observed frozen build adds one child, so at least three engine-named processes establish this local activity check.
3. Close the acceptance window normally. Run `-Action Closed` after exit and verify zero owned desktop, engine/parser and WebView processes. Retain the process identities and counts as ignored evidence.
4. Restart and verify the saved profile/candidate/stage/note remain unchanged. Repeat import and snapshot, then run `-Action Terminate` to abruptly stop only the identified desktop. This action validates path, executable hash and recorded start time, and never kills descendants. Verify those descendants exit themselves with `-Action Closed`.
5. Restart again, confirm saved records and database integrity, then close normally and verify cleanup. Run the guarded acceptance uninstaller; verify files/registration and dedicated identity storage are removed without changing production data fingerprints.

The forced-termination helper is limited to a manifest-owned acceptance desktop. Missing/stale snapshots, changed executables and unrelated processes must fail closed. Start times are compared as exact UTC ticks so both Windows PowerShell string timestamps and newer PowerShell DateTime deserialization retain PID-reuse protection. Never use it on normal personal JobScout windows or manually remove a failed installation to manufacture a passing uninstall result.

## Evidence and limits

Results are recorded in the [dated progress note](progress/2026-10-22.md). Active-search closure, arbitrary engine termination, full accessibility/OS themes, interactive installer wizard, fresh-user/upgrade/runtime acquisition, workload resources and search quality remain separate gates. Dependency notices being present does not complete native/nested-vendor license or covered-source review. This procedure establishes only the observed bounded synthetic installed behavior.
