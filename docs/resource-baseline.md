# Production resource baseline

## Current packaged-engine measurements — 2026-11-01

Nine fresh synthetic workspaces (three DOCX, three PDF and three fifty-candidate local-analysis runs) pass with the current production sidecar. Its 19,982,714 bytes hash to `e690a89382b0988c6bc62e73119e8a36ba45738d5e391f9aeae9feb5a68aeda7`; the package audit's verified native-archive receipt binds that same engine hash. The paired unsigned installer is 23,445,619 bytes (22.36 MiB), SHA-256 `b11f40534c1638c5a334bc735684e29d8fa2519312651e4269d15065e8bc2946`. Artifact identity and measurement do not grant license clearance or release approval.

The machine reports Windows build 26200, x64 process architecture, 12 logical processors and 31.36 GiB physical RAM. Runs used warm filesystem caches after packaging, without concurrent project builds/tests. These facts are test conditions, not minimum hardware requirements.

| Metric | Observed |
|---|---:|
| Authenticated workspace readiness, nine launches | 2.18–2.35 s; median 2.21 s |
| Idle engine-tree working set / private commitment | 80.45–80.77 / 47.84–48.41 MiB |
| DOCX sampled import working set / private commitment | 112.86–128.52 / 67.01–81.74 MiB |
| Ten-page PDF sampled import working set / private commitment | 112.93–128.20 / 67.29–81.75 MiB |
| Fifty-candidate analysis sampled working set / private commitment | 80.70–80.89 / 48.84–49.41 MiB |
| Warm local-analysis request duration, fifteen requests | 32.35–41.76 ms; median 34.83 ms |
| Idle engine temporary extraction, each run | 30,642,190 bytes (29.22 MiB) |
| Non-temp synthetic workspace files after each workload | 24,771 bytes |
| Remaining sampled owned process identities after helper cleanup | Zero in all nine runs |

The DOCX fixture contains 1,000 repeated synthetic paragraphs; PDF contains ten pages of forty synthetic lines. Local analysis uses the checked-in `bounded-50` pool and verifies all fifty returned matches. Real health must report ready database/storage, and real imports must return the generated text. Each report records the engine and exact request/document SHA-256; DOCX archive timestamps make its byte hash differ across launches. No personal records, credential operation, provider search, result-page request or inference is part of the measurement. Normal health retains the optional local-runtime status probe on loopback.

There are only **two memory samples per import and one per analysis run**, taken with CIM enumeration plus a 100 ms pause. Short peaks can be missed; working-set sums can count shared pages repeatedly. Only successfully matched process identities contribute; a live member that exits or cannot be matched during sampling can be omitted, so these are not exhaustive tree totals. Request timing covers the packaged local API, not search-provider latency or Results rendering. Disk values are snapshots, not peak temporary storage. Cleanup forcibly terminates only the benchmark tree and verifies sampled identities; this is not normal-close or comprehensive descendant acceptance.

The existing provisional installer-size, engine-readiness, idle-private-memory and sampled-import investigation thresholds pass for these fixtures. Stable full-desktop workload measurements, online-search/Results peaks, reboot-cold startup and end-user hardware budgets remain open. Earlier installed-footprint and desktop observations below keep their original binary/workload scope.

Raw reports are retained separately under ignored `.local/resource-check/reports-a3d5e24dfd0746c496935015dcabeb32/`, without overwriting earlier evidence:

| Report | SHA-256 |
|---|---|
| `docx.json` | `4d0dd8f5f6fe23a8f2969ec9804fc6484730c06ff2e34470c63e86a54ef57d34` |
| `pdf.json` | `3f44c619efe84d939e4e1b54f0b1bbe1b2cd2df89cda40f8e7271e7316a01ce5` |
| `shortlist.json` | `4bcfbc97433df7909b801a5f6f134c9705b5b9e3328bf2dba31ac3596a4182e1` |

## Earlier baseline — 2026-09-30 onward

