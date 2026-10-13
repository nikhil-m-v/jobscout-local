# Release plan

Adopted: 2026-10-10. This plan owns release scope; [roadmap.md](roadmap.md) retains the numbered implementation sequence. It replaces the older thirty-session delivery estimate. No release date, version bump, publication or automated deployment is implied.

Delivery reset adopted 2026-10-11: [decision 0031](architecture/0031-core-acceptance-and-deferred-release-gates.md) gives 17D a finite core-development exit checklist. After it passes, local saving/tracking can proceed while representative quality (21) and full Windows/accessibility/resources acceptance (23) remain required for v1.0 release. The reset does not waive demonstrated privacy, data-loss or critical lifecycle defects.

17D status: **core acceptance complete; broader quality and release acceptance deferred**. Current checks pass and applicable bounded interactive/installed evidence is recorded in [the acceptance matrix](milestone17-acceptance.md#core-development-exit-checklist). [Local saving (18)](architecture/0032-bounded-local-job-snapshots.md) is implemented with automated restart/delete and synthetic browser evidence; native/installed saving follow-up remains owner 23. [Private tracking (19)](architecture/0033-private-application-tracking.md) is implemented with automated and synthetic browser evidence; [Reviewed data controls (20)](architecture/0034-local-career-data-controls.md) are implemented for current owned records/session copies. [Quality diagnosis and frozen automated review (21A/B)](search-quality-review.md), [paired query comparison (21C)](21c-query-comparison-results.md), [compact metadata correction (21D)](architecture/0035-compact-location-mode-metadata.md) and [approved additional-case review (21E)](21e-quality-case-results.md) are complete as development slices. 21D/21E are published as `7dba0f9`, with checkpoint `daede22`. [Structured-heading correction (21F)](21f-structured-heading-results.md) is implemented/verified and published as `aa0123a`. It moves the supported analyst opening into assisted first ten and strict filtering; the two case families still yield zero/one supported openings and representative quality remains open. Both acquisition approvals are consumed; no query/filter defaults or ranking weights changed. This is not v1.0 release readiness.

## Release boundaries

| Release | Useful outcome | Scope and entry gate |
|---|---|---|
| **v1.0 — Private job-search core** | Review a resume locally, find and assess jobs, save useful jobs and track applications on Windows | Foundations and milestones 17–23. Model-free deterministic matching, one search provider, saving/tracking, data controls, core setup and hardening. Complete the gates below before release |
| **v1.1 — Optional semantic matching** | Improve matching beyond literal words, evaluated locally | Milestones 24–26: reviewed embedding acquisition, local evidence features and weighted ranking. Start after v1.0; demonstrate quality gains, resource bounds and deletion behavior |
| **v1.2 — Optional local AI assistance** | Review grounded profile suggestions and explanations locally | Milestones 27–30: runtime/model setup, cancellable inference, evidence-backed summaries and optional evaluated reranking. Start from a stable matching baseline; verify factual fidelity, licensing, hardware and privacy |
| **Later releases — separately scoped** | Skills/certification advice, resume tailoring, application preparation/submission and background discovery | Define one narrow release before starting each capability. Submission and unattended features require their own privacy/consent/recovery gates |

Later version labels are planning targets. Do not combine the mature backlog into one large promised release. Models remain optional with no hosted fallback. Automatic applications, background services/scheduling, OCR, multiple-provider expansion, syncing, mobile support and network anonymity are outside v1.0.

## v1.0 requirements

The main journey is **local resume review or manual preferences → reviewed public query → candidates with local evidence → saved jobs → basic application tracking**. Saving a resume is optional. Users can skip online configuration and use available local functions.

- Local PDF/DOCX import, responsive parsing, editable review and explicit profile save/delete.
- One replaceable search adapter: masked OS-vault key setup, setup-later, exact query/source/cost disclosures, request/time limits, cancellation and partial recovery. No automatic search or retry; only reviewed generic catalog criteria leave the computer.
- Canonical links, source/time provenance, conservative repeated-role grouping, reversible filters and deterministic ordering with exact evidence, contradictions and unknowns. Aspire to 10–20 suitable unique opportunities when available, not a universal milestone pass condition; retain larger pools and report shortfalls without padding or automatic extra spend. Keep existing reviewable-group counts/below-ten guidance distinct from verified suitability.
- Local saved jobs and a small tracker with saved/applied/interview stages and private notes. Applying remains an explicit external activity; no automatic submission.
- Storage, retention and deletion controls for profile/jobs/notes and app-owned derived data, with original-file/vault/shared-runtime/uninstall limits explained.
- Guided Windows core setup, Light/Dark/System, keyboard access, compact layout, reduced effects and readable error recovery. No model/runtime download prerequisite.
- Reproducible checks, Windows packaging, contributor/setup documentation and a synthetic end-to-end demo. CI stays the dedicated milestone 23 increment.

These are requirements, not claims of implementation. Saving jobs and basic tracking are implemented with bounded evidence; current data controls are implemented with bounded evidence; guided setup remains planned. The application stays version 0.1.0 until an intentional version/release change is requested after acceptance.

## v1.0 completion gates

| Gate | Completion evidence |
|---|---|
| Privacy | Captured synthetic requests, strict engine validation and installed behavior exclude private markers/records; malformed input, redirects and untrusted job content cannot broaden outbound permissions |
| Useful shortlist — owner 21 | Representative independently reviewed cases: first-ten/full-pool relevance, unique-opportunity evidence, restrictions/filter adherence, contradictions/unknowns, duplicates, source coverage, freshness limits, latency and cost. Investigate/fix the largest demonstrated discovery weakness. Raw links/groups, synthetic retention or one narrow trial do not establish representative quality; no universal ten-job threshold |
| Durable local workflow | Synthetic save/restart/update/delete tests for jobs and tracker records, duplicate prevention, source/time preservation, retention/deletion and migration evidence |
| Windows experience — owner 23 | Current-package installed first run, normal wizard/shortcuts, fresh-user/runtime paths, upgrade where an earlier version exists, normal/active-import/search/abrupt-exit behavior and recovery, full accessibility/OS/themes/compact checks, setup skip paths and installation/uninstallation limits |
| Resources — owner 23 | Separate shipped/installed/temp sizes, cold start, idle and import/search/Results peaks; measured budgets and hardware/test limitations |
| Reproducibility and release review | Milestone 23 CI/build checks, passing current suites, verified package, synthetic demo, setup/privacy/recovery docs and explicit release review; honest signing/distribution limitations |

Privacy, data-loss and critical lifecycle defects block affected functionality. Representative quality and Windows readiness remain release gates; missing broader evidence no longer blocks independent saving/tracking development. Narrow-query scarcity stays recorded and investigated through approved scope. Release planning grants no network or publication permission.

## Small delivery sequence

| Order | Increment | Next concrete outcome |
|---|---|---|
| 1 | 17D — core acceptance complete | Finite checklist passes with applicable existing evidence and current checks; stop extending 17D. Broader quality/release checks have owners 21/23; see [closure status](milestone17-acceptance.md#core-development-exit-checklist) |
| 2 | 18 — Local saving — implemented | Bounded candidate snapshots, source/retrieval time, restart/delete/upgrade and synthetic browser evidence. Native/installed saving follow-up owned by 23; no suitability certification |
| 3 | 19 — Basic tracker — implemented | Reversible stages and bounded private notes; restart/delete/upgrade/conflict and synthetic browser evidence. Native/installed follow-up owned by 23 |
| 4 | 20 — Data controls — implemented | Count-only review, atomic profile/jobs/notes deletion, session clearing and explicit retained-data limits; native/installed follow-up remains owner 23 |
| 5 | 21 — Quality review — in progress | Finite diagnosis, frozen review, query comparison, compact correction, additional-case review and structured-heading correction complete. All five pools retain selected supported labels; discovery gaps remain. Next: finite quality exit checklist and one source/query investigation of missing job-specific evidence. Representative acceptance remains outstanding before v1.0 release |
| 6 | 22 — Guided core setup | Storage/provider/skip/recovery without a model prerequisite |
| 7 | 23 — v1.0 release candidate | Own deferred installed active-work/abrupt-exit, fresh-user/wizard/runtime/upgrade, full accessibility/OS and production-resource checks; CI/Windows packaging, demo/docs and all release gates |

Keep milestone identifiers and evidence history. Advance one coherent feature, fix or acceptance slice per session; update [MEMORY.md](../MEMORY.md) and dated progress. Revisit optional release scope after v1.0 instead of pulling future features into the core.
