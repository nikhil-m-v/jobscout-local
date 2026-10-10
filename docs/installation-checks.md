# Windows installation checks — 2026-10-01

Latest artifact scope — 2026-10-11: the subsequent [work-requirement disclosure](architecture/0030-work-requirement-review-notes.md) rebuilds the production frontend/Rust/NSIS package with an unchanged engine. Installed checks below remain specific to their measured binaries; no installed retest or new footprint/lifecycle claim follows from this frontend increment. See [the dated progress note](progress/2026-10-11.md).

## Isolated installed production-code continuation — 2026-10-11

The [separate-identity installed acceptance](installed-acceptance.md) passes empty first use, manual/synthetic assisted public-query preparation with no key, explicit local UI profile save, saved-profile restart, three normal closes and normal uninstall. All inventoried owned processes exit; test application files/registration and initially absent synthetic storage/settings are removed. Normal profile fingerprints and normal production artifact hashes remain unchanged. No provider request, runtime download, process kill or ACL change. Installed test files total 34,568,859 bytes (32.97 MiB); normal installer remains 23,191,627 bytes (22.12 MiB).

This package uses current production frontend/Rust/engine code with only product identity/window metadata changed for safe isolation. Its engine matches the production sidecar; desktop exact-payload validation permits only the unique Tauri NSIS marker. Windows known-folder storage is not safely isolated by changing APPDATA. This evidence does not establish the exact normal-identity wizard/shortcuts, a fresh Windows account/missing runtime, version upgrade, optional data-deletion UI or installed active-work/abrupt exit. Earlier no-installed-launch statements below apply to their earlier silent subsets. Script syntax, release build and exercised payload/lifecycle guards pass; unchanged-production suites were not rerun.

## Current-package silent continuation — 2026-10-10

Target-revision package retest: the rebuilt 10–20 target UI also passes this complete silent harness. Installed files total 34,565,020 bytes (32.96 MiB); existing profile database unchanged and test files/uninstall entry removed. This supersedes the footprint below for the latest package. No native application launch or interactive installer evidence.

The current 0.1.0 x64 package containing the accessibility controls and SQLite connection cleanup passes the scoped silent check in `scripts/check-installer.ps1`. No JobScout install registration or running desktop existed; WebView2 was already present. A new ignored test destination was used with `/S /NS`, without launching the application.

| Check | Current evidence | Result |
|---|---|---|
| Clean per-user install | Correct version/location, desktop/engine/uninstaller present | Pass |
| Exact payload | Engine hash matches packaged sidecar; desktop matches every byte after the expected unique Tauri `UNK` → `NSS` bundle-marker substitution in memory | Pass |
| Application footprint | 34,562,914 bytes / 32.96 MiB including uninstaller | Measured; excludes personal data, extraction and shared WebView2 |
| Same-version reinstall | `/S /NS /UPDATE`, correct destination and exact payload | Pass; not a version-to-version upgrade |
| Default retained profile | One pre-existing profile database has unchanged SHA-256 after install, reinstall and uninstall | Pass; no profile contents or digest exported |
| Silent uninstall | Exit 0; test application directory and uninstall registration removed | Pass; no app was launched |
| Harness cleanup | Remembered installer destination restored after successful test | Pass; no recursive manual deletion |

The initial direct desktop hash comparison failed because Tauri embeds the NSIS bundle marker during packaging and restores the build executable afterwards. Inspection showed exactly three changed bytes (`UNK` → `NSS`) and identical file sizes. The finished harness normalizes only that unique marker in memory, then compares the entire payload hash. No executable is modified and unrelated differences still fail. The earlier scoped test installation was removed with its verified normal uninstaller before repeating the finished check.

Reproduce after building the current package:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/check-installer.ps1
```

The harness refuses existing JobScout registrations, a running desktop, existing autostart configuration, an occupied test destination, or missing WebView2. It requires permission for the scoped per-user installation/registry changes. It preserves profile databases, never chooses optional app-data deletion, and uses only the normal uninstaller for its new verified destination. Failures retain the installation for inspection instead of recursively deleting files. Reports contain counts/size/status only. This does not exercise the interactive wizard, shortcuts, new Windows user, missing runtime, genuine version upgrade, installed launch, normal native close or active-work exit. The historical interactive evidence below remains historical.

## Historical checks

Tested the generated 0.1.0 x64 NSIS installer with the pending saved-profile startup fix. Used a previously absent installation directory under ignored test storage, per-user registration, existing WebView2, silent mode, and `/NS` to suppress shortcuts. No previously registered JobScout installation was overwritten. Existing app data contained the synthetic 84-character profile from native workflow testing.

| Check | Evidence | Result |
|---|---|---|
| Clean application installation | Exit 0; desktop, engine and uninstaller files present; correct per-user registration/version/location | Passed |
| Installed footprint | Application files including uninstaller total 34,277,259 bytes (32.69 MiB) | Measured; excludes app data, engine extraction and shared WebView2 |
| Installed launch | Native window opened, workspace connected, saved synthetic profile loaded automatically | Passed |
| Same-version update/reinstall | `/S /NS /UPDATE` returned 0; executables/registration present; database fingerprint unchanged | Passed; not a version-to-version upgrade |
| App exit | Installed window closed normally; app-owned engine remained running | Failed |
| Default data retention during uninstall | Saved-profile database remained present with unchanged fingerprint | Passed |
| Uninstall with orphan engine | Exit 0; desktop executable and registration removed, engine executable remained locked | Failed |
| Cleanup after stopping verified test orphan | Reran normal `/S` uninstaller; no application files remained | Passed with manual recovery |

The first uninstall used `_?=<test directory>` to wait directly for its sections instead of a copied temporary uninstaller. Its remaining uninstaller executable is not counted as a product defect under that diagnostic mode. The locked engine executable is a defect. The subsequent cleanup used the normal copied-uninstaller path and removed all installation files. Database fingerprints stayed in ignored local test storage; no profile contents, credentials or machine-specific logs are committed.

## Release blocker and recovery

**Fixed and retested on 2026-10-01:** the Windows server now watches its desktop owner and shuts down without killing only the frozen launcher. A newly installed fixed build connected successfully. Normal window close left zero app-owned processes; normal `/S` uninstall then removed all installation files and registration, retained the unchanged profile database, and required no manual process cleanup. All 45 engine tests and native packaging pass. See [ownership decision](architecture/0004-desktop-engine-ownership.md). The failure table above records the original reproduction.

The old build did not reliably stop the complete app-owned engine process tree. Do not terminate unrelated engines by name. Normal close/uninstall has now passed without recovery; exit during active import and abrupt packaged-desktop termination still need checks.

The test registration and installation files were removed. Shared runtime and retained profile data were preserved. A separate development-release window/data and unverifiable engine processes were not removed as part of installer cleanup.

## Still required

- Genuine old-version to new-version upgrade and data migration (only 0.1.0 is currently available).
- Fresh Windows-user/machine first run with empty app data and missing WebView2.
- Interactive wizard, install location/space errors, cancellation and shortcut behavior (`/NS` intentionally skipped shortcut testing).
- Interactive optional Delete app data checkbox, with isolated synthetic data. The generated script targets both roaming and local app-data directories; this path has been inspected, not executed.
- Restart/reboot cleanup, stable idle resource measurements, and installer recovery after lifecycle fixes.

These checks do not establish a release-ready installer or secure deletion of data/backups.
