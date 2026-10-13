# Milestone 21A — source coverage and ordering diagnosis

Date: 2026-10-13. Status: offline diagnostic slice implemented; milestone 21 remains in progress. [Decision 0031](architecture/0031-core-acceptance-and-deferred-release-gates.md) requires representative independently reviewed quality before v1.0 release. This report uses the saved [2026-10-10 approved trial](17d-live-results-2026-10-10.md), current production helpers and a synthetic reference. No new search, account check or result-page request was made.

## Reproduce and interpret

After the normal Node and `.venv` setup in [README](../README.md), run:

```powershell
npm.cmd run review:quality -- <local-public-result-envelope.json>
node --experimental-strip-types --test scripts/tests/search-quality-report.test.mjs
```

The runner defaults to one explicit local production result envelope for `Software engineer jobs India Remote Python SQL`, including engine-owned provenance. `--case software-india-remote` explicitly selects the approved B-arm query `Software engineer jobs India Remote`. Both use `Software engineer Python SQL` as the same synthetic local reference. Other case names/query mismatches fail closed. It has no source-count reconstruction, profile, credential, provider, page or model access. Existing `review-historical-pool.mjs` remains available for explicitly reconstructed older provenance. Malformed input and analysis errors produce a fixed message without input text or paths. Public raw responses stay in ignored local storage; the runner prints only aggregate diagnostics.

An optional second argument supplies a frozen review JSON for that same original input: `npm.cmd run review:quality -- <local-public-result-envelope.json> <local-frozen-review.json>`. See the 21B section below. The original diagnostics remain separate; attaching labels does not replace production assessments or fill verified-vacancy/representative-quality fields.

The report calls production engine analysis, frontend validation, filtering, URL inspection, grouping, relevance and requirement helpers. Per-source counts describe the originating request of retained links; cross-source duplicates keep their original engine attribution. These counts cannot reconstruct every source's pre-deduplication yield. Completed, attempted-but-incomplete and unattempted sources remain distinct. Single-query envelopes use an Unscoped bucket.

The comparison holds the same synthetic analysis and candidate pool constant. `selected_manual` disables assisted ordering; `selected_assisted` enables it. Both apply local software-engineer/India/remote filters, hide collections/resources and retain unknowns/conflicts. These are deliberately selected evaluation filters; the Results screen initially resets to unselected local filters and shows collections. `all_returned_provider_order` restores all links, including resources/boards; strict mode excludes unsupported selected fields. These comparisons isolate ordering/filter effects and do not reproduce installed interactions or every possible resume.

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

The completed 21C comparison records 5/7 reviewer-supported candidates across A/B, with more collections/mismatches and five expired notices in B. Selected filters retain all supported labels; strict loses most/all. No query default changed. The current next action is synthetic conservative compact job-specific metadata cases, then assessment of any correction against all three frozen pools. Representative acceptance remains open.
