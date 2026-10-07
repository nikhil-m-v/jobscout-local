# Milestone 17 acceptance — 2026-10-08

Overall status: **partial**. Historical review and bounded resource checks are complete for this continuation; suitable opportunity coverage and interactive acceptance are not established.

| Check | Evidence | Status |
|---|---|---|
| Lossless historical replay | All 49 links retained in 41 unfiltered groups; source provenance explicitly reconstructed | Pass, offline only |
| Role/India/remote evidence | Five boards hidden; 31 surviving links/groups; only one supports all three; first ten have ten role/two region/two remote supports | Coverage shortfall; not 30–50 suitable opportunities |
| Contradictions versus unknowns | Ten disjoint remote-area links identified; overlapping geography, sparse snippets and conflicts retained conservatively | Pass for bounded rules |
| Synthetic retention and privacy boundaries | 72/72 reviewable labels across nine pools, clean-pool evaluation, 88 frontend and 326 engine tests | Pass; not live vacancy verification |
| Current Windows bundle | Final frontend, Rust shell and paired Python sidecar produce 22.13 MiB NSIS installer | Pass; installer execution not performed |
| Engine startup/idle/import resources | Three launches per DOCX, PDF and local-analysis fixture; within existing provisional thresholds | Pass for measured fixtures |
| Full native process resources | Initial UI tree measured without UI input; owner termination leaves zero owned descendants | Measured; excludes Results/import peaks and normal UI close |
| Reviewed broader preview/single opt-out/progress/stop/partial recovery | Existing synthetic state/request/render tests pass | Interactive/native pending |
| Keyboard grouping/filter/reset/retry | Existing native details/select controls; synthetic lossless/escaped rendering tests pass | Interactive/native pending |
| Light/Dark/System, compact sizes, focus and opaque fallbacks | Shared semantic styles remain; no new material treatment | Interactive/native pending |
| Fresh-user installer wizard, version upgrade and normal-close lifecycle | Prior installation checks are historical; current installer was not executed | Pending |
| Representative live relevance, freshness, billing and search/Results peak RAM | No new provider request, page retrieval or live UI search in this continuation | Pending |

## Interactive continuation

Automation initialization failed before any app input. Windows helper reported `helper_unknown_error: apply deny-read ACLs`; browser control reported its trusted process exited unexpectedly. These are environment/tool initialization failures, not automatic approval-review rejections. Do not modify ACLs or bypass the automation boundary. Resource scripts and tests can run through the scoped approved shell.

When supported controls are available, use an isolated synthetic workspace and a dispatch-disabled provider harness. Exercise manual and resume paths, query edits/invalidation, every displayed fixed source scope, single opt-out, progress, stop with completed results, provider failure and retry. Verify no hidden provider retry or personal fields. In Results, expand every repeated-role alternative, select role/region/arrangement filters, compare unknown/conflict handling, enable strict mode, reset, clear and navigate back. Check keyboard focus, readable contrast, both themes/System, compact and wide windows, reduced motion and opaque fallback. Capture synthetic screenshots when possible. Repeat normal native close, active-work close and restart, inspecting only app-owned descendants.

A live trial requires a fresh explicit review of the exact generic query/source plan and spending limit; the historical trial's authorization does not cover a new run. Do not start saving/tracking or optional AI on the assumption that candidate count meets the shortlist gate.

## Reproduce the completed subset

```powershell
node --experimental-strip-types --test apps/desktop/tests/*.test.mjs
.venv\Scripts\python.exe -m pytest -p no:cacheprovider --basetemp=.local/pytest-acceptance
npm run evaluate:shortlist
npm run desktop:build
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format shortlist
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format docx
pwsh -NoProfile -File scripts/measure-engine.ps1 -Runs 3 -Format pdf
pwsh -NoProfile -File scripts/measure-desktop.ps1
```

Historical replay requires an explicit locally saved public result envelope:

```powershell
node --experimental-strip-types scripts/review-historical-pool.mjs <local-public-result.json> 9,10,10,10,10
```

Only supply source counts for the historical pre-provenance response when those source blocks are established. Current responses already carry provenance; omit the counts argument. The native process benchmark opens the initial UI in its existing workspace without input, then terminates only the process it started. It refuses to run when another JobScout process exists. It performs no search or record operation; existing data is retained. Engine benchmarks use fresh isolated storage with synthetic inputs. Neither script installs, upgrades or uninstalls anything.
