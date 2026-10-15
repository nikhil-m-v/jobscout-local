# Milestone 21J — repeated Workday metadata correction

Date: 2026-10-16. Status: **finite correction implemented and verified locally; unpublished**. Scope and positive/adversarial cases were declared before implementation/replay. This continues 21.1 under [the delivery reset](architecture/0037-finite-search-quality-delivery.md), following [21I's extraction blocker](21i-ordering-review.md). This is one source-text correction, not a new ordering experiment or live acquisition. Milestone 21 remains open.

## Fixed grammar and guards

Recognize only the snippet-leading pattern `Remote, <literal catalog country/region> Remote`, ending at a comma, line end or end of text, on a known individual Workday posting path. The following comma may separate ordinary job text. Keep an exact source span for the prefix. No city geocoding, arbitrary role/company prose, query parsing, fuzzy country or inferred worldwide eligibility. Other hosts, boards, unknown paths, questions, partial percentages, malformed/unfinished prefixes, different ending modes, mid-prose or fenced examples do not gain support from this addition. Collections/resources remain suppressed as individual evidence.

The country evidence must preserve explicit negatives/conflicts. Add the repeated Remote mode only if it does not replace an existing incompatible positive work-mode detail; explicit negative Remote still yields a conflict with the positive prefix. Preserve original role policy, ordering keys, defaults and missing-data behavior.

Declare synthetic checks before implementation for three literal countries, comma/prose and LF/CRLF boundaries, exact spans; malformed/company/question/code/path/board guards; negative/conflicting and incompatible-mode handling; and production local analysis/filter/reset/manual-order integration with safe source rendering. The positive checks must demonstrate the old miss before correction.

Replay all five original complete byte-bound audits with unchanged inputs/reviews/criteria/references. Require unchanged default selected memberships, manual/assisted ordering and grouping, no new frozen-field disagreement and only source-supported field improvements; strict behavior may retain newly recognized supported links, with all changes reported. Do not re-run or modify the rejected 21I ranking rule. If guards fail, narrow or reject this grammar, not the frozen labels. Check appropriate frontend/review tests, existing synthetic retention/clean-pool evaluations and the production frontend build; no engine/native/package acceptance is implied.

## Result and practical effect

The existing pure frontend relevance helper now recognizes that bounded prefix and exposes its exact snippet span through existing evidence disclosures. The country is literal, not inferred from a city or employer. Remote is added after existing work-mode assessment, so a conflicting negative remains a conflict and an incompatible recognized positive mode is not overwritten. No new control, ranking key, filter default or outbound field is added.

All five original full audits validate and original input/review bytes, criteria and synthetic references remain unchanged. Across 235 candidate appearances, only the identified software-A link changes: country and work mode unknown to supported, agreeing with its frozen judgment. Two disagreements resolve and zero new disagreement is introduced. The other four full reports equal their 21F reports. Default selected manual/assisted memberships and ordered indices remain identical in all five pools, preserving all 3/5/7/0/1 supported-label appearances. First-ten counts are unchanged; the historical tool-order tradeoff is not fixed or reclassified by this change.

| Outcome | Before | After |
|---|---:|---:|
| A recognized same-link role/country/mode support | 3 | 4 |
| A strict supported retention | 3/5 | 4/5 |
| A selected links / groups | 39 / 35 | 39 / 35 |
| A assisted first-ten supported primaries | 2 | 2 |

One A supported link and six B supported links are still missed by strict filtering; the historical strict pool still includes one disputed needs-review group. Quality still has zero supported labels and analyst one. Source-linked text support is not suitability, availability, eligibility or independent human acceptance. No new supported opening was discovered, and the rejected 21I ranking candidate was not retested or shipped.

## Verification and handoff

Five new frontend checks cover literal three-country metadata/boundaries/spans; malformed/prose/code/host/path/board guards; negative/incompatible mode behavior; real local analysis plus manual/assisted/strict/reset filters; and safe manual rendering without remote resource loading. Four positive/filter/conflict/render checks failed before implementation; the adversarial guard check already passed. All five pass afterward.

All **158 frontend/review checks**, production frontend typecheck/build, ten existing synthetic diagnostic pools retaining **80/80 reviewable labels**, and the clean-pool **49-link/41-group** evaluation pass. The five-pool baseline/current replay verifies the field changes and all declared retention/order guards. No full engine/package/native/installed/accessibility/resource/CI run occurred; the existing installer does not include this local frontend correction. No dependency, API/schema, storage, model, provider/query/source/budget or setup change. No provider/page/vault/private-profile operation or spending. Raw envelopes/reviews/quotes/identities/hashes and local baseline/replay artifacts remain ignored; public evidence is aggregate and checked-in tests are synthetic. Version remains 0.1.0; published product baseline `aa0123a`, local HEAD `ab3cd6a`; no commit/push or live remote verification.

This finite 21.1 correction is complete. Under decision 0037, next is the existing role-policy/requirement disagreement disposition and finite human review pack; do not extend grammar or acquisition automatically. 21.3's bounded diagnostic coverage assessment is complete, while 21.2 tradeoff signoff and 21.4 scoped human acceptance remain open. The reset does not pass Q2/Q3/Q4/Q6/Q8 or release readiness.

Closeout: all 185 local Markdown targets/anchors across fourteen changed/new documentation files resolve; whitespace and scoped credential/private-machine-path/raw-input-hash checks pass across all seventeen changed/new files. Eleven ignored 21J baseline/scope/replay/evidence artifacts and source/test bindings reconcile. This confirms the bounded local correction and documentation, not release, installed behavior or human acceptance.
