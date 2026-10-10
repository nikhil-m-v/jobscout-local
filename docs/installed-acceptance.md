# Isolated installed Windows acceptance — 2026-10-11

Artifact scope update: the later [work-requirement disclosure](architecture/0030-work-requirement-review-notes.md) changes the production frontend and rebuilds the normal Windows package. The installed observations below remain evidence for their earlier measured binary; the new disclosure has browser mock evidence and still needs native/installed verification. Rebuild this isolated package from the current paired production release before another installed run.

This slice runs installed release-mode production code with a separate Windows identity. It provides evidence for empty first use, local query preparation, saved-profile review, restart and normal shutdown. It does not close milestone 17D.

## Isolation and reproduction

Windows app-data paths use known folders; changing `APPDATA` does not reliably isolate Tauri storage. The builder therefore changes only the product name, identifier and test window metadata to `JobScout acceptance` / `app.jobscout.installedacceptance`. Frontend, Rust shell, CSP and engine behavior remain production code. The frozen engine must match the production sidecar exactly. This is a separate test-identity installer, not byte-identical acceptance of the normal JobScout installer or a fresh Windows account.

Build the paired production package first, then run the following sequentially with no concurrent release build:

```powershell
node scripts/build-installed-acceptance.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-installed-acceptance.ps1 -Action Install
```

The builder keeps artifacts/manifests under ignored `.local/installed-acceptance`, restores the production desktop executable in `finally`, and verifies that the normal desktop, engine and installer hashes are unchanged. Do not rebuild while an acceptance installation manifest exists. The installation helper refuses existing test storage, test settings/registration, any running JobScout desktop, a nonempty test vault namespace or missing WebView2. It checks vault presence only, without exporting a credential. Silent `/S /NS` installation uses a new ignored destination; no shortcuts or runtime download.

Launch the installed executable at the manifest's verified destination through supported Computer Use or manually. This harness has **no mocked provider and no dispatch-disabled transport**. Keep the test identity's key absent; do not configure a key, check a provider connection or choose an online search. No previous live-trial approval applies. Use synthetic text only.

Production health polling also performs the existing local Ollama `/api/tags` availability check. Local status polling is present in this run; no model inference or download was requested. This differs from the development preview's injected offline model-status transport.

Before each close, inventory the exact installed desktop and descendants. Close its native window normally, then verify the inventory is gone:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-installed-acceptance.ps1 -Action Snapshot
# Close the test window, then:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-installed-acceptance.ps1 -Action Closed
# After the final close:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-installed-acceptance.ps1 -Action Uninstall
```

Process verification records IDs and creation times only in ignored storage; it never kills processes. Uninstall uses the verified normal uninstaller and allows up to thirty seconds for copied-uninstaller completion. It removes only initially absent, exact test-identity data directories, refusing root/nested reparse points. Normal profile database fingerprints are checked throughout; contents and hashes are not published. Failures retain the manifest for inspection rather than deleting arbitrary installation files.

## Observed subset

| Check | Evidence | Result |
|---|---|---|
| Empty installed first use | No test storage or key initially; workspace connects; resume controls become available | Pass on this Windows account with existing WebView2 |
| Manual local query | Search without a resume → Engine query displays `Software engineer jobs`, five scopes and limits; missing-key guidance disables online Find jobs | Pass; no provider request |
| Saved-profile restart/review | While closed, production storage adapter seeds 72 synthetic characters; restart recognizes saved data; explicit Review saved text loads it for review | Pass; initial seed was not UI import/save evidence |
| Installed assisted preparation | Edited to 81 synthetic characters, then Generate suggested search recognizes Software Development Engineer as Software engineer and Python/SQL | Pass; public query `Software engineer jobs Python SQL` omits the synthetic private marker |
| Explicit UI save and persistence | Return to Resume, expand reviewed text, Replace saved profile → Saved on this computer; exact 81-character record verified from isolated storage; third launch recognizes saved profile and shows 81 characters | Pass |
| Normal native close | Three launches inventoried separately; zero surviving owned processes after each native close; normal profiles unchanged | Pass for normal close; active work/abrupt exit pending |
| Normal uninstall and test cleanup | Verified uninstaller removes application files/registration; initially absent test identity storage/settings removed; zero owned processes and normal profiles unchanged | Pass; no process kill or manual installation-file removal |
| Exact installed payload | Desktop hash matches after unique in-memory NSIS marker normalization; engine hash matches production | Pass |
| Installed application files | 34,568,859 bytes / 32.97 MiB including uninstaller | Measured; separate identity metadata can change size |
| Resources | Manual query: ten processes, 507.65 MiB summed working set / 365.45 MiB private commitment; reviewed profile: ten processes, 516.18 / 335.65 MiB; third-launch saved-profile view: ten processes, 497.79 / 322.27 MiB | Three snapshots, not stable idle averages or peak RAM |

Snapshots include the desktop, frozen engine launcher/child and six WebView processes. Shared working-set pages may be counted more than once. No startup stopwatch, import/search/Results peak or live latency measurement was made. The normal package remains 23,191,627 bytes (22.12 MiB); its artifacts are preserved.

No production code, dependency, schema, privacy contract or version changes in this slice. Existing 333 engine and 97 frontend checks remain prior evidence. Release packaging, payload/lifecycle guards, script syntax and documentation checks validate this harness increment.

Remaining: normal-identity wizard/shortcuts, actual fresh Windows account/missing runtime, genuine version upgrade, installed active-import/search/abrupt exit, full accessibility/OS behavior, representative suitability and production workload resource measurements. See [17D acceptance](milestone17-acceptance.md) and [installation checks](installation-checks.md).
