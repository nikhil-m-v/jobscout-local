# Milestone 23 — pristine profile and version-only installed upgrade

This finite continuation retains the passed [wizard/shortcut slice](23-installer-wizard.md).
Use only the separate `app.jobscout.installedacceptance` identity, initially absent
storage/settings/registration/shortcuts and empty synthetic vault namespaces.
Keep keys absent and provider actions disabled. Preserve production artifacts and
profile fingerprints. Do not remove or change the shared WebView2 runtime.

## Procedure

1. Retain the paired `0.1.0` production-engine acceptance package and its build
   manifest. With no active acceptance installation, run
   `npm run acceptance:installed:build -- --upgrade-fixture` using its production
   `CARGO_TARGET_DIR`. The fixture has the same test identity, a real `0.1.1`
   product/installer version and unchanged engine/notices. Production version
   remains `0.1.0`. The fixed upgrade directory refuses an existing completed
   fixture and the builder preserves production artifact hashes.
2. The version-only builder verifies the retained base desktop/installer/engine,
   its single notice resource and the inventory's exact frozen-engine/notice
   hashes. It reuses this bundle rather than recollecting native dependencies
   from a changed host Python. This grants no new provenance/license clearance.
3. Run `scripts/check-installed-acceptance.ps1 -Action Install`. Preflight
   requires existing WebView2 and initially absent acceptance state; silent
   `/S /NS` leaves ordinary wizard/shortcuts to the already completed slice.
4. Launch the installed desktop. Observe pristine first use, connected local
   startup, setup navigation, optional runtime status, a local readiness check
   and missing-key guidance that prevents online dispatch. Do not configure a
   key, check a provider, send a search, open a result or download a model.
5. Take `-Action Snapshot`, close the actual window normally and run
   `-Action Closed`. Use `scripts/check-installed-upgrade.py seed --report-dir
   work/ci/<new-owned-directory>` to seed a synthetic profile, job, Interview
   stage and note through the exact installed engine's local APIs. The seed is
   API evidence, not UI import/save evidence. Retain complete expected responses.
6. Run `-Action Upgrade`. It requires the original closed installation and
   validates old payloads, higher fixture version, changed desktop/installer,
   unchanged engine/notices and paired production hashes. It writes an incomplete
   transition marker before invoking the real installer with
   `/S /NS /UPDATE /D=<same-owned-destination>`. Failure blocks further lifecycle
   actions for inspection; do not edit the manifest to force acceptance.
7. Success requires exact new payloads, executable product version, registration
   and location plus every existing test-data file's unchanged bytes. The manifest
   then binds subsequent actions to the exact higher-version build. Launch it,
   observe connectivity, setup preference/record retention and tracker rendering.
   Snapshot, close and check zero survivors, then use the Python helper's `records`
   action for complete profile/job/stage/note equality and SQLite integrity.
8. Preserve manifests/reports/observations, then run guarded `-Action Uninstall`.
   It uses the higher-version normal uninstaller and removes only initially absent
   dedicated test identity storage/settings. Production fingerprints must remain
   unchanged. Keep generated packages and raw evidence ignored.

## Evidence boundaries

A pristine app identity under the existing Windows account is not a fresh Windows
user. Existing WebView2 reuse does not test missing-runtime acquisition, offline
bootstrapper failure, new-user permissions or a clean machine. Never uninstall a
shared runtime to simulate those conditions on the owner's machine.

The fixture exercises a real different-version installer replacement and restart.
It changes version metadata only; it is not a historical released application or
schema change. `/UPDATE` deliberately uses the installer update path; it does not
certify interactive upgrade maintenance-page choices, downgrade/rollback,
interrupted upgrade, relocated-storage compatibility or historical data migration.

The production engine has no injected dispatch-disabled transport. Empty test
vault namespaces and no online actions keep provider requests unavailable in this
walkthrough; this is not packet-capture proof of zero outbound traffic. Ordinary
health may probe the optional local runtime over loopback. API record checks use
only profile/job routes and do not invoke health, vault, provider or model routes.

Record actual results, exact hashes, failures and remaining gates in the dated
progress note. Full normal-identity/Windows/accessibility/theme/resource, hosted
package/enforced-check, human usefulness and licensing/source-delivery/signing/
distribution acceptance remain separate.
