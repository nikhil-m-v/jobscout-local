# Milestone 23 — installer wizard and shortcuts

This finite acceptance slice uses the ordinary NSIS wizard with the separate
`app.jobscout.installedacceptance` application identity and the exact production
frozen engine. It runs under the existing Windows account with WebView2 already
installed. It does not establish fresh-account, missing-runtime, genuine
version-upgrade, normal-identity or release acceptance.

## Repeatable procedure

Keep reports in a new ignored `work/ci/<owned-directory>`. Retain earlier
acceptance packages and their build manifests before rebuilding.

1. With no acceptance installation active, run
   `npm run acceptance:installed:build` using the paired production package's
   `CARGO_TARGET_DIR`. Omit `--synthetic-search`: the wizard helper requires
   `production-engine` mode. The builder restores and verifies the production
   desktop, engine and installer hashes.
2. Run `scripts/check-installed-acceptance.ps1 -Action PrepareWizard`.
   It requires existing WebView2, absent test registration/settings/storage,
   empty synthetic credential namespaces and absent exact acceptance shortcuts.
   The manifest binds the build, production profile fingerprints, two known-folder
   shortcut paths and a new application destination inside the acceptance area.
3. Run `-Action Wizard`. Observe the welcome and destination pages, keeping the
   prepared destination. Cancel before installation, then run `-Action Cancelled`.
   This requires the wizard to exit and leaves no installation, registration,
   settings, shortcuts or identity data. Only the prepared manifest is removed.
4. Prepare and launch a new wizard. Observe Back/Next and the destination/space
   information, then install into the prepared destination. On the final page,
   clear **Run JobScout acceptance** and select **Create desktop shortcut**.
   Finish, then run `-Action CompleteWizard`.
5. Completion verifies registration, exact installed desktop (including the
   narrowly checked Tauri NSIS bundle marker), engine and notice hashes, and both
   Start menu/Desktop shortcuts. Each shortcut must target that installation's
   desktop executable without arguments. No shortcut is written by the helper.
6. Launch each verified shortcut separately. Observe connected local startup,
   take `-Action Snapshot`, close the actual window normally and run
   `-Action Closed`. Record UI observations separately from hash/process checks.
   Do not configure keys, send searches or download models for this slice.
7. Preserve the manifest and observations in ignored evidence, then run
   `-Action Uninstall`. The helper checks shortcut ownership before invoking the
   ordinary uninstaller, verifies removal of both shortcuts/files/registration,
   and removes only the initially absent dedicated test storage and settings.
   Production profile fingerprints must remain unchanged throughout.

The wizard is intentionally visible; package operations used for silent
installation/uninstallation remain hidden. A changed shortcut/build/destination,
active wizard, unexpected existing state or surviving owned process fails closed.
Inspect failures before retrying; do not manually sweep installation directories
or shortcuts to obtain a passing report. Existing silent `Install` still uses
`/S /NS` and does not require shortcuts.

Record exact artifacts, observations, tests and limits in the dated progress note.
Keep new-account/runtime/upgrade, accessibility/theme/OS, production workload
resources, hosted package/check enforcement, human usefulness and license/source
delivery/signing/distribution review as separate open gates.

Status — 2026-11-03: this finite walkthrough passes. Exact artifacts, observations,
validation and limits are recorded in [the dated progress note](progress/2026-11-03.md).
