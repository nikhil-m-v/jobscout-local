# Production engine baseline — 2026-09-30

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

Current silent installation measures application files including the uninstaller at 34,562,914 bytes (32.96 MiB). This excludes personal data, sidecar temporary extraction and shared WebView2. Install/reinstall/uninstall and unchanged existing profile database checks pass; see [installation checks](installation-checks.md). No installed native window was opened during this measurement.

The [17D acceptance matrix](milestone17-acceptance.md) records nine development-engine HTTP runs using one-second mock provider waits. Concurrent health/progress requests remained available (maximum 25.31/17.73 ms); cancellation returned earlier safe results in 4.84–9.37 ms and skipped later dispatch. Reproduce using `scripts/measure-discovery.py` as described in [acceptance preview](acceptance-preview.md). These are local API observations with the client and server sharing a Python event loop, not native rendering, packaged sidecar memory, live latency or billing. The benchmark exposed and verified a fix for SQLite handle cleanup; it does not establish normal native close or installer cleanup.