Latest paired package and installed subset — 2026-10-20: [22D follow-up](progress/2026-10-20.md) verifies the current separate-identity production-code acceptance package. Production NSIS installer 23,263,424 bytes (22.19 MiB), desktop 14,706,688 bytes and engine 19,985,901 bytes; production artifact hashes preserved. Acceptance installation files total 34,771,938 bytes (33.16 MiB). Three ten-process snapshots measured 482.22/315.82, 484.60/283.30 and 478.54/295.72 MiB summed working set/private commitment, each including two frozen-engine and six WebView processes. Shared pages can be counted multiple times. These are individual synthetic setup/tracker observations, not stable idle means, cold-start timing, import/search/Results peaks, hardware recommendations or release budgets. Both normal closes leave zero owned processes; test uninstall and production-data preservation checks pass. No new online provider/page request or model workload. Earlier measurements below retain their original binary/workload scope.

Latest artifact update — 2026-10-11: the [work-requirement disclosure](architecture/0030-work-requirement-review-notes.md) passes frontend typecheck/build and final production Rust/NSIS rebuild with the existing unchanged engine sidecar. Installer 23,190,869 bytes (22.12 MiB); version remains 0.1.0. No new installed footprint/startup/idle/peak measurement. The installed snapshots below remain specific to their earlier measured binary; browser mock disclosure evidence is not native resource evidence.

Latest installed observations — 2026-10-11: [separate-identity release-mode installed acceptance](installed-acceptance.md) uses unchanged production UI/Rust/engine. Installed application files 34,568,859 bytes (32.97 MiB); normal package/artifact hashes preserved. Three ten-process snapshots: manual query 507.65 MiB summed working set / 365.45 MiB private commitment; reviewed synthetic profile 516.18 / 335.65; restarted saved-profile view 497.79 / 322.27. Each includes two frozen engine processes and six WebView processes. Shared pages can be counted multiple times; these are snapshots, not stable idle means, startup timing, workload peaks or hardware budgets. All three normal closes leave zero owned processes. No online provider/page request, model inference/download, import or search/Results peak measurement; production health polling retains the local Ollama status check. This supersedes the no-new-installed-observation statement immediately below only for this bounded separate-identity subset.

Latest artifact update — 2026-10-11: bounded ATS title evidence (decision 0029) is included in the paired engine/frontend/Rust/NSIS rebuild, passing at 23,191,627 bytes (22.12 MiB). No new installed footprint, peak RAM, startup or native interaction measurement. Earlier installation/resource observations below apply to their measured binaries; current installed acceptance remains pending.

Measured the existing Windows release sidecar from the profile-storage build (commit `840edfc`), with three fresh process launches, an isolated empty database, and no model. These are warm filesystem-cache launches, not reboot-cold measurements. No personal files were used.

| Metric | Observed |
|---|---:|
| NSIS installer | 22.04 MiB |
| Release desktop executable | 13.62 MiB |
| Release engine executable | 19.00 MiB |
| Engine temporary extraction | 29.22 MiB |
| Empty database | 12 KiB |
| Installed application files, including uninstaller | 32.69 MiB |
| Launch to authenticated health response | 2.16–2.20 seconds |
| Idle engine-tree working set | 81.25–81.44 MiB |
| Idle engine-tree private committed memory | 48.04–48.41 MiB |
| Sampled DOCX import peak working set | 121.29–122.18 MiB |
| Sampled DOCX import peak private committed memory | 73.19–74.52 MiB |
| Sampled PDF import peak working set | 122.63–129.14 MiB |
| Sampled PDF import peak private committed memory | 74.82–81.75 MiB |

The fixture contains 1,000 repeated synthetic paragraphs. The import succeeds through the production authenticated API and isolated parser worker. These measurements include the single-file launcher and its descendants, including the parser during import. Summed working sets can count shared pages more than once; private committed memory is reported separately. CIM enumeration plus a 100 ms pause samples memory and may miss brief peaks. This is neither a maximum-size document stress test nor a memory-safety ceiling.

PDF continuation: three generated 20-page documents with 40 synthetic lines per page passed extraction. Engine readiness was 2.23–2.35 seconds and idle private commitment was 47.50–48.09 MiB. PDF peak values above come from these separate runs; they are sampled observations for this fixture, not universal bounds.

