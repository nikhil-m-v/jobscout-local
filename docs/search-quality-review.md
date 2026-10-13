# Milestone 21A — source coverage and ordering diagnosis

Date: 2026-10-13. Status: offline diagnostic slice implemented; milestone 21 remains in progress. [Decision 0031](architecture/0031-core-acceptance-and-deferred-release-gates.md) requires representative independently reviewed quality before v1.0 release. This report uses the saved [2026-10-10 approved trial](17d-live-results-2026-10-10.md), current production helpers and a synthetic reference. No new search, account check or result-page request was made.

Continuation 2026-10-14: [21D below](#milestone-21d--compact-locationmode-correction) changes compact metadata recognition. Earlier 21A/B numbers remain the measurements at those checkpoints; replay with the current helper produces the documented 21D counts.

Further coverage: [21E additional cases](21e-quality-case-results.md) records the separately approved quality-engineer/India/remote and data-analyst/Canada/hybrid acquisition and frozen assessment. Its exact one-use scope is [recorded separately](21e-provider-review.md). Earlier criteria, inputs and labels remain unchanged.

Current correction: [21F structured job-heading evidence](21f-structured-heading-results.md) improves the analyst opening's recognition/visibility without changing any original labels or the other four pool reports. Earlier 21A/B/C/D/E figures retain their checkpoint meanings.

## Reproduce and interpret

After the normal Node and `.venv` setup in [README](../README.md), run:

```powershell
npm.cmd run review:quality -- <local-public-result-envelope.json>
node --experimental-strip-types --test scripts/tests/search-quality-report.test.mjs
```

The runner defaults to one explicit local production result envelope for `Software engineer jobs India Remote Python SQL`, including engine-owned provenance. `--case software-india-remote` explicitly selects the approved B-arm query `Software engineer jobs India Remote`. Both use `Software engineer Python SQL` as the same synthetic local reference. The registered `--case quality-india-remote` and `--case analyst-canada-hybrid` select their own exact query/criteria/synthetic reference, documented in [21E](21e-provider-review.md#fixed-cases-and-purpose). Other case names/query mismatches fail closed. It has no source-count reconstruction, profile, credential, provider, page or model access. Existing `review-historical-pool.mjs` remains available for explicitly reconstructed older provenance. Malformed input and analysis errors produce a fixed message without input text or paths. Public raw responses stay in ignored local storage; the runner prints only aggregate diagnostics.

An optional second argument supplies a frozen review JSON for that same original input: `npm.cmd run review:quality -- <local-public-result-envelope.json> <local-frozen-review.json>`. See the 21B section below. The original diagnostics remain separate; attaching labels does not replace production assessments or fill verified-vacancy/representative-quality fields.

The report calls production engine analysis, frontend validation, filtering, URL inspection, grouping, relevance and requirement helpers. Per-source counts describe the originating request of retained links; cross-source duplicates keep their original engine attribution. These counts cannot reconstruct every source's pre-deduplication yield. Completed, attempted-but-incomplete and unattempted sources remain distinct. Single-query envelopes use an Unscoped bucket.

The comparison holds the same synthetic analysis and candidate pool constant. `selected_manual` disables assisted ordering; `selected_assisted` enables it. Both apply the fixed case's role/country/work-mode filters, hide collections/resources and retain unknowns/conflicts. This report's original case is software-engineer/India/remote; 21E uses its own registered criteria. These are deliberately selected evaluation filters; the Results screen initially resets to unselected local filters and shows collections. `all_returned_provider_order` restores all links, including resources/boards; strict mode excludes unsupported selected fields. These comparisons isolate ordering/filter effects and do not reproduce installed interactions or every possible resume.

First ten means the first ten **display groups**, with a separate count of primary links and groups containing a supported alternative. Full-pool counts retain every alternative. Joint support must occur in one reviewable link; separate links' attributes are never combined. A group can have a supported alternative and an unsupported primary. Supported groups, posting URL patterns and suspected repeats remain uncertain opportunity identities. Resource/collection pages cannot increase joint-support counts.

Independent relevance precision, verified suitable/unique vacancies, current vacancy status, provider latency and actual billed credits are `null`: the report does not measure them. Retrieval time is not posting time. Requirement notes are review prompts; their absence does not establish unrestricted or personally eligible work.

## Saved trial diagnosis

All five sources completed in the original run. Current replay preserves all 47 safe links in 47 unfiltered groups, including 38 posting URL patterns, nine boards and two outside-scope SmartRecruiters board links. Original engine duplicate/discard counts are both zero. Current evidence differs from the trial's pre-title-correction counts; historical measurements retain their original meaning.

| Originating source | Retained links | Posting / board patterns | Role support | India support | Remote support | Same-link joint-support groups |
|---|---:|---:|---:|---:|---:|---:|
| Greenhouse | 7 | 7 / 0 | 3 | 2 | 2 | 1 |
| Lever | 10 | 5 / 5 | 4 | 0 | 1 | 0 |
| Ashby | 10 | 8 / 2 | 5 | 3 | 5 | 1 |
| Workday | 10 | 10 / 0 | 9 | 1 | 0 | 0 |
| SmartRecruiters | 10 | 8 / 2 | 5 | 0 | 1 | 0 |
| **Total** | **47** | **38 / 9** | **26** | **6** | **9** | **2** |

| Controlled replay mode | Retained links / groups | Joint-support groups in full pool | Displayed first-ten groups | Primary joint support in first ten |
|---|---:|---:|---:|---:|
| All returned, provider order | 47 / 47 | 2 | 10 | 1 |
| Selected filters, manual order | 33 / 33 | 2 | 10 | 1 |
| Selected filters, assisted order | 33 / 33 | 2 | 10 | 0 |
| Selected filters, strict assisted | 2 / 2 | 2 | 2 | 2 |

One of the two supported groups has an explicit physical-location requirement. Five selected-pool links have recognized requirements: two schedule, one physical-location, one authorization and one unavailable-sponsorship note. Neither two strict survivors nor the thirty-three reviewable groups establish suitable jobs. The strict row displays two groups; it cannot be read as ten successful results.

**Primary investigation: missing or ambiguous role/location/work-mode evidence in discovery results.** Forty of forty-seven links have unknown India evidence and thirty-eight have unknown remote evidence under current conservative rules. Lever also spends half its retained results on board patterns. Workday offers many role titles but little recognized region/remote evidence. Source-level metrics justify auditing these gaps before further extraction rules or ranking changes. They do not prove that a source has no relevant opening: sparse or ambiguous returned metadata, missed extraction and provider coverage are competing explanations. Manual inspection of the Workday snippets confirms that terse metadata and employer-wide flexible-work prose need separate review; no geographic or eligibility inference was added.

**Secondary investigation: assisted ordering demotes supported candidates.** With the same selected pool, disabling assisted order retains one supported primary among the first ten; assisted order retains zero. Existing role/tool priority can therefore reduce joint-support visibility in this trial. Reordering could expose at most the two currently recognized supported groups from this envelope; it cannot supply missing evidence or establish suitability. The two-group count is an extraction-dependent bound, not a bound on actual relevant vacancies. No product ranking, filter, source, query or budget changed in this diagnostic slice.

The original run took 15.398 seconds across five requests, with an estimated ceiling of five credits and actual billing unverified. Those remain historical dispatch measurements, separate from today's offline report. Freshness, closed listings, current account usage and full search/Results resources remain unmeasured.

## Independent review protocol and next action at 21A

Freeze criteria and reviewer judgments before evaluating a proposed algorithm change. Supply a reviewer with the returned titles/snippets and links in provider order, without machine assessments or assisted ranks. Record reviewer identity/role and review date locally; publish aggregate methodology and disagreement counts. Today's author-generated diagnostics do not satisfy independent review.

For each link, record separately:

- **Page type:** individual-opening evidence, collection/resource, or unclear; include exact supporting title/snippet phrases.
- **Role, region and work mode:** supported, contradicted, conflicted or unknown, with a source phrase for each assessed field. Do not infer remote eligibility from a company's location or timezone.
- **Review value:** supported candidate, candidate needing clarification, or explicit mismatch/non-opening, with a reason. Unknown/conflict stays separate from confirmed suitability and from explicit mismatch.
- **Restrictions:** schedule/location/authorization/sponsorship evidence and unresolved eligibility. No private profile is needed for a public-text audit.
- **Identity and freshness:** same canonical link, suspected repeated role, or unresolved cross-link identity; active/closed/unverified vacancy status. Returned-text-only review normally leaves freshness unverified.

Annotate all 47 retained links, including hidden boards and contradictions, so recall/retention can be evaluated without selection bias. Compare the frozen labels against full-pool and first-ten **group** results for manual and assisted order; disclose primary/alternative differences and actual denominators. Adjudicate label disagreements before reporting relevance precision. Preserve plausible unknown candidates when evaluating changes.

Next concrete action: obtain that independent returned-text audit of the saved pool, then predeclare additional controlled cases spanning another role and another region/work-mode combination. The single existing software/India/remote case is insufficient for representative acceptance. Use the audit to distinguish extraction misses from insufficient source evidence, and prepare one exact bounded provider experiment addressing the largest confirmed weakness. Further online acquisition or page checks require their own reviewed query/source/request/time/credit/data scope; existing approval is consumed. No live request or publication is enabled by these instructions.

Milestone 21 remains open. Guided setup (22), full Windows/accessibility/resources/CI acceptance (23) and optional semantic ranking (26) retain their owners. Version stays 0.1.0.

## Milestone 21B — frozen blinded review

Completed 2026-10-13 after the user explicitly authorized a separate offline subagent. The reviewer received only the full public envelope and fixed criteria/rubric; it did not read implementation, previous metrics, code or project documents. It reviewed every retained candidate in provider order and froze labels before the parent ran comparisons. This is one blinded **automated** reviewer of a historical case, with unadjudicated disagreements; it does not establish human or representative independent acceptance.

Raw labels/reviewer identifier/reasons/source quotes and the original response remain ignored local artifacts. Schema version 1 binds every original candidate index to the input's exact byte hash. Validation also checks that the parsed input equals the scored result, exact title/snippet phrases, strict complete fields, calendar date, declared blinding, field status/review-value consistency, distinct conflict evidence, prior-index duplicate references and unverified freshness. A detached immutable audit is required before comparison. These checks prove binding/completeness/literal sources; they cannot prove semantic truth or reviewer independence from the artifact alone. All failures retain the fixed path/content-free error.

The reviewer distinguishes page evidence from candidate criteria and records requirements as review prompts. Field support in a collection is not counted as a supported candidate. Optional Python/SQL are not mandatory eligibility constraints. Review value is supported only for an individual opening with same-link role/India/remote support; any explicit contradiction or collection/resource is mismatch; remaining uncertain/conflicted cases need review.

| Frozen reviewer value | All 47 retained links | Selected manual/assisted pool | Strict assisted pool |
|---|---:|---:|---:|
| Supported returned-text candidate | 3 | 3 | 1 |
| Needs clarification | 30 | 26 | 1 |
| Explicit mismatch or non-opening | 14 | 4 | 0 |
| **Total** | **47** | **33** | **2** |

Page judgments: 36 openings and 11 collections. No suspected same-opening duplicate was established from available evidence; unique-vacancy identity remains unverified. Seven links contain reviewer requirement prompts. Machine/reviewer field agreement is 38/47 role, 41/47 India and 41/47 remote; agreement is not measured accuracy. Raw status matrices remain available in the aggregate runner.

| Replay | Actual first-ten groups | Supported primary | Needs-review primary | Mismatch primary | Supported-label retention in full pool |
|---|---:|---:|---:|---:|---|
| All returned, provider order | 10 | 1 | 5 | 4 | 3/3 |
| Selected manual order | 10 | 2 | 5 | 3 | 3/3 |
| Selected assisted order | 10 | 1 | 8 | 1 | 3/3 |
| Strict assisted order | 2 | 1 | 1 | 0 | 1/3 |

Assisted ordering reduces the reviewer's supported-first-ten count but also reduces mismatch-first-ten count; these are separate tradeoffs. Strict filtering loses two reviewer-supported candidates while retaining a candidate the reviewer labels needs-review. Its one supported primary out of two displayed groups is 50% **for this frozen label definition**, not five or ten verified suitable vacancies. Empty denominators remain null. Primary label counts partition the displayed groups; group alternative label-presence counts can overlap and are reported separately.

The reviewer's supported candidates come one each from Greenhouse, Lever and Workday. The existing extractor recognizes support in Greenhouse and Ashby instead. The differences include `India, Remote` and compact labelled country/city/Remote metadata that conservative extraction does not fully recognize, plus a title-country versus physical-timezone requirement judged conflicted by the reviewer. Parent inspection found a review-policy distinction in that latter judgment: literal advertised country support and physical-location restrictions must remain separate, with no automatic timezone-to-country or personal eligibility inference. The original labels were preserved; the country-conflict judgment remains disputed and is not an established extractor defect. Broad country/company-policy matches would also be unsafe. Further adjudication must preserve this frozen baseline and publish any correction separately rather than tuning labels to scores.

The main demonstrated limitation remains **insufficient unambiguous opening evidence in the returned pool**: thirty links need clarification and eleven are collection pages under the reviewer. Extraction misses and ordering visibility contribute, but fixing recognized text alone cannot establish an adequate representative current shortlist. No product extraction, filtering, ranking or source plan was changed.

Eight new review-validation/comparison/case tests plus the seven original report tests pass. They cover hash/result binding, complete ordered labels, immutable judgments, literal-source and conflict checks, status consistency, actual group/alternative denominators, separate unknown retention, disagreement matrices, aggregate redaction, B-arm CLI binding and all four predeclared engine plans. Existing product checks retain their own evidence scope.

[The predeclared experiment](21-provider-experiment-review.md) compares the current query with omission of optional tool terms under the same five source scopes and fixed A/B assessment. The user separately approved its exact ten-request scope; [the completed trial](21c-query-comparison-results.md) consumes that approval. Additional quality-engineer/India/remote and data-analyst/Canada/hybrid cases are registered before acquisition; they are outside that scope. The offline verifier confirms their exact production plans with zero dispatch/vault access. No additional trial is authorized by this audit or registry.

The completed 21C comparison records 5/7 reviewer-supported candidates across A/B, with more collections/mismatches and five expired notices in B. Selected filters retain all supported labels; strict loses most/all at that checkpoint. No query default changed. The next action at 21C was synthetic conservative compact job-specific metadata cases and assessment against all three frozen pools; 21D below records the completed correction. Representative acceptance remains open.

## Milestone 21D — compact location/mode correction

Date: 2026-10-14. Status: implemented and verified locally; unpublished. [Decision 0035](architecture/0035-compact-location-mode-metadata.md) adds bounded snippet metadata recognition to the existing frontend helper. Standalone catalog-country/comma/arrangement lines and labelled country/optional-place/terminal-mode values now retain exact source spans. Examples are synthetic: `India, Remote`, `locations: India Example City Remote` and `Location: Canada (Hybrid)`. Place words are opaque, not geocoded. Whole-value/line boundaries, a 160-character label-value limit, case/word bounds and prose/partial-mode rejection keep this addition narrow. The existing rules and explicit exclusions/conflicts still apply separately.

The same original envelopes, frozen reviewer labels and synthetic reference were replayed with baseline `885327a` and the correction. All 144 candidate appearances validate against their original bytes; some links recur across pools, so this is not 144 distinct opportunities. New evidence resolves ten field disagreements (4 historical, 4 A, 2 B), introducing zero new disagreements with frozen region/arrangement judgments in these pools. This is agreement with one automated reviewer, not measured real-world accuracy. Labels were not retuned and the disputed historical country/timezone judgment remains disputed.

| Saved pool | Selected links / groups, unchanged | Recognized joint-support groups before → after | Strict reviewer-supported retention before → after | Strict needs-review / mismatch after |
|---|---|---|---|---|
| Historical, 47 links | 33 / 33 | 2 → 4 | 1/3 → 3/3 | 1 / 0 |
| A, 48 links | 39 / 35 | 1 → 3 | 1/5 → 3/5 | 0 / 0 |
| B, 49 links | 33 / 32 | 0 → 1 | 0/7 → 1/7 | 0 / 0 |

Selected manual and assisted **ordered candidate indices are identical** to baseline in each pool; first-ten frozen primary judgments are unchanged (historical manual 2/5/3 and assisted 1/8/1; A 1/4/5 and 2/7/1; B 4/3/3 and 4/5/1, in supported/needs-review/mismatch order). Selected pools retain all 3/5/7 reviewer-supported candidates. The benefit is correct visible evidence and fewer strict-filter extraction misses, not a ranking improvement or additional discovered jobs. Strict mode still loses two supported labels in A and six in B, and remains optional.

Field agreement changes: historical India 41/47 → 43/47 and remote 41/47 → 43/47; A India 41/48 → 43/48 and remote 38/48 → 40/48; B India unchanged at 40/49 and remote 36/49 → 38/49. Role judgments, collection/closure notices, requirements, identities and freshness were not changed. Historical strict mode still contains the reviewer-needs-review country/timezone case; this correction does not settle that policy disagreement.

### Verification and finite closeout

- Five new frontend checks cover exact spans and another catalog region/mode, prose/questions/partial modes/city-only/malformed/overlong values, conflicts/exclusions/non-openings/physical requirements, production analysis/filter/reset behavior and safely quoted manual Results disclosure without external resources. All 131 frontend tests pass.
- Fifteen diagnostic/review/case checks pass. The expanded ten-pool synthetic evaluation retains 80/80 reviewable labels, including the original 72/72; the new twelve-candidate pool retains all eight reviewable labels, removes explicit other-region/mode/exclusion and collection noise, and has five supported strict survivors. Clean-pool evaluation still preserves all 49 links/snippets in 41 groups.
- Production frontend typecheck/build passes. Baseline/current replay confirms identical selected ordered indices and unchanged first-ten frozen labels for all three pools, with ten corrected field states and no added frozen-label disagreement.
- No engine/native/wire/storage/dependency/query/budget/version change. No provider/page/vault/model operation, private-profile load, commit or push. Full engine, desktop packaging, native/installed interaction, themes/accessibility and resources were not rerun; the earlier installer lacks this correction. No new UI layout/control is introduced.

This closes the finite 21D correction in decision 0035. Further narrow rules must not substitute for **additional independently reviewed role/region/work-mode cases**. Next: prepare a fresh exact acquisition/review plan for the registered quality-engineer/India/remote and data-analyst/Canada/hybrid cases, keeping collection/expired-result noise and unknown evidence explicit. Those cases remain unacquired; the prior A/B approval is consumed. Milestone 21 and owner 23 release gates remain open, with version 0.1.0 unchanged.
