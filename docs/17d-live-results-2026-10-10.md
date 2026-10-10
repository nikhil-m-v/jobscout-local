# 17D bounded live quality evidence — 2026-10-10

Status: **one approved run completed; 17D remains partial**. The user explicitly approved [the exact public plan](17d-live-review.md) in the current chat. That approval is consumed. No additional query, retry, page retrieval, account-usage check or purchase is authorized by this evidence.

Restriction-review update — 2026-10-11: [decision 0030](architecture/0030-work-requirement-review-notes.md) exposes bounded, source-linked work requirements separately from role/region/remote support. Offline review of all 47 saved candidates finds five explicit cases: two working-hour, one physical-location, one authorization and one unavailable-visa-sponsorship statement. All five remain among the same 33 selected default groups. The same two strict/joint-support groups remain, with one now visibly flagged for physical location within named timezones. No country/timezone eligibility inference or filtering/ranking change; no new provider/page request. These notes explain unresolved restrictions, not verified suitability. The original trial measurements below remain historical.

Update — 2026-10-11: [decision 0029](architecture/0029-bounded-ats-title-evidence.md) implements the narrow title correction identified below. Offline replay of the same envelope retains all 47 links and 33 selected reviewable groups; recognized joint role/India/remote support and strict survivors increase **0 → 2**. First-ten support remains ten roles/two India/three remote and zero joint-support results. One supported title combination has timezone language requiring review. This improves evidence extraction, not verified suitability; the ten-opportunity gate remains unmet. No new search or page fetch. The tables below preserve the original pre-correction measurements.

## Dispatch and bounds

The production plan and adapters searched `Software engineer jobs India Remote Python SQL` sequentially across five fixed ATS scopes. Criteria were controlled test preferences, not extracted from a profile. Exact-plan verification ran before vault access; 94 mocked discovery/adapter checks passed before dispatch. The one-use local runner read the existing OS-vault key internally and did not open profile storage or a model. An exclusive approval marker prevents replay after uncertain outcomes.

| Source | Accepted links before cross-source deduplication | Request duration |
|---|---:|---:|
| Greenhouse | 7 | 2.398 s |
| Lever | 10 | 3.053 s |
| Ashby | 10 | 3.866 s |
| Workday | 10 | 3.552 s |
| SmartRecruiters | 10 | 2.526 s |

All five requests completed in **15.398 seconds**, within the seventy-five-second limit. The envelope retained **47 safe canonical unique links**, with zero duplicates removed and zero invalid results discarded. No automatic retry or result-page fetch occurred. The estimated ceiling was five basic-search credits; actual billed usage was not checked. Tavily's [official credit documentation](https://docs.tavily.com/documentation/api-credits), checked on this date, specifies one credit per basic search.

Normal provider authentication/network metadata and the reviewed generic query/options were outbound. No resume, profile, private career text, match evidence, notes or local path was sent. Provider-parsed candidate text, summary and the approval marker remain in ignored local storage; only aggregate evidence is recorded here. This is a direct production-adapter trial, not an installed UI search or a measurement of native search/Results peak RAM.

## Offline review of this fresh envelope

Reused `scripts/review-historical-pool.mjs` with this newly acquired envelope and no provenance-reconstruction argument. Despite its historical-replay report label, the input here is the fresh run above; evaluation itself is entirely offline. Production engine local analysis uses a synthetic reference, `Software engineer Python SQL`, and production frontend validation/filter/grouping rules. No real resume is involved. The analysis does not fetch pages or establish vacancy freshness, eligibility or personal suitability.

All 47 links survive unfiltered replay in 47 groups. URL shapes identify 38 posting patterns and nine boards; these classifications do not verify active vacancies. Two SmartRecruiters results have a careers host outside the requested include-domain scopes. Source provenance records the dispatched scope, not a guarantee that the provider obeys it. Both are board shapes; hiding boards excludes them without dropping safe unfiltered links.

| Evidence in all returned links | Supported | Contradiction | Conflict | Unknown |
|---|---:|---:|---:|---:|
| Software engineer role | 25 | 4 | 0 | 18 |
| India | 5 | 1 | 0 | 41 |
| Remote | 8 | 0 | 0 | 39 |

Selected role/India/remote filters, boards hidden and unknowns retained, leave **33 links in 33 reviewable groups**. Their evidence supports 25 roles, four India locations and six remote arrangements, but **zero groups support all three simultaneously**. The first ten locally ordered candidates support ten roles, two India locations and three remote arrangements, also with zero joint support. Strict filtering leaves zero. The reviewable-group threshold is exceeded while the suitable-opportunity evidence gate is not; these are different measures.

Warm local frontend filter/group median was 3.09 ms across five samples after two warmups. This excludes parsing/import, native rendering and provider latency; it is not a performance guarantee or peak-resource measurement.

## Targeted evidence audit and next small change

Inspected the twelve returned candidates with recognized India or remote support, including ones later excluded by selected filters. Sparse Workday location text, employer-wide flexible-work prose, incidental company geography and a different data-engineer role cannot confirm the requested combination. A remote title paired with timezone restrictions remains an eligibility uncertainty.

The audit also identifies narrow extraction gaps: a `Software Development Engineer` title alias, an ATS title ending in `India at` an employer, and delimited `100% Remote - India` metadata. Current rules miss some explicit title evidence; the zero automatic joint-support count is not proof that no potentially relevant opening exists. A title can also disagree with the body, so broad country/remote keyword matching would be misleading.

Next concrete quality increment: add narrowly bounded synthetic positive and negative cases for those ATS title forms, retain exact phrases and unknown/conflict handling, then replay this saved envelope and existing labeled pools without another provider request. Do not turn employer boilerplate, geographical mentions or timezone restrictions into confirmed suitability. Further source/query trials or page checks require their own reviewed approval.

That title increment is now implemented with paired synthetic checks. Current next actions are installed/full accessibility acceptance and a bounded evaluation of remaining restriction/coverage uncertainty. No automatic follow-up dispatch is enabled.

The **10–20 suitable unique opportunities** gate remains unmet. One narrow query is not a representative multi-case benchmark. Installed first-run/version/lifecycle checks, full accessibility/OS checks, representative quality, freshness/billing limitations and production search/Results resource evidence remain open in [the acceptance matrix](milestone17-acceptance.md). Saving/tracking follow that gate under [the v1.0 release plan](releases.md).

## Validation and publication

94 mocked engine discovery/adapter checks passed. The restricted preflight stalled and was interrupted; the same tests passed with scoped process permission. The approved live run then completed once. Offline validation preserved every returned link and used engine-owned source provenance. No production code, dependency, schema, model or version change was made for this release-plan/live-evidence slice. Existing full-suite/build/package/native mock evidence remains prior evidence, not rerun here. Documentation changes are local and unpublished.