Native continuation: one snapshot of the existing production desktop process tree (My profile with its file dialog open) covered 11 processes, including WebView2 and the engine. Summed working set was 617.05 MiB and private commitment was 342.19 MiB. This is a single interactive-state observation, not a stable idle baseline or import peak. Shared working-set pages may be counted more than once. It shows why engine-only numbers must not be presented as total desktop memory. The source-level startup loading fix below has not yet been packaged into this measured binary.

## Reproduce

Build with `npm run desktop:build`, then run from Windows PowerShell 7:

```powershell
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format pdf
```

Requires permission to enumerate Windows processes. No extra package is installed. The script creates a fresh session credential in memory, binds only to loopback, bypasses proxies, generates its own DOCX, and prints only metrics. It kills only its own process tree on exit. Isolated databases/temp directories remain under ignored `.local/resource-check/` for inspection; they may be removed after the run. Existing app data is untouched. Startup failures/timeouts and unsuccessful imports fail the run.

The current helper emits a versioned JSON object with `engine` SHA-256/byte size, hardware facts, scope and `runs`; earlier unbound arrays remain historical. It verifies the real workspace health response, fingerprints each generated workload, reports the number of memory samples and checks sampled process identities after cleanup. CIM process timestamps are compared at their microsecond precision so a reused PID is not accepted as the earlier process. An engine change before, during or after the run rejects the report. Synthetic benchmark cleanup forcibly stops its own engine tree and does not establish normal shutdown acceptance.

Use `-EnginePath` to measure a specific staged sidecar instead of assuming the default release-folder copy is current:

```powershell
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format docx -EnginePath apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe
```

Use an otherwise idle machine and retain each output separately. Compare the reported engine identity to the exact installer/package receipt before treating it as current-package evidence. The health request includes the application's existing optional local-runtime loopback status probe; it performs no inference, online search, provider-key read or result-page request. Hardware facts contain no machine name or local path. Memory sampling can miss short peaks, and extraction/data sizes are snapshots rather than peak disk use.

## Initial engineering gates

For this fixture and comparable hardware, investigate a median health time above 3 seconds, idle private commitment above 65 MiB, sampled import private commitment above 100 MiB, or installer size above 25 MiB. These are provisional regression investigation thresholds, not user-facing hardware requirements or performance promises. Revisit after full desktop measurements.

The largest measured additional disk cost is single-file engine extraction: 29.22 MiB alongside the 19.00 MiB executable. Benchmark a folder-based sidecar against this baseline before changing packaging; compare startup, installer/installed size, temp cleanup, worker isolation, cancellation, and update behavior. These measurements alone do not justify a packaging change.

Installed application-file footprint was measured during the [installation checks](installation-checks.md); it excludes retained app data, runtime extraction and shared WebView2. Stable full desktop idle/peak RAM, reboot-cold startup and search memory remain unmeasured. Installation checks exposed an orphan engine and incomplete uninstall; fix shutdown and repeat lifecycle checks. No search or optional-AI milestone is marked complete.

## Milestone 17 continuation — 2026-10-08

Measured the paired production sidecar and rebuilt desktop containing decision 0026. Three fresh process launches per engine fixture (nine total) use empty isolated databases and synthetic inputs. Filesystem caches are warm; this is not reboot-cold startup. No provider request or page fetch. Analysis uses the checked-in bounded fifty-candidate pool. The PDF fixture is now ten pages with forty lines per page, respecting today's import limit; it differs from the historical twenty-page baseline.

| Metric | Observed |
|---|---:|
| Final NSIS installer | 22.13 MiB |
| Desktop / engine executables | 13.86 / 19.04 MiB |
| Combined executable payload | 32.90 MiB |
| Engine temporary extraction / empty database | 29.22 MiB / 12 KiB |
| Engine authenticated readiness, all nine launches | 2.21–2.66 s |
| Idle engine-tree working set / private commitment | 81.53–81.96 / 48.11–48.75 MiB |
| DOCX sampled import working set / private commitment | 120.07–130.16 / 71.89–81.82 MiB |
| Ten-page PDF sampled import working set / private commitment | 119.57–129.64 / 71.98–81.68 MiB |
| Fifty-candidate analysis sampled working set / private commitment | 81.77–82.11 / 48.18–48.65 MiB |
| Warm analysis request duration, fifteen requests | 32.33–45.35 ms; median 35.96 ms |
| Historical 49-link frontend filter/group work | Five warm samples; median 3.18 ms |
| Final native initial-UI tree working set / private commitment | 491.61–491.82 / 318.52–318.55 MiB |
| Owned descendants after abrupt benchmark desktop exit | Zero; observed cleanup 0.66 s |

