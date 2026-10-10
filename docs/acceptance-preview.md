# Synthetic interactive acceptance preview

Requirement-review fixture update — 2026-10-11: the two synthetic repeated-role links now contain separate working-hour/authorization and physical-location/unavailable-sponsorship clauses. Expand each **Work requirements to review** disclosure independently using Enter or Space. Verify literal source quotes and visible focus at compact width; notes must not change link/group counts, filters or ordering. No provider transport or storage-boundary change. Latest browser evidence is in [the dated progress note](progress/2026-10-11.md).

For installed release-mode production-code first use, local save/restart and normal shutdown, see [isolated installed acceptance](installed-acceptance.md). That separate-identity harness uses the real production engine and an empty credential namespace; it has no mock provider and must not be configured for online search. The development mock workflows below remain separate evidence.

Run the production browser UI and local engine with disposable storage and mock provider transports:

```powershell
npm run acceptance:preview
```

Open `http://127.0.0.1:1421/`. The page carries a synthetic-acceptance banner. This Windows development harness uses the existing engine/frontend dependencies, a random session token, an in-memory synthetic key and a fresh temporary database. It does not open the real credential vault, contact Ollama or send search/connection requests to Tavily. Both provider transports are injected mocks; there is no live-provider switch. Real replacement credentials are rejected. Use synthetic documents only. The harness is not part of the installed application.

Each simulated request takes six seconds. A full broader run yields 50 synthetic links. Fixtures include repeated titles within one employer, a board page, resource text, another role, explicit location contradictions, unknown and conflicting details, source-scope mismatches, and HTML-like text. They are exercise inputs, not suitable-opportunity labels. The intentionally repeated Greenhouse host tests source mismatch disclosure on the other four scopes.

For partial provider failure, close the preview first, then run:

```powershell
npm run acceptance:preview -- failure
```

Every second simulated request returns a rate-limit error. A broader run retains the first completed batch and stops after the failed second request. Further requests require explicit user action. Restarting resets the mock counter, synthetic key and database. Stop with Ctrl+C; the engine's owner watcher allows graceful exit and temporary-storage cleanup. Appearance preference belongs to browser local storage, so restore Follow system after theme checks. Abrupt machine/process shutdown can leave temporary files; this is not secure deletion.

## Windows native harness

With the existing Windows Tauri and engine packaging prerequisites installed, run:

```powershell
npm run acceptance:native
# Close its window normally before switching scenarios:
npm run acceptance:native -- failure
# Minimum supported native content size (760 × 640):
npm run acceptance:native -- complete --compact
```

This packages a separate frozen mock sidecar and launches the production Rust shell/WebView UI at port 1422. A generated, ignored Tauri override uses a separate synthetic application identifier and dev build cache; production configuration and distribution binaries are untouched. The native wrapper accepts the shell's data-directory argument but discards it: every run uses a fresh temporary database. Mock transports, offline model status and synthetic in-memory credentials are shared with the browser harness. There is no live mode or existing-database option; native-wrapper regression checks reject live options and non-random ports.

Use synthetic documents only. Display preferences persist in the separate test WebView storage, while imported text and results start fresh. The test window is named **JobScout — Synthetic acceptance** and displays the same no-live-search banner. Close that window normally to end the launcher, including when checking active-work exit. The production owner watcher lets the frozen mock sidecar finish shutdown and remove its disposable database. Record owned-process and temporary-directory cleanup rather than assuming it from window disappearance. Older interrupted preview directories may remain; this harness does not delete unrelated or older data.

The optional `--compact` flag follows the explicit `complete` or `failure` scenario. It only changes the generated test window's initial content size to the production minimum; scenario transports, storage isolation, production configuration and release binaries remain unchanged. Other flags and extra arguments are rejected. A successful compact launch establishes neither screen-reader accessibility nor OS preference propagation. If accessibility element bounds remain stale after scrolling, refresh and use the current screenshot or keyboard navigation; do not reuse offscreen coordinates.

Use the matrix below for both interfaces. Native harness evidence covers a development shell with a frozen mock sidecar, not an installed production launch, installer wizard, fresh Windows account, OS preference propagation, live search or complete accessibility audit. Restore Follow system and both manual reductions off after display checks. Port 1422 and the native test window must be free before starting another run.

## Interaction matrix

For an offline engine responsiveness check, run:

```powershell
$env:PYTHONPATH='apps/engine/src'
.venv\Scripts\python.exe scripts/measure-discovery.py --runs 3
```

This uses authenticated loopback HTTP against the production application with one-second mocked provider waits and fresh temporary databases. Three complete, cancellation and rate-limit runs assert dispatch limits and retained results while timing concurrent health/progress requests. It has no live mode and prints only counts/timing. The server and benchmark client share a development Python event loop; these measurements do not establish packaged/native rendering, RAM, live latency or billing. Temporary storage is removed after graceful server shutdown. Loopback access may need a scoped execution permission in restricted environments.

1. Search without a resume. Select public criteria; the first Find jobs prepares the exact query without dispatch. Inspect all five fixed domains and queries. Edit a category and verify the previous preview is invalidated.
2. Dispatch the reviewed synthetic plan. Observe progress and disabled dispatch controls. Stop after a completed batch; verify partial coverage and retained candidates. Retry deliberately. Opt out of broader discovery and verify one-request guidance and at most ten candidates.
3. In Results, expand organization and filter controls with the keyboard. Expand repeated-role alternatives; turn grouping off and verify link retention. Filter role/region/work mode, compare unknown/conflict retention with strict mode, reset, show resources/boards, and clear results.
4. Import a synthetic text DOCX/PDF with distinctive private markers. Review its text and generate suggestions. Check that only catalog categories appear in the query. Dispatch and inspect local shared-skill evidence; switch to manual preferences.
5. Inspect Light, Dark and Follow system, wide and compact windows, visible focus and theme persistence. Enable Reduce transparency and Reduce motion independently using Space. Verify solid surfaces, visible selected/focus states, reload persistence and useful textual progress/cancellation during slow work. Turning manual controls off must keep exposed system preferences; verify OS propagation separately. Settings deliberately clears query/results because provider configuration can change. Check the resulting recovery guidance.
6. Run the failure scenario. Verify partial results, readable rate-limit guidance, no automatic retry, and deliberate single-search retry.

Record the observations and screenshots in [milestone 17 acceptance](milestone17-acceptance.md). Browser checks do not establish native WebView rendering, Windows accessibility/OS preference propagation, installed footprint, normal native close, installer upgrade behavior, live relevance, freshness or billing. Manual motion/transparency reductions are available in Appearance; OS preference propagation and forced colors still require supported system controls or manual checks. Do not infer those OS checks from normal screenshots.
