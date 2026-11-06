# Milestone 23 — bounded installed accessibility and display preferences

Use the separate `app.jobscout.installedacceptance` identity with the production
frontend, native application and frozen engine. No synthetic transport or runtime
test hook is used. Test credentials must be absent. Do not send provider requests,
open external pages, download models, publish releases or change the shared runtime.
This procedure follows the wizard/upgrade work without asserting that its still
unverified fresh-Windows-user or historical migration cases have passed.

## Finite procedure

1. Use a new ignored `work/ci/<owned-directory>`. Preserve the current acceptance
   build manifest, overlay, desktop and installer before any rebuild. Keep actual
   paths, raw trees, screenshots, OS baseline and data fingerprints ignored.
2. Build the separate-identity package with `npm run acceptance:installed:build`
   against its paired production `CARGO_TARGET_DIR`. For a frontend-only change
   with the exact retained frozen engine, `--retained-notices` verifies the old
   package and engine/notice hashes and compares current npm dependencies and
   Cargo package/resolve metadata with the retained notice inputs before reusing
   notices. Changed or missing dependencies fail closed. This grants no new
   native provenance, license clearance or source-delivery evidence.
3. Run `scripts/check-installed-acceptance.ps1 -Action Install`, launch only the
   installed acceptance desktop, observe Workspace connected, and take `-Action
   Snapshot`. The lifecycle helper requires initially absent identity storage,
   registration/settings/shortcuts and empty test vault namespaces, validates
   exact installed payloads and checks production database fingerprints.
4. At the default 1280 × 900 client area, exercise Settings, Discover/manual
   criteria, setup entry and a synthetic saved tracker. Use Tab/Shift+Tab,
   Enter/Space, native-select arrows and the skip link. Check visible focus,
   named controls, skipped disabled controls, page-entry focus and scrolling to
   controls below the fold. Do not activate deletion or provider actions.
5. Select Light and Dark explicitly. Verify that each overrides the opposite
   Windows app color preference. Select Follow system and verify live light/dark
   changes without reopening. Capture each selected state; accessible names alone
   do not prove which appearance is selected.
6. `scripts/installed-display-preferences.ps1 -Action Capture -ReportDirectory
   work/ci/<owned-directory>` saves the original current-user app color,
   transparency and client-animation preferences. It refuses to overwrite an
   existing baseline. `Light`, `Dark` and `Reduce` perform only those finite display
   changes and read them back. Observe the actual installed UI separately.
   `Restore` restores original values, including absent registry values, verifies
   readback, and works even after installation cleanup. Always run Restore before
   ending, including after an interrupted or failed walkthrough. Do not edit the
   baseline to force success. No security/privacy setting is changed.
7. With JobScout reduction boxes off, inspect OS transparency reduction. Turn on
   the explicit Reduce transparency and Reduce motion controls, including keyboard
   Space activation. Restore Windows preferences and verify that JobScout's
   explicit reductions remain. Separately record animation observations: a still
   image cannot certify runtime media matching or transition timing.
8. Use the native window system menu's Size action to reach the supported minimum
   760 × 640 client area. Check readable text, named navigation, reachable controls
   and vertical scrolling in both palettes. Capture outer-frame dimensions as
   separate evidence; do not call a screenshot's frame size the client viewport.
9. Run `node scripts/check-theme-contrast.mjs`. This checks 58 opaque semantic
   text pairs at 4.5:1 plus twelve field-boundary/focus pairs at 3:1. Inspect actual
   glass and native controls visually as a separate check. The arithmetic does
   not certify every rendered pixel or WCAG conformance.
10. Snapshot, close normally and run `-Action Closed`. Restart to verify the saved
    theme and reduction settings. For representative records, the existing
    `check-installed-upgrade.py seed` can seed only the closed synthetic identity
    through local APIs. Keep the complete synthetic responses and verify database
    bytes after display-only inspection. This is not UI record-creation evidence.
11. After a concrete fix, rebuild/install and repeat affected cases against the
    new payload. Keep pre-fix and post-fix observations distinct. Snapshot/close,
    preserve receipts, restore Windows preferences, then guarded `-Action Uninstall`.
    Require zero owned survivors and unchanged production fingerprints. Never
    delete production data or kill processes by name.

## Evidence and limits

The [November 5 progress note](progress/2026-11-05.md) records actual package
identities, results, the editable-field contrast fix and remaining checks.
The [November 6 follow-up](progress/2026-11-06.md) records the bounded Narrator,
actual Windows contrast-theme and text/display-scaling sample, including its
separate pre-fix and rebuilt-package observations.
The final production-identity release installer remains separate from this
production-code package under a synthetic identity.

### Screen-reader, contrast and scaling follow-up

Check existing repository PRs before deciding whether a discovered failure needs
a local fix. Preserve the exact installed build manifest with each observation.
Use the same guarded production-engine identity and empty credential namespaces.

Before changing Windows settings, retain the original theme file and exact
presence/type/value of HighContrast, TextScaleFactor, pointer appearance, Narrator
and per-monitor DPI preferences in the ignored evidence directory. Record actual
selected display, resolution and scale in Settings. The display helper above
captures only app color, transparency and animation; it does **not** capture this
additional baseline. Never treat a baseline taken after a change as the original.

Use installed Windows Narrator with its existing local voice. Open speech recap
with Narrator+Alt+X and retain actual spoken strings for landmarks/headings,
control names/states, a native select and synthetic tracker notes/help text.
Exercise scan navigation and keyboard activation. Microsoft's
[speech recap documentation](https://support.microsoft.com/en-us/accessibility/windows/narrator/complete-guide-to-narrator)
describes this live transcription. A UI Automation tree alone is not speech
evidence. Do not enable online image descriptions, open external links or download
voices. Stop Narrator after the sample if it was originally off.

Apply actual Windows contrast themes through Settings and inspect the installed
app, including fields, selection, focus, disabled controls and scrolling. Keep a
dark and light system palette distinct from JobScout's own Light/Dark settings.
Read back Windows high-contrast state alongside actual rendering; distinguish a
registry flag from a native API readback. Do not substitute CSS media emulation.
Restore the original contrast mode before testing text and display scale
independently. Apply supported text-size and display-scale values through Settings;
record the exact value and the owned desktop's native DPI, and distinguish native
client pixels from the UI tool's logical screenshot dimensions. Sample layout and
keyboard reachability, then restore the original values through Settings.

After a fix, rebuild/install and repeat its affected screen-reader case. Retain
pre-fix evidence for unchanged modes rather than claiming all samples ran on the
new binary. Verify synthetic database preservation, normal close/owned-tree exit,
guarded uninstall and production fingerprints. Finally restore original preference
presence/types/values, including defaults created by first-run Narrator and
contrast-theme history. Verify original theme bytes, display-helper restoration,
monitor scale and Narrator running state. Keep restoration receipts ignored.

This remains a finite sample on one Windows environment and active display.
It does not establish every control/dialog/error/result state, every scale or
combination, custom scaling/sign-out, monitor transitions, other screen readers or
Windows versions, audible voice quality, or full WCAG conformance. Animation
readback and explicit preference persistence are not frame-timed proof that the
webview suppressed every animation.

Empty synthetic credentials and no provider actions keep online discovery
unavailable; this is not packet-capture proof of zero network traffic. Normal
health can probe the optional local runtime over loopback. Keep release publishing
disabled and retain the separate hosted CI, license/source-delivery, signing,
normal-identity and human usefulness gates.
