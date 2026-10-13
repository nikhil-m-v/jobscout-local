# Milestone 21C approved scope — optional-tool-term comparison

Date: 2026-10-13. Status: **explicitly approved and executed once; approval consumed**. Ten requests completed in 33.705 seconds, yielding 48 safe A links and 49 safe B links, with three unsupported links discarded and no retry/page fetch. See [results and limitations](21c-query-comparison-results.md). This is one coverage experiment following [the frozen automated review](search-quality-review.md#milestone-21b--frozen-blinded-review). Milestone 21 remains in progress. The frozen scope below records what was reviewed; it permits no additional dispatch.

## Question and fixed comparison

Thirty of forty-seven saved links still require clarification under the blinded review. Terse returned metadata and collection pages limit useful support more than recognized-role ordering alone. Test whether including optional tool terms narrows access to openings with explicit India/remote evidence. This is a hypothesis, not a predicted improvement.

Use controlled public test preferences, no profile. Run these two engine-owned plans consecutively:

1. **A, current baseline:** `Software engineer jobs India Remote Python SQL`
2. **B, omit optional tools:** `Software engineer jobs India Remote`

Both retain software engineer, India, remote and any seniority. Python/SQL are optional query preferences, not mandatory eligibility filters. Local assessment uses the same synthetic `Software engineer Python SQL` reference for both arms so the comparison changes only provider query terms. Product queries, filters and defaults are unchanged by running the experiment.

Each arm makes five sequential basic POSTs to `https://api.tavily.com/search`, one per fixed production source:

| Request within each arm | Source | Exact include_domains |
|---|---|---|
| 1 | Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io` |
| 2 | Lever | `jobs.lever.co`, `jobs.eu.lever.co` |
| 3 | Ashby | `jobs.ashbyhq.com` |
| 4 | Workday | `myworkdayjobs.com` |
| 5 | SmartRecruiters | `jobs.smartrecruiters.com`, `www.smartrecruiters.com` |

Production request options remain `search_depth: basic`, `topic: general`, `max_results: 10`, `auto_parameters: false`, `include_answer: false`, `include_raw_content: false`, `include_images: false`, `include_favicon: false`, `include_domains_mode: restrict`. HTTPS/TLS validation, no redirects or environment proxy, response/text bounds, canonical URL validation and credential-echo rejection remain enforced by the adapter.

**Combined ceiling: ten requests, one hundred raw candidates, one hundred fifty seconds of search, ten estimated basic-search credits.** Each arm retains its existing five-request/fifty-candidate/seventy-five-second limit. Stop the comparison on a provider failure, cancellation, time limit or uncertain outcome; preserve available evidence and do not proceed to the second arm after an incomplete first arm. No retry, extra query/source, page retrieval, extract/crawl request, account-usage check or credit purchase is included. Stopping cannot recall sent requests or their billing.

Tavily's [official credit documentation](https://docs.tavily.com/documentation/api-credits), checked 2026-10-13, lists one credit per basic search and $0.008 per pay-as-you-go credit: at that listed rate the ceiling is **$0.08**, subject to the account's existing plan/allowance. Actual billed usage remains unverified. This review authorizes no billing configuration change. The [official Search API reference](https://docs.tavily.com/documentation/api-reference/endpoint/search) confirms the search endpoint/options and restrictive domain mode; provider scope behavior still needs observation.

Use only the existing JobScout OS-vault key internally. Tavily sees generic queries, options/domain filters, required credential and normal network/account metadata. The runner must not load a resume/profile, private career text, application notes, local matching evidence, personal identifiers or a model. No personal data or local path is sent.

## Evaluation fixed before dispatch

Preserve each arm's full public candidate envelope separately in ignored local storage, with source provenance, retrieval time, engine duplicate/discard/coverage counts, per-source timings and the exact reviewed plan. Do not merge arm A/B before assessment or conflate within-arm duplicates with between-arm overlap. An exclusive one-use marker must prevent replay after an uncertain outcome. Commit only aggregate methodology/results; no credential, raw returned text, URLs, reviewer identity or local paths.

Give every retained link in each arm to a blinded reviewer before comparing production scores. Keep the review rubric fixed: page type; role/India/remote support, contradiction, conflict or unknown; returned-text review value; restrictions; suspected identity and unverified freshness. Use the same definition of country evidence for both arms, separate physical-timezone requirements, and resolve rubric disagreements explicitly. Keep original labels immutable and publish any adjudication as a separate sensitivity analysis.

Compare supported and needs-review counts separately across full pools and first-ten display groups, primary/alternative differences, labeled candidate retention, collection share, unknown fields, restriction coverage, canonical overlap/source contributions, elapsed time and estimated credits. The primary outcome is independently reviewed supported-opening yield per bounded arm; secondary outcomes include first-ten visibility and plausible-candidate retention. Report ties, regressions and incomplete arms. No universal ten-job pass quota and no switch to B based solely on raw count or one trial.

This paired case is a source/query diagnosis, with sequential order and temporal confounding. The predeclared case registry also includes quality-engineer/India/remote and data-analyst/Canada/hybrid cases for a later representative review. **Only A/B are included in this proposed ten-request scope.** The other cases require separate acquisition scope. One pair still cannot close representative quality, freshness, personal suitability or installed release acceptance.

## Offline preparation

[The case registry](../evaluation/search-quality-cases.json) freezes public criteria, exact expected queries and synthetic references before new results. Run:

```powershell
.venv/Scripts/python.exe scripts/verify-quality-cases.py --verify-only
```

This verifier uses production engine query/plan construction, checks all four expected queries and prints the A/B ceilings. It supports no dispatch mode and accesses no vault/profile/model. The `review:quality` runner binds A's exact historical query by default; `--case software-india-remote` explicitly selects B's exact query/criteria. Both use the same synthetic reference and optional byte-bound frozen labels. Quality-engineer and analyst cases remain acquisition/analysis follow-up with no dispatch in this trial. The approved A/B scope is consumed; any additional dispatch requires fresh exact review.
