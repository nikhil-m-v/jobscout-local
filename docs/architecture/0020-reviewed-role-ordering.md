# Decision 0020 — Reviewed role before shared tools

Date: 2026-10-06. Status: implemented locally; interactive/live verification pending.

## Problem

The synthetic broader pool promotes other-role openings above relevant candidates because they mention more shared tools. Fetching more candidates amplifies this limitation. A shared category count is not suitability evidence.

## Decision

For resume-assisted Results, use the controlled role reviewed in Job options, including user corrections. Group candidates by local title/snippet role mentions: reviewed role first, no detected role next, other detected roles last. Within each group retain shared-skill-count ordering, with provider order for ties. Multi-role text that mentions the reviewed category enters the first group. This is mention ordering, not a verified role compatibility assessment.

Keep every candidate that survives existing explicit/content filters; role ordering itself hides nothing. Show the reviewed role, detected candidate categories and ordering rule in Results. Manual discovery retains provider order. With absent analysis, original order remains available. Criteria edits already invalidate Results; do not derive the reviewed role from resume analysis again or parse it out of query text.

This pure frontend change uses existing validated local category data. No engine contract, storage, provider request, credential access, model, dependency, setup requirement or migration changes. Rebuild the frontend/native package to adopt it.

## Evidence and limitations

The five-case synthetic evaluation compares the prior skill-count order with the new reviewed-role order and asserts identical retained candidate indexes and non-degraded top-five relevance. Unit checks cover missing data, multi-role matches, provider ties, manual ordering and high-skill other-role candidates. Renderer checks disclose the reviewed role and group basis.

Developer top-five relevance improves 60% to 80%; analyst 40% to 60%; aliases and content ambiguity remain 60% and 80%. The constructed 50-candidate pool improves top-ten relevance from 0% to 100%, retaining 30/30 labeled relevant candidates and all 40 non-resource candidates. These hand-labeled diagnostic cases are not representative live-quality evidence. Role aliases can be incomplete, mentions can describe teammates, negated skills and adjacent roles remain unresolved, and unknown grouping can lower plausible adjacent openings. Interactive/native verification and deliberately reviewed live relevance/cost/resource evaluation remain required before milestone 17 completion.
