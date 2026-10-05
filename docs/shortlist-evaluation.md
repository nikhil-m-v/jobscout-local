# Synthetic shortlist quality baseline

Run `npm run evaluate:shortlist` after the normal Node and `.venv` engine setup in README. The command always uses the checked-in synthetic corpus; it accepts no resume path, key, provider or arbitrary user input. No app server, credential store, database or search adapter is invoked. It calls production Python `analyze_review`, frontend `validateAssistance`, and `filterCandidates` rather than copying their logic. No new dependency or application behavior is introduced.

## Corpus and interpretation

`evaluation/shortlist-cases.json` contains four manually labeled ten-candidate pools and one constructed 50-candidate pool: developer content noise, analyst preference mismatches, and broad aliases/missing details. Every label has a reason independent of category counts. Compatible openings with unknown location or role-catalog details are labeled relevant for further review, not verified matches. Fixtures deliberately include misleading content, negation, adjacent titles, repeated broad categories and missing evidence.

These are adversarial diagnostic cases, not a representative sample or a measure of real provider quality. All URLs use a reserved example domain and are never fetched. The command prints provider order, resume ordering, reviewed filters with unknowns retained, and strict known filters. Precision at k uses the actual number displayed up to k; an empty list has n/a precision. Relevant retention uses all relevant candidates in that fixture as the denominator. Reducing displayed count cannot silently count missing candidates as successes. Noise IDs identify errors for inspection.

## Baseline — 2026-10-05

| Case | Provider top-five relevance | Resume top-five relevance | Reviewed filters top-five relevance | Relevant retained with reviewed / strict filters |
|---|---:|---:|---:|---|
| Developer content noise | 40% | 20% | 60% | 4/4 / 4/4 |
| Analyst preferences | 40% | 20% | 60% | 4/4 / 3/4 |
| Aliases and unknowns | 40% | 40% | 40% | 4/4 / 3/4 |

The current category-count order promotes guides/courses with many tool mentions and different-role jobs sharing tools. Role/region/arrangement filters improve two pools but cannot distinguish vacancy pages from career resources or interpret negated requirements. Broad AWS/Azure grouping also hides tool differences. Excluding unknowns loses a plausible opening in two cases. Exact phrase explanations expose mentions; they do not fix those limitations.

## Next improvement and gate

Before expanding discovery, add conservative local candidate-content classification with visible evidence and an unknown state. Evaluate whether it reduces guide/course/directory noise without dropping genuine sparse openings; do not treat absence of a hiring phrase as proof that a page is not a vacancy. Keep role compatibility and broad alias uncertainty reviewable. Compare any change against both quality and relevant retention using these fixed cases, then extend the corpus with independently labeled examples rather than tuning solely to these strings.

Broader fetching still needs an engine-owned reviewed query plan, disclosed maximum requests/credits, bounded total candidates/time, cancellation, cross-response deduplication, partial-failure handling and honest shortfalls. Historical baseline: analysis and provider results were capped at ten; the broader increment below supersedes the analysis/pool cap while each provider response stays capped at ten. This evaluation does not implement a 30–50-job shortlist or establish live vacancy status, freshness, coverage, cost, latency, native interaction or release readiness. A deliberate reviewed live-provider evaluation remains necessary. No release threshold is asserted from these three diagnostic cases.

## Content classification increment — 2026-10-05

Production analysis now classifies title/snippet signals locally (decision [0018](architecture/0018-local-content-signals.md)). Likely resource titles without competing opening language are hidden by default and can be restored. Sparse, conflicting and unsupported content stays unknown and visible. No provider call or website fetch is performed.

| Case | Resume top-five before / after content filtering | Reviewed-filter top-five before / after | Relevant retained after content filtering |
|---|---|---|---|
| Developer content noise | 20% / 60% | 60% / 80% | 4/4 |
| Analyst preferences | 20% / 40% | 60% / 80% | 4/4 |
| Aliases and unknowns | 40% / 60% | 40% / 80% | 4/4 |
| New content ambiguity pool | 60% / 80% | 60% / 80% | 5/5 |

The new pool includes sparse role titles, training benefits, course-author/directory-services jobs with opening language, mixed editorial/opening language and generic navigation. All 17 labeled relevant candidates survive content filtering. Each pool removes two explicit resource pages. `evaluate:shortlist` now asserts full relevant retention and non-degraded relevant counts among the first five compared with resume ordering with resources restored. The provider baseline always includes all resources; it is not silently filtered.

Remaining errors include wrong-role jobs, negated/incompatible skills, generic Careers pages and ambiguous mixed resources. Strict category filtering still loses plausible candidates. These four small diagnostic pools do not establish real-world accuracy, current vacancies, alpha readiness or 30–50-job coverage. Next: bounded broader discovery and wider independent evaluation, with interactive/native and reviewed live-provider checks still required.

## Bounded broader pool — 2026-10-05

Broader discovery now permits five reviewed basic searches of ten candidates each, with a 50-candidate aggregate ceiling, cross-response canonical deduplication, cancellation and partial coverage (decision [0019](architecture/0019-bounded-broader-discovery.md)). The evaluation accepts pools up to 50 and still uses no provider, credential store or personal data. Existing four cases and retention guards pass unchanged.

A new constructed 50-candidate pool has 30 labeled relevant openings (including sparse titles), ten guides and ten wrong-role jobs. Provider top-five/top-ten relevance is 60%; skill-count order promotes noise to 0%. Hiding resources alone still gives 0% because wrong-role jobs share more categories. Reviewed role filtering yields 30 displayed candidates, 100% first-five/first-ten relevance, and 30/30 relevant retention. This intentionally simple repeated-pattern pool checks scale and retention, not representative ranking quality. Across all five cases, content filtering retains all 47 labeled relevant candidates. Results underline why broader coverage alone does not satisfy milestone 17; reviewed role compatibility and richer ranking evidence remain necessary.

Synthetic captured-request tests independently verify five requests, 50 unique candidates and deduplication across responses. No live 30–50-job coverage, vacancy status, provider billing, latency or production resource claim follows from these fixtures. Next: interactively verify the full broader flow and cancellation, then run a deliberately reviewed live quality/resource/cost evaluation and fix the largest relevance issue.