Existing provisional installer/engine startup/idle/import investigation thresholds pass for these fixtures. Executable payload is not installed footprint: it excludes the uninstaller, app data, temporary extraction and shared WebView2. No current installer was executed; earlier installed-size evidence remains historical.

Analysis polling includes CIM enumeration plus a 100 ms pause and can miss brief peaks. Five separate warm timed requests per launch avoid including memory enumeration in latency. Times cover packaged local API processing/response reading, not online discovery, Results rendering or interaction. Frontend work covers pure filtering/grouping in Node, not React/native rendering. Short snippets in the fifty-candidate fixture are synthetic diagnostics, not maximum-sized snippet stress tests.

`scripts/measure-desktop.ps1` samples one final native warm-cache launch after fifteen seconds, five snapshots a second apart, ten processes including WebView2 and the packaged engine. A preliminary build's launch was also sampled (about 325 MiB private commitment); the table uses the final rebuilt binary. This is an initial-view measurement in the existing workspace with no UI input or record operation. No profile, credential, title, path, process command line or screenshot is exported. Summed working sets may double-count shared pages. It does not establish connected UI state, general idle budgets, Results/search/import peaks, normal close or cold startup.

The native benchmark refuses to start if JobScout is running. It stops only its own desktop and uses process ID plus creation time to check descendants; the owner watcher cleaned them up. It does not install/uninstall, stop unrelated processes or delete data. Interactive controls failed to initialize; native keyboard/theme/window-size/Results acceptance remains pending in the [17D matrix](milestone17-acceptance.md).

Additional reproduction:

```powershell
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format shortlist
pwsh -NoProfile -File scripts/measure-desktop.ps1
```

Raw outputs remain ignored local artifacts. No measured regression justifies a worker, dependency, packaging or hosted-service change.

## Synthetic discovery responsiveness — 2026-10-10

Native development acceptance continuation: the isolated `acceptance:native` harness runs the production Rust/WebView shell with a frozen synthetic sidecar and fresh database. A forty-candidate Results snapshot measured ten owned processes, 628.07 MiB summed working set and 465.49 MiB private commitment. This debug-shell snapshot is not a peak, release-build or live-performance measurement; summed working sets can double-count shared pages. Normal Results close and active-search close left zero owned processes and launcher processes. A final complete run retained fifty candidates and its normal close removed the newly inventoried temporary database. No installed app, actual-provider latency, production search/import peak or cold-start claim follows. See [the bounded native evidence](milestone17-acceptance.md#native-development-acceptance--2026-10-10).

Latest target-revision package: paired build passes at 22.12 MiB; scoped silent installer retest measures 34,565,020 bytes (32.96 MiB) installed. Existing profile database is unchanged; install/reinstall/uninstall pass. No new RAM/startup measurement; engine/transport unchanged.

Current silent installation measures application files including the uninstaller at 34,562,914 bytes (32.96 MiB). This excludes personal data, sidecar temporary extraction and shared WebView2. Install/reinstall/uninstall and unchanged existing profile database checks pass; see [installation checks](installation-checks.md). No installed native window was opened during this measurement.

The [17D acceptance matrix](milestone17-acceptance.md) records nine development-engine HTTP runs using one-second mock provider waits. Concurrent health/progress requests remained available (maximum 25.31/17.73 ms); cancellation returned earlier safe results in 4.84–9.37 ms and skipped later dispatch. Reproduce using `scripts/measure-discovery.py` as described in [acceptance preview](acceptance-preview.md). These are local API observations with the client and server sharing a Python event loop, not native rendering, packaged sidecar memory, live latency or billing. The benchmark exposed and verified a fix for SQLite handle cleanup; it does not establish normal native close or installer cleanup.
