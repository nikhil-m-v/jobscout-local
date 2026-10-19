# Folder-change installed acceptance

Scope: the milestone-22D folder-copy flow in a freshly paired Windows package. Use the production code with the separate `app.jobscout.installedacceptance` identity and synthetic records. This is a finite continuation of [decision 0041](architecture/0041-personal-data-folder.md), not full milestone-23 release acceptance.

Status — 2026-10-20: this finite walkthrough passed with the current paired production code, real bundled engine and synthetic records. The test installation and its dedicated identity storage were removed using the guarded helper. Production artifact hashes and database fingerprints were preserved. See [the observed results and limits](progress/2026-10-20.md); the procedure below is retained for repetition on future changes.

## Preparation

1. Build the engine, frontend, native bridge and NSIS installer together using `npm run desktop:build`. A previous installer is not evidence for current source.
2. Run `node scripts/build-installed-acceptance.mjs`. This creates a separate acceptance installer and records executable hashes while preserving the production artifacts.
3. Use `scripts/check-installed-acceptance.ps1 -Action Install` only after its existing-installation, identity and runtime guards pass. Do not replace the user's normal installation or download WebView2 as part of this check.
4. Seed only the initially empty acceptance identity with a clearly synthetic profile and one saved candidate with an interview stage and synthetic note. Record the seed and artifact bindings in ignored local evidence. Keep all providers and optional models unused.
5. Choose a new destination inside an owned ignored test directory. Do not copy real career records, open job links, configure keys or send searches.

## Finite walkthrough

| Check | Required observation |
|---|---|
| First launch | Installed acceptance window connects to its bundled engine and shows the synthetic saved records |
| Setup navigation | Enter setup, continue to the workspace step and open folder settings using visible controls |
| Invalid destination | Review an invalid or existing destination; show useful guidance and restore input focus without changing active storage |
| Review | A new local destination shows current/new folders, database size, free space and retained-copy disclosure before confirmation |
| Explicit copy | Confirm once; completion identifies the active destination and retained original; old storage-inspection values are cleared |
| Retained records | Profile, saved candidate, stage and note remain readable after the switch |
| Core check | Explicit local write/read/remove check succeeds at the selected destination |
| Normal close | Snapshot owned processes, close the window normally and confirm desktop/engine descendants exit |
| Restart | Relaunch the installed executable; active folder and synthetic records persist |
| Later save | Edit the synthetic tracking note through the UI; after close, verify the active database changed and the original recovery copy did not |
| Uninstall | Use the guarded acceptance uninstaller; verify owned processes/registration/files are removed and normal production data fingerprints are unchanged |

Keep the migration destination as ignored synthetic evidence unless separately cleaned up with verified ownership. The acceptance uninstaller only cleans its dedicated identity directories; it does not establish deletion of relocated records or recovery copies.

## Evidence limits

Record each observed result and concrete blocker in the dated progress note. An automated engine test, successful package, or prepared checklist cannot stand in for the installed walkthrough. This scope does not establish a normal interactive installer wizard, upgrade/fresh-user/runtime behavior, screen-reader acceptance, all Windows versions, peak resource budgets, live search usefulness, abrupt-exit handling during native work, CI or release readiness.
