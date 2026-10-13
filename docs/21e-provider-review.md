# Milestone 21E — two additional public quality cases

Date: 2026-10-14. Status: **approved acquisition and frozen assessment complete; this approval is consumed**. The human explicitly approved this exact two-case scope in the current chat. Ten requests completed in 34.928 seconds, retaining 41/50 safe links with two/zero unsupported discards and zero within-case canonical duplicates. Frozen offline assessment is documented in [the results record](21e-quality-case-results.md). Preparation alone performed zero provider requests or vault access. The [21C A/B approval](21-provider-experiment-review.md) was also consumed and authorizes neither this trial nor a replay. The [privacy contract](privacy.md#what-optional-online-features-may-send) requires explicit reviewed generic search. This document records the exact approved scope; any further acquisition requires fresh exact authorization.

## Fixed cases and purpose

These cases were registered before acquisition in [the unchanged four-case registry](../evaluation/search-quality-cases.json). The trial broadens the software/India/remote evidence with a second role and a different country/work mode; it does not compare interchangeable queries or claim a winner across different job markets.

| Order / case ID | Controlled criteria | Exact query, repeated across five sources | Offline synthetic reference |
|---|---|---|---|
| 1 — `quality-india-remote` | Quality engineer; India; Remote; any seniority; .NET and Software testing | `Quality engineer jobs India Remote .NET Software testing` | `Quality engineer .NET software testing` |
| 2 — `analyst-canada-hybrid` | Data analyst; Canada; Hybrid; any seniority; Data analytics and SQL | `Data analyst jobs Canada Hybrid Data analytics SQL` | `Data analyst SQL data analytics` |

Criteria IDs respectively: `quality-engineer` / `india` / `remote` / `any` / `[dotnet, testing]`, and `data-analyst` / `canada` / `hybrid` / `any` / `[analytics, sql]`. Skill categories are optional query/ranking context, never mandatory personal eligibility. No real resume or profile supplies either case or reference. References stay offline.

## Provider-visible requests and bounds

Only HTTPS POST to `https://api.tavily.com/search`, through the existing production adapter. For each case, requests follow this fixed order with the same exact query:

| Source | Exact `include_domains` list |
|---|---|
| Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io` |
| Lever | `jobs.lever.co`, `jobs.eu.lever.co` |
| Ashby | `jobs.ashbyhq.com` |
| Workday | `myworkdayjobs.com` |
| SmartRecruiters | `jobs.smartrecruiters.com`, `www.smartrecruiters.com` |

Options: `search_depth: basic`, `topic: general`, `max_results: 10`, `auto_parameters: false`, `include_answer: false`, `include_raw_content: false`, `include_images: false`, `include_favicon: false`, `include_domains_mode: restrict`. No other experiment options. Source lists are filters sent to Tavily; JobScout makes no direct ATS or returned-page requests. Scope adherence is observed, not assumed.

Each case: at most **5 sequential requests, 50 raw candidates before deduplication/filtering, 75 seconds of search waiting and 5 estimated credits**, plan version 2. Combined: at most **10 requests, 100 raw candidates, 150 seconds and 10 estimated credits**. The second case starts only after the first completes normally. Failure, incomplete coverage, cancellation, elapsed limit or uncertain acknowledgement stops further dispatch; no automatic retry, replacement query/source or second acquisition.

[Tavily's official credit documentation](https://docs.tavily.com/documentation/api-credits), checked 2026-10-14, lists one credit per basic search and pay-as-you-go at US$0.008 per credit: ten credits is about **US$0.08** at that listed rate. Account allowance, actual billing and tax are unverified. No purchase, billing change or account/usage check is included. [The official Search API reference](https://docs.tavily.com/documentation/api-reference/endpoint/search) documents the endpoint and options; provider behavior still needs observation.

Use only an existing JobScout OS-vault credential internally after exact plan validation and fresh affirmative human approval. Tavily receives the generic query/options/domain list, credential in its Authorization header and normal network/timing/API-account metadata. No complete-anonymity promise. No resume, profile, identity, application note, private matching evidence, embedding, model operation or personal local path. Existing TLS verification, no redirects/environment proxy, bounded responses, credential-echo rejection and safe URL validation remain.

## One-use acquisition and frozen review

The separate ignored local runner checks both complete engine plans before vault access. Its verification mode cannot dispatch or import credential/provider adapters. A distinct exclusive 21E consumed marker and refusal of existing raw-output files prevent replay; neither the old runner nor its marker is reused. Once dispatch may have occurred, keep the consumed state even if results or acknowledgement fail. Sent requests cannot be recalled or guaranteed unbilled. Recheck this exact scope if production plans/options change.

Preserve each case's original full safe-result envelope separately, with source indices, retrieval time, coverage, duplicate/discard counts and measured per-source timings. Keep raw envelopes, labels, quotes, input hashes, reviewer identity, runner/marker and internal diagnostics ignored/local. Commit only aggregate evidence/methodology and synthetic tests. Do not merge pools or equate canonical URL/group identity with unique vacancies.

The separately authorized independent offline subagent receives only each full saved envelope, its fixed role/country/work-mode criteria and the rubric. It must read every candidate's full title/snippet and label every original index before receiving code, prior metrics, implementation decisions or parent scores. Freeze byte-bound labels before production replay. Validation establishes complete indices, literal evidence and immutability, not semantic accuracy or blinding by itself.

Use the established version-1 rubric: opening/collection/resource/unclear; same-link role, selected country and selected work-mode supported/contradicted/conflicted/unknown; derived supported/needs-review/mismatch value; affirmative physical-location/schedule/authorization/sponsorship requirements; suspected earlier duplicate; freshness always unverified. Advertised country and physical-timezone requirements are separate. Do not infer country from cities/timezones/employer footprint, hybrid from office prose, remote from company policy, personal eligibility or active vacancy status. A collection cannot count as a supported opening. Record individual-posting closed/expired notices separately in a supplemental byte-bound index/quote note, without redefining criteria support or freshness. Preserve labels and report disputed judgments explicitly; any adjudication is a separate sensitivity analysis.

## Fixed assessment and finite exit

Primary outcome **per case**: independently labeled supported-opening yield in the complete returned pool. Secondary: needs-review/mismatch counts, page-type/collection share, explicit expired notices, source/scope contributions, same-link extraction agreement, first-ten group primary/alternative labels, full supported and needs-review retention, suspected duplicate identity, restrictions, elapsed time and estimated credits. Manual/provider order, assisted order and strict assisted filtering stay separate. Empty denominators remain null; partial cases remain partial. Compare with earlier pools as coverage context, not a causal ranking or query experiment. No universal ten-job quota or default change follows from one trial.

| Exit item | Owner / evidence |
|---|---|
| Prepare both fixed offline cases and exact scope | Implementation author: engine plan verification, case-specific CLI/review tests and mocked provider/broader-discovery preflight |
| Acquire once within the reviewed bounds | Implementation author, only after fresh human approval: complete or honest partial coverage, preserved original inputs and consumed marker |
| Freeze a complete blinded returned-text review | Independent offline reviewer: literal source-linked judgments, requirements, expired-note supplement and unverified freshness before scores |
| Assess and record the cases | Implementation author: aggregate comparisons and explicit disagreements/shortfalls; checkpoint and dated progress updated |

After these finite items, advance to the next documented milestone-21 quality decision rather than extending this trial. Three role/country/work-mode families and one automated reviewer still do not establish representative human relevance, personal suitability, current vacancy status or installed release acceptance. Milestone 21 remains open until its quality exit is evidenced; installed/accessibility/resources/CI remain owner 23. Version remains 0.1.0.

All four exit items are complete with their stated limits; [the results record](21e-quality-case-results.md#disagreements-and-diagnosis) preserves the severe quality shortfall and next offline decision. This does not extend the consumed live scope.

## Offline reproduction

All four exact queries are verified without dispatch/vault access:

```powershell
.venv/Scripts/python.exe scripts/verify-quality-cases.py --verify-only
```

After local acquisition and frozen review, use the existing aggregate-only runner with an explicit case:

```powershell
npm run review:quality -- <local-result-envelope.json> <local-frozen-review.json> --case quality-india-remote
npm run review:quality -- <local-result-envelope.json> <local-frozen-review.json> --case analyst-canada-hybrid
```

The default and `--case software-india-remote` remain the original A/B cases. An envelope from a different case fails safely; no arbitrary criteria/query/reference override or provider dispatch is added. The original registry and A/B acquisition/reviews remain unchanged. Verification and local checks do not authorize any live request or publication.
