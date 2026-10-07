# Synthetic shortlist quality baseline

## Milestone 17B clean-pool evaluation — 2026-10-06

`npm run evaluate:shortlist` now also runs the checked-in synthetic ATS pool in `scripts/evaluate-candidate-pool.mjs`. The 49-link fixture covers all five sources: 44 posting shapes, five boards, two outside-scope hosts and nine same-employer/full-title links with different IDs. Production pool helpers form 41 expandable groups while retaining every link/snippet. Reversibly hiding boards leaves 36 groups containing all 44 posting links; disabling grouping/restoring boards recovers all 49 individual rows. Unknown/query-selected/lookalike routes, different titles/tenants, placeholder titles, originating-scope validation, filtering before grouping and escaped alternatives have separate regression tests.

Offline replay of the earlier public result yields the same counts, with historical source blocks explicitly reconstructed because the old response lacked provenance. No new provider request. These are candidate groups, not verified unique opportunities. Existing seven relevance pools and all 59 relevant labels remain unchanged; their retention and top-five/top-ten guards still pass. See [decision 0024](architecture/0024-clean-candidate-pool.md).

Latest increment (2026-10-06): seven pools now contain 114 raw candidates and 59 labeled relevant candidates. [Decision 0021](architecture/0021-shortlist-evidence-and-coverage.md) adds literal tools, title-role priority, narrow exclusions and collection-page separation. Historical skill-count and reviewed-role rows remain explicit baselines; the new Evidence-led shortlist row uses current production behavior. New tool/title and collection cases improve top-five relevance 40→80% and 40→100% against prior reviewed-role ordering; retained sets are identical and all 59 relevant labels survive. First-five/first-ten non-degradation guards pass across the corpus. Labels remain diagnostic, including explicit fixture-specific cloud preferences; there is no general rule that Azure makes a software job irrelevant.

A separately authorized live five-query trial completed in 12.636 seconds, producing 23 unique pages after 24 duplicate links were removed. All titles show collection signals; this is evidence of inadequate individual-opening coverage for those generic criteria, not 23 verified jobs. Public raw results remain local and are not part of this synthetic corpus. Billing/full desktop resources and UI interaction remain unverified. See today's progress note for next action.

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

## Reviewed-role ordering — 2026-10-06

Decision [0020](architecture/0020-reviewed-role-ordering.md) prioritizes the reviewed role's title/snippet mentions before unknown/other-role mentions in resume-assisted Results. The evaluation adds an explicit comparison row, retaining prior baselines. It asserts identical candidate sets and non-degraded top-five relevance across all five pools.

Developer top-five relevance improves 60% to 80%; analyst 40% to 60%; aliases/unknowns and content ambiguity remain 60% and 80%. Constructed broader top-ten improves 0% to 100%, with all 40 non-resource candidates and 30/30 relevant retained. All 47 labeled relevant candidates remain across the corpus. These fixtures do not establish live quality. Negation, incomplete role aliases, adjacent roles, generic navigation, preferences and freshness still need evaluation. Interactive verification remains blocked by tool initialization; reviewed live-provider evaluation remains pending.
## Reviewed source trial after link reliability fix — 2026-10-06

An explicitly authorized fresh run used the exact generic query `Software engineer jobs India Remote Python SQL` with the five fixed source scopes. Five basic responses completed in 15.781 seconds, without retries or listing-page fetches. Provider billing and full desktop resource use were not measured.

| Measure | Previous intent trial | Fixed-source trial after link fix |
|---|---:|---:|
| Raw results | 47 | 50 |
| Accepted unique canonical links | 23 | 49 |
| Canonical duplicates removed | 24 | 0 |
| Unsupported URLs discarded | 0 | 1 |
| Collection-title signals | 23 | 0 |
| Individual-posting URL shapes | Not established | 44 |
| Board URL shapes | Not assessed | 5 |

These are different provider responses, not a controlled quality benchmark. URL shapes are a manual inspection of returned URLs, without page retrieval, and do not establish live vacancies. Three Ashby employer-root and two SmartRecruiters careers-root URLs account for the five board shapes. The local text classifier misses them (11 opening-language and 38 unknown statuses). Two careers-root URLs also fall outside the exact requested SmartRecruiters hosts. Nine Lever results repeat the same Latin America software-role title with different job IDs; unique URLs are not necessarily distinct suitable opportunities.

Local title/snippet analysis with a synthetic reference finds 32 software-engineer title-category mentions, 14 India mentions, 27 remote mentions and 20 literal Python-plus-SQL overlaps. Only two candidates combine all four signals. These are mentions, not confirmed requirements, eligibility or fit. Keep unknowns available. Next evaluations should cover ATS board paths, source-scope adherence, repeated-title ambiguity, and location/work-mode evidence; do not claim milestone 17 completion from link volume.

## Milestone 17C continuation — 2026-10-07

`npm run evaluate:shortlist` now includes `evaluation/relevance-cases.json` and compares prior mention filters, source-linked filters and strict source-linked filters through production local analysis and frontend filtering. All eight pools retain 66/66 relevant/reviewable labels with default source-linked filtering. The targeted twelve-candidate case improves first-five fixture relevance from 60% to 100% and retention from 6/7 to 7/7 versus prior mention filtering; strict source-linked filtering keeps four supported cases. Unknown/conflicting labels represent candidates requiring review, not established suitability. The earlier analyst pool preserves more noise (80% to 60% first-five), and strict filtering empties it. This conservative tradeoff and unsupported geography limits are documented in decision 0025. No live requests or representative vacancy claim.

## Historical review and ATS metadata continuation — 2026-10-08

Decision 0026 adds explicit ATS remote/country and regional restriction evidence and an offline replay tool requiring an explicit public-result envelope. The old response's source counts are marked reconstructed. All 49 unfiltered links remain in 41 groups. With boards hidden and software-engineer/India/remote filters, initial 17C rules left 41 links/33 groups; the correction leaves 31 links/groups. Nine Latin America links and one EMEA link now contradict India. Only one survivor supports all three categories. Among the first ten survivors, ten support the role, two India and two remote. This is source coverage, not labeled relevance or verified suitability; no fresh search/page request or freshness verification.

Nine synthetic pools now retain 72/72 reviewable labels by default. The new case covers standalone remote-country lines, labelled cities followed by explicit countries, role-specific remote language, disjoint areas, incidental customer geography, partial-remote uncertainty and conflicts. EMEA/Europe/UK and Latin America/US territory overlap remain uncertain. Historical pure filtering/grouping took a five-sample warmed median 3.18 ms; this does not measure UI responsiveness. See the resource report and 17D acceptance matrix for packaging/native evidence and blockers.
