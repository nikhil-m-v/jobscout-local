# 0035 — Compact job location and work-mode metadata

Date: 2026-10-14. Status: implemented local milestone 21D correction; local/unpublished.

## Evidence and decision

The [frozen 21B review and approved 21C comparison](../search-quality-review.md) show recurring extraction misses in explicit standalone country/mode lines and labelled compact job locations. Correct these two bounded forms in the existing pure frontend relevance helper. The returned pool, frozen judgments and local synthetic reference stay fixed for assessment. No new acquisition or reviewer relabeling is part of this change.

Recognize a snippet line or provider `[...]` fragment consisting entirely of a catalog region and comma-separated arrangement, such as `India, Remote` or `Canada, Hybrid`. A fragment must end there, allowing terminal period/exclamation punctuation. Team/client/company prose, questions and partial arrangements do not qualify. Repeated identical evidence is deduplicated.

Also recognize a `location:`, `locations:` or `job location(s):` label beginning a line or sentence. Its complete value, bounded to 160 characters, must contain an explicit catalog region first, an optional comma/one to three capitalized place words, and a terminal arrangement. Parenthesized arrangements are accepted. Examples: `locations: India Example City Remote` and `Location: Canada (Hybrid)`. Place words remain opaque; no city lookup, geocoding or country inference occurs. Prose-like tokens, numbers/partial percentages, unfinished parentheses and trailing narrative fail this additional grammar. Existing rules still apply separately; these guards do not redefine older label recognition or prove that every plausible metadata string is job-specific.

Each accepted pair supplies positive region/arrangement signals with the same exact snippet span. It cannot borrow country or mode from another link. Existing explicit negative/restriction signals still produce contradictions/conflicts. Physical-timezone/authorization/sponsorship notes remain separate review prompts; advertised country support is not personal eligibility. Collections/resources and known board paths retain existing individual-evidence suppression.

## User behavior, boundaries and setup

The existing Results disclosure quotes the newly recognized source details in both manual and assisted paths. Existing filters can use them after local analysis: unknowns/conflicts remain included by default, contradictions hide reversibly, strict mode still requires support, and reset preserves the pool. Ranking weights and tie order are unchanged. The correction does not verify current vacancy status or unique opportunity identity.

No engine/wire/native contract, provider query/scope/options/budget, credential, persistence/schema, dependency, model, version or setup requirement changes. The helper accesses only already-returned title/snippet and optional validated local analysis. Failed local analysis retains existing manual disclosure/retry behavior. Existing installations need a new frontend-containing desktop build to receive this correction; the prior installer is unchanged and was not retested. No outbound request or private profile is needed for verification.

## Acceptance for this slice

1. Exact spans work for both compact forms and at least one other catalog region/arrangement; malformed/prose/partial/city-only text does not gain support from the new rule.
2. Production analysis/filtering preserves unknowns, conflicts, requirement notes, reset behavior and non-opening suppression. Manual rendering quotes evidence safely without external resources.
3. All three byte-bound frozen pools preserve selected links/groups and reviewer-supported retention. Newly added support introduces no new disagreement with frozen field judgments in those pools. Original disagreements remain visible.
4. Frontend/report regressions, the expanded synthetic evaluation, production typecheck/build and documentation checks pass. Representative/native/installed/resource acceptance stays explicitly open.

[The 21D report](../search-quality-review.md#milestone-21d--compact-locationmode-correction) records results and remaining gaps. These finite checks close this correction only; they do not close milestone 21.
