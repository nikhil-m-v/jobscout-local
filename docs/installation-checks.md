# Windows installation checks — 2026-10-01

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
