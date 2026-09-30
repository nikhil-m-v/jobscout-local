# Production engine baseline — 2026-09-30

Measured the existing Windows release sidecar from the profile-storage build (commit `840edfc`), with three fresh process launches, an isolated empty database, and no model. These are warm filesystem-cache launches, not reboot-cold measurements. No personal files were used.

| Metric | Observed |
|---|---:|
| NSIS installer | 22.04 MiB |
| Release desktop executable | 13.62 MiB |
| Release engine executable | 19.00 MiB |
| Engine temporary extraction | 29.22 MiB |
| Empty database | 12 KiB |
| Launch to authenticated health response | 2.16–2.20 seconds |
| Idle engine-tree working set | 81.25–81.44 MiB |
| Idle engine-tree private committed memory | 48.04–48.41 MiB |
| Sampled DOCX import peak working set | 121.29–122.18 MiB |
| Sampled DOCX import peak private committed memory | 73.19–74.52 MiB |

The fixture contains 1,000 repeated synthetic paragraphs. The import succeeds through the production authenticated API and isolated parser worker. These measurements include the single-file launcher and its descendants, including the parser during import. Summed working sets can count shared pages more than once; private committed memory is reported separately. CIM enumeration plus a 100 ms pause samples memory and may miss brief peaks. This is neither a maximum-size document stress test nor a memory-safety ceiling.

## Reproduce

Build with `npm run desktop:build`, then run from Windows PowerShell 7:

```powershell
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3
```

Requires permission to enumerate Windows processes. No extra package is installed. The script creates a fresh session credential in memory, binds only to loopback, bypasses proxies, generates its own DOCX, and prints only metrics. It kills only its own process tree on exit. Isolated databases/temp directories remain under ignored `.local/resource-check/` for inspection; they may be removed after the run. Existing app data is untouched. Startup failures/timeouts and unsuccessful imports fail the run.

## Initial engineering gates

For this fixture and comparable hardware, investigate a median health time above 3 seconds, idle private commitment above 65 MiB, sampled import private commitment above 100 MiB, or installer size above 25 MiB. These are provisional regression investigation thresholds, not user-facing hardware requirements or performance promises. Revisit after full desktop measurements.

The largest measured additional disk cost is single-file engine extraction: 29.22 MiB alongside the 19.00 MiB executable. Benchmark a folder-based sidecar against this baseline before changing packaging; compare startup, installer/installed size, temp cleanup, worker isolation, cancellation, and update behavior. These measurements alone do not justify a packaging change.

Installed footprint, full desktop/WebView2 RAM, reboot-cold startup, PDF import peaks, search memory, and clean install/uninstall behavior remain unmeasured. Next: verify native synthetic DOCX save/restart/delete and installer lifecycle, then complete those desktop measurements. No search or optional-AI milestone is marked complete.
