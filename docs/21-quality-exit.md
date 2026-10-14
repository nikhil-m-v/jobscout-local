# Milestone 21G — finite quality exit checklist and Workday diagnosis

Date: 2026-10-14. Status: offline consolidation and source selection complete; local/unpublished. **Milestone 21 remains open.** The eight exit items below replace an open-ended sequence of extraction fixes with explicit evidence and owners. The latest published implementation is `aa0123a`, checkpoint `d7b0f7b`; this slice changes documentation only. No provider/page/vault/model/private-profile operation, acquisition, spending or publication occurred. Both previous acquisition approvals remain consumed.

## Fixed evidence and counting rules

Replay the five original byte-bound pools under the four cases in [the unchanged registry](../evaluation/search-quality-cases.json), using production local analysis and case-specific synthetic references. Original inputs, criteria, labels and references remain unchanged; validate each frozen audit before comparison. [21B](search-quality-review.md#milestone-21b--frozen-blinded-review), [21C](21c-query-comparison-results.md), [21E](21e-quality-case-results.md) and [21F](21f-structured-heading-results.md) retain their original checkpoint meanings. All five current full reports reproduce the 21F reports exactly under parsed JSON equality.

These are **235 candidate appearances**, including recurring URLs, across three role/country/work-mode families. There are 169 reviewer-labeled opening appearances and 66 collections/resources. They are not 235 or 169 distinct, suitable or current vacancies. One separately blinded automated reviewer supplied the frozen judgments; no new independent or human review was performed here. Source selection by the implementation author is exploratory, not a prospective quality test.

`S/N/M` below means frozen supported / needs-review / mismatch labels. First ten counts display-group **primary links**; alternatives are assessed separately and never supply another link's missing field. Each selected manual/assisted first ten displays ten groups. Selected modes apply the case's role/country/work-mode filters, hide collections/resources and retain unknowns/conflicts; these deliberately selected evaluation filters differ from the screen's unselected reset state.

| Pool | Full returned S/N/M | Selected links / groups | Manual first-ten S/N/M | Assisted first-ten S/N/M | Selected supported retention | Strict supported retention / displayed groups |
|---|---:|---:|---:|---:|---:|---:|
| Historical software / India / Remote | 3 / 30 / 14 | 33 / 33 | 2 / 5 / 3 | 1 / 8 / 1 | 3 / 3 | 3 / 3; 4 groups |
| A — software with optional tools | 5 / 25 / 18 | 39 / 35 | 1 / 4 / 5 | 2 / 7 / 1 | 5 / 5 | 3 / 5; 3 groups |
| B — software without optional tools | 7 / 16 / 26 | 33 / 32 | 4 / 3 / 3 | 4 / 5 / 1 | 7 / 7 | 1 / 7; 1 group |
| Quality / India / Remote | 0 / 6 / 35 | 13 / 10 | 0 / 4 / 6 | 0 / 4 / 6 | No supported denominator | 0 / 0; 0 groups |
| Analyst / Canada / Hybrid | 1 / 32 / 17 | 36 / 36 | 1 / 7 / 2 | 1 / 9 / 0 | 1 / 1 | 1 / 1; 1 group |

Strict historical includes one needs-review group. Empty strict precision is null, and zero supported labels is not perfect retention. Default selected filters preserve all 16 supported-label appearances, but that is retention of one reviewer's judgments, not a discovery-quality pass. Assisted ordering loses one supported first-ten primary relative to manual in the historical pool; this remains open even after the analyst correction. Two quality-role policy disputes remain unchanged. None of these observations justify a ranking/filter/query default change.

## Finite milestone exit checklist

All eight items must have recorded completion evidence before moving milestone 21 to complete. A development slice can finish while this checklist stays open. Do not add acceptance requirements after these items pass unless a demonstrated regression or newly approved requirement warrants it. [Decision 0031](architecture/0031-core-acceptance-and-deferred-release-gates.md) keeps Windows release gates with owner 23.

| Item | Owner | Completion evidence | Current status |
|---|---|---|---|
| Q1 — Fixed case coverage and audit integrity | 21 maintainer | All four registered cases across three families; complete byte-bound labels, unchanged originals and production replay; source and counting limits explicit | Pass for the five saved diagnostic pools; not population-wide representativeness |
| Q2 — Independent human usefulness acceptance | 21 human evaluator, coordinated by maintainer | A named human evaluates the fixed rubric and each family's first ten plus retained full pool, without machine scores before labeling; record per-case acceptance and reasons, disagreements and coverage limits before declaring representative acceptance | Open. Automated labels do not satisfy this gate; quality's zero-supported pool with unresolved evidence cannot pass as demonstrated scarcity |
| Q3 — Retention and ordering | 21 maintainer plus evaluator | Selected manual/assisted retain every adjudicated supported link. Explain and resolve supported first-ten losses caused by assisted order; record primary versus alternative labels and actual displayed denominators. Recheck all five pools after any correction | Retention passes frozen labels. Historical assisted 1 versus manual 2 remains an unresolved visibility tradeoff |
| Q4 — Filter and restriction fidelity | 21 maintainer plus evaluator | Same-link field evidence; unknown/conflict kept reviewable; exclusions and strict losses disclosed. Resolve the two quality-role policy disputes explicitly and assess missing requirement prompts against affirmative source wording; never infer personal eligibility | Open. Original disputes, strict losses and requirement-recognition gaps remain; do not relabel to fit implementation |
| Q5 — Sources and duplicate accounting | 21 maintainer | Report completed/partial scopes, outside-scope links, collections, canonical repeats and suspected same-opening duplicates separately. Preserve alternative text/links; no field fusion or unique-vacancy claim | Diagnostic accounting passes. Provider scope noise and suspected identity remain disclosed limitations |
| Q6 — Freshness and shortage interpretation | 21 maintainer plus evaluator | Preserve individual expired notices and unknown availability; retrieval time is not posting time. Human acceptance distinguishes bounded discovery failure from a demonstrated market shortage; report actual supported/reviewable counts without padding | Open for human acceptance. Six saved individual expired notices and all unverified freshness states remain; no live status checked |
| Q7 — Latency, cost and bounded requests | 21 maintainer | Each acquisition stays within its reviewed request/result/time/estimated-credit ceilings; record actual elapsed times, partial/failure outcomes and billing uncertainty. No automatic retries or unreviewed spending | Pass for recorded acquisitions. Actual billing and current allowance remain unverified; no new run implied |
| Q8 — Decision and handoff | 21 maintainer with human signoff | Record Q1–Q7 outcomes, unresolved limitations and per-case human acceptance; then close 21 and advance to guided setup (22). Owner 23 retains installed/accessibility/resource/CI gates | Open; version remains 0.1.0 |

Human acceptance uses the documented [returned-text rubric](search-quality-review.md#independent-review-protocol-and-next-action-at-21a); any prospective experiment freezes its criteria, acquisition bounds and evaluation decision rule before dispatch. Do not invent a precision threshold from these already-observed results or pool the three markets to hide a failing case. The 10–20 suitable-opportunity target remains an aspiration when available, never a universal count requirement. Small supported subsets need an honest useful-shortlist assessment; empty or mostly unknown text cannot establish that suitable vacancies do not exist. Returned-text support alone does not certify personal suitability, active vacancies or broad population quality.

## Opening-specific source diagnosis

Count unknown fields only among reviewer-labeled openings, separating them from collections/resources. This tests whether removing board noise could address the evidence shortfall. Country/mode values use frozen reviewer judgments, not production extraction, so these counts do not call every machine disagreement a missing source fact. Unknown means insufficient or ambiguous evidence under that rubric, not proven absence from the original site.

| Originating source across five pools | Retained appearances | Opening / collection-resource appearances | Opening country unknown | Opening mode unknown | Opening either field unknown | Opening country and mode supported on same link | All-field supported openings |
|---|---:|---:|---:|---:|---:|---:|---:|
| Greenhouse | 42 | 27 / 15 | 16 | 13 | 18 | 7 | 5 |
| Lever | 50 | 26 / 24 | 12 | 13 | 16 | 8 | 3 |
| Ashby | 43 | 32 / 11 | 17 | 14 | 23 | 4 | 4 |
| Workday | 50 | 42 / 8 | 32 | 34 | 36 | 3 | 3 |
| SmartRecruiters | 50 | 42 / 8 | 30 | 14 | 31 | 2 | 1 |
| Total appearances | 235 | 169 / 66 | 107 | 88 | 124 | 24 | 16 |

Country-unknown and mode-unknown overlap; do not add them to infer an affected-link count. Country/mode support can coexist with a role mismatch and therefore is not an all-field supported opening. Sources share repeated URLs and case composition varies. The historical rubric includes a preserved disputed judgment; these aggregates do not declare a source quality winner.

**Choose Workday as the one next source investigation.** It has 36/42 opening appearances with unknown country or mode, including 32 country unknown and 34 mode unknown. Removing its eight non-openings would leave that gap. It also contributes three frozen supported appearances; removing the source would lose evidence. SmartRecruiters has a country gap and scope noise, and Lever has more collection noise, but those are separate investigations rather than additions to this slice.

| Workday pool | Opening appearances | Country unknown | Mode unknown | Either unknown | Country and mode supported | All-field supported |
|---|---:|---:|---:|---:|---:|---:|
| Historical | 10 | 8 | 9 | 9 | 1 | 1 |
| A | 10 | 7 | 8 | 8 | 2 | 2 |
| B | 2 | 0 | 0 | 0 | 0 | 0 |
| Quality | 10 | 7 | 9 | 9 | 0 | 0 |
| Analyst | 10 | 10 | 8 | 10 | 0 | 0 |

B's remaining eight Workday appearances are collections; its two openings have explicit nonmatching evidence rather than unknowns. Neither zero unknown nor complete request coverage establishes successful discovery. Quality/analyst missing metadata and the different A/B pools prevent a general query conclusion. Production recognizes joint support in two Workday appearances versus three frozen supported judgments; the remaining extraction disagreement is separate from the 36 unknown-field appearances.

## Next bounded investigation and stop condition

Prepare **one exact Workday returned-snippet versus posting-evidence research plan**, starting from the fixed analyst/Canada/hybrid case, to distinguish insufficient search snippets from absent/ambiguous posting evidence. Keep literal advertised country separate from physical-location requirements, and posting work mode separate from employer-wide policy. Freeze the selected public links and sampling rule before acquisition; include a supported Workday control from the existing software case and report controls separately, without combining markets into a quality score. No geography inference, new extraction rule or additional source experiment follows automatically.

The next plan must specify exact destinations, maximum fetches/bytes/wait, redirect/embedded-resource handling, outbound metadata, retention and one-use stop behavior before requesting fresh authorization. This would be separately reviewed public research, not a product page-fetch feature; the app's existing no-result-page-fetch behavior and privacy contract remain unchanged. Preparation may inspect saved public envelopes locally. **Do not fetch any page or read a credential under this checkpoint.** Neither the current search plans nor either consumed provider approval authorizes this work's acquisition.

Stop after the declared sample and aggregate evidence comparison, including an inconclusive outcome. If the pages lack reliable country/mode metadata, report the limitation; if they contain it, compare the evidence channels before proposing any product change. Do not start new sources, repeat queries, purchase credits or tune rules until an explicit next slice is defined. Acquisition cannot by itself satisfy Q2 or verify personal eligibility.

## Verification and closeout

All five original frozen audits validate before offline production replay. Current full reports equal all five 21F reports; inputs/reviews remain byte-identical afterward. Per-source totals reconcile to all 235 appearances and field-state totals reconcile to each opening denominator. Only aggregates enter this document; raw text, URLs, reviewer identity/quotes/input hashes and generated helpers/reports remain ignored local artifacts.

Closeout: all 156 local Markdown targets/anchors across nine changed/new documentation files resolve, and whitespace checks pass. Scoped credential/private-machine-path/input-hash-pattern inspection finds no matches. All three new local consolidation/report/update artifacts are confirmed ignored. Current summaries agree on local completion of this slice, open quality acceptance and the exact-plan preparation next.

This documentation-only slice adds no runtime, API/schema, source/query/filter/ranking default, storage, dependency, setup or version change. Existing 21F frontend/build/regression evidence retains its scope; no new full engine/frontend/build/package/native/installed/accessibility/resource/CI run is implied. Current changes are local/unpublished. Next action is the exact Workday research-plan preparation above; milestone 21's open items and owner 23 limits remain explicit.
