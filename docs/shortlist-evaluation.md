# Synthetic shortlist quality baseline

Run `npm run evaluate:shortlist` after the normal Node and `.venv` engine setup in README. The command always uses the checked-in synthetic corpus; it accepts no resume path, key, provider or arbitrary user input. No app server, credential store, database or search adapter is invoked. It calls production Python `analyze_review`, frontend `validateAssistance`, and `filterCandidates` rather than copying their logic. No new dependency or application behavior is introduced.

## Corpus and interpretation

`evaluation/shortlist-cases.json` contains three manually labeled ten-candidate pools: developer content noise, analyst preference mismatches, and broad aliases/missing details. Every label has a reason independent of category counts. Compatible openings with unknown location or role-catalog details are labeled relevant for further review, not verified matches. Fixtures deliberately include misleading content, negation, adjacent titles, repeated broad categories and missing evidence.

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

Broader fetching still needs an engine-owned reviewed query plan, disclosed maximum requests/credits, bounded total candidates/time, cancellation, cross-response deduplication, partial-failure handling and honest shortfalls. The current contracts still cap analysis and provider results at ten. This evaluation does not implement a 30–50-job shortlist or establish live vacancy status, freshness, coverage, cost, latency, native interaction or release readiness. A deliberate reviewed live-provider evaluation remains necessary. No release threshold is asserted from these three diagnostic cases.
