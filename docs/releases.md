# Release plan

Adopted: 2026-10-10. This plan owns release scope; [roadmap.md](roadmap.md) retains the numbered implementation sequence. It replaces the older thirty-session delivery estimate. No release date, version bump, publication or automated deployment is implied.

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
- Canonical links, source/time provenance, conservative repeated-role grouping, reversible filters and deterministic ordering with exact evidence, contradictions and unknowns. Target 10–20 suitable unique opportunities when available; retain larger pools and report shortfalls without padding or automatic extra spend.
- Local saved jobs and a small tracker with saved/applied/interview stages and private notes. Applying remains an explicit external activity; no automatic submission.
- Storage, retention and deletion controls for profile/jobs/notes and app-owned derived data, with original-file/vault/shared-runtime/uninstall limits explained.
- Guided Windows core setup, Light/Dark/System, keyboard access, compact layout, reduced effects and readable error recovery. No model/runtime download prerequisite.
- Reproducible checks, Windows packaging, contributor/setup documentation and a synthetic end-to-end demo. CI stays the dedicated milestone 23 increment.

These are requirements, not claims of implementation. Saving jobs, tracking, full data controls and guided setup remain planned. The application stays version 0.1.0 until an intentional version/release change is requested after acceptance.

## v1.0 completion gates

| Gate | Completion evidence |
|---|---|
| Privacy | Captured synthetic requests, strict engine validation and installed behavior exclude private markers/records; malformed input, redirects and untrusted job content cannot broaden outbound permissions |
| Useful shortlist | Finish 17D and milestone 21 representative review: first-ten/full-shortlist relevance, unique-opportunity evidence, filter adherence, contradictions/unknowns, source coverage, freshness limits, latency and cost. Raw links/groups or one narrow query are insufficient; ten jobs are not promised for every search |
| Durable local workflow | Synthetic save/restart/update/delete tests for jobs and tracker records, duplicate prevention, source/time preservation, retention/deletion and migration evidence |
| Windows experience | Installed first run, upgrade where an earlier version exists, normal/active-work close, recovery, accessibility/themes/compact checks, setup/runtime skip paths and installation/uninstallation limits |
| Resources | Separate shipped/installed/temp sizes, cold start, idle and import/search/Results peaks; measured budgets and hardware/test limitations |
| Reproducibility and release review | Milestone 23 CI/build checks, passing current suites, verified package, synthetic demo, setup/privacy/recovery docs and explicit release review; honest signing/distribution limitations |

Privacy, quality and lifecycle failures remain blockers. Narrow-query scarcity is recorded and investigated through approved scope rather than disguised as success. Release planning grants no network or publication permission.

## Small delivery sequence

| Order | Increment | Next concrete outcome |
|---|---|---|
| 1 | Finish 17D | Bounded ATS title correction/replay complete; installed/full accessibility and representative quality/resource checks remain. Two joint-support groups in the saved trial do not meet the suitable-evidence gate; see [results](17d-live-results-2026-10-10.md) |
| 2 | 18 — Local saving | One bounded persistence workflow after the shortlist gate |
| 3 | 19 — Basic tracker | Stages/notes with restart/delete evidence |
| 4 | 20 — Data controls | Deletion/retention across implemented records |
| 5 | 21 — Quality review | Evaluate the stable core and fix the largest demonstrated issue |
| 6 | 22 — Guided core setup | Storage/provider/skip/recovery without a model prerequisite |
| 7 | 23 — v1.0 release candidate | CI/Windows packaging, fresh-user/upgrade checks, demo/docs and review of all release gates |

Keep milestone identifiers and evidence history. Advance one coherent feature, fix or acceptance slice per session; update [MEMORY.md](../MEMORY.md) and dated progress. Revisit optional release scope after v1.0 instead of pulling future features into the core.
