# 0025 — Source-linked role, region and work-mode relevance

Date: 2026-10-07

Status: implemented conservative milestone 17C increment; representative coverage and interactive/native acceptance remain pending.

## Decision

Use a small pure frontend module over already-returned candidate titles/snippets and validated local role evidence. Keep the existing local assistance and outbound contracts unchanged. No new provider request, page fetch, credential, model, dependency or persistence is introduced. The module has no network or storage access; result text remains escaped text in the existing disclosure controls.

Role evidence uses supported catalog aliases already validated against the candidate sources. Advertised title roles supply positive evidence; incidental snippet roles do not. Narrow `no/not [role] positions/roles/jobs/openings` phrases supply negative evidence from either source. Role exclusions no longer receive first priority in resume ordering. Manual provider order and stable ties remain unchanged.

Region and work arrangement use catalog labels, explicit labels such as `Location: India` and `Work mode: remote`, qualified `Fully remote`, or delimited title suffixes such as `(Remote)`. Supported alternatives such as `Location: India, Canada` retain both values. Narrow `not remote` and similar exclusion phrases are distinguished from `No remote experience required`. Every signal retains an exact title/snippet phrase and source. Cities, unsupported countries, abbreviations, incidental country/team mentions and unexplained prose remain unknown. No geography inference or worldwide eligibility claim.

For a selected local filter: positive selected evidence is supported; positive other values or explicit selected exclusions are contradictions; both selected positive and negative evidence are a conflict; absent usable evidence is unknown. Multiple advertised positive alternatives support each alternative. Collection/resource assessments and known ATS board paths cannot supply individual-opportunity evidence. The frontend performs the board suppression before calling the pure module.

## User behavior and recovery

Role/region/arrangement result filters now use this evidence instead of broad mentions. Contradictions are hidden only when a filter is selected. Unknowns and conflicts remain by default; the existing missing-details checkbox deliberately requires supported evidence when unchecked. Reset restores candidates subject to the existing resource default. Filtering occurs before reversible grouping; every surviving alternative carries its own evidence. Seniority/skill filters still use mentions.

An expandable disclosure is available in both discovery paths, including literal region/work-mode evidence when local assistance is unavailable. Role analysis still needs successful assistance. Existing filters are available after local analysis; analysis failure preserves the pool and retry behavior. No new setup step, upgrade migration or engine/frontend wire incompatibility. The existing theme tokens, native details controls and wrapping source text apply.

## Evidence and limits

All 85 frontend tests, 326 engine tests, production build/typecheck and eight synthetic pools pass. The targeted twelve-candidate pool improves from 60% labeled relevance in the first five under prior mention filters to 100% under source-linked filters; retention improves from 6/7 to 7/7 reviewable labels. Five explicit contradictions are removed; four supported, two unknown and one conflicting candidate remain. Strict source-linked filtering keeps only four supported candidates.

Across all eight pools, default source-linked filters retain 66/66 labeled relevant/reviewable candidates. These labels include candidates requiring review; they do not establish suitable jobs. More conservative unknown handling can preserve noise: the earlier analyst pool has 60% first-five relevance compared with 80% under prior mention filters, and strict source-linked filtering empties that sparse pool. Do not claim a universal ranking gain or enable strict filtering by default. The bounded fifty-candidate fixture still retains all thirty labeled relevant candidates.

Native interaction, visual themes/window sizes, full desktop resources and representative live suitability remain in 17D. No live request, installer execution or packaging measurement was performed for this frontend increment. Next: review the evidence on the historical public candidate pool locally, address the largest grounded coverage ambiguity, then perform 17D acceptance with explicit reviewed criteria and honest opportunity shortfalls.
