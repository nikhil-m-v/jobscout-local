# 0027 — Target ten to twenty suitable jobs

Date: 2026-10-10

The user reduced the core shortlist requirement to **10–20 suitable unique opportunities**. This supersedes the earlier count target in roadmap, architecture, evaluation and progress references. Historical measurements, labels and trial outcomes are unchanged. The lower target does not waive native/accessibility/privacy/installation or quality acceptance.

## Runtime behavior

`shortlistTarget` owns the local review target: minimum ten, preferred maximum twenty. Results display the goal and an honest reviewable-group count. Coverage always applies conservative repeated-role grouping, independent of the display toggle, and excludes recognized boards, collections and resources. Unknown candidates remain reviewable. A count below ten shows shortfall guidance in both single and broader searches. Filters recompute it locally without provider requests.

This is a candidate-review signal, not an automated suitability verdict. Groups can contain distinct openings, and sparse/conflicting text, source mismatches, eligibility and vacancy status still require review. Ten candidate groups do not establish ten suitable unique jobs. The historical selected-role/India/remote pool still has only one evidence-supporting group, so the revised quality gate remains open.

The preferred upper target does not discard additional results. Existing links, alternatives, filter/reset behavior, ordering and full pool remain available. The bounded provider pool is separate: one request returns at most ten raw candidates; the reviewed broader plan still permits five basic requests/fifty raw candidates/seventy-five seconds/five estimated credits. No automatic early stop based on unverified text counts, scope change, padding or retry. The previously prepared live plan still requires fresh approval.

## Setup, upgrade and verification

No setting, dependency, provider setup, model, wire-contract or storage migration. Rebuild the frontend/native shell; the unchanged paired engine remains compatible. The goal and count are session-only; no new private data is stored or sent.

Regression checks cover zero/nine/ten/twenty/larger pools, repeated links, boards/resources and unknown retention. Rendering checks assert the lower boundary and retention above twenty. Offline historical review reports the revised target alongside reviewable and evidence-supporting group counts, without calling either verified suitability or fetching pages.
