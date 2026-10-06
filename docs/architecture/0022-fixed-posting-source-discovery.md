# Decision 0022 — Reviewed fixed posting-source discovery

Date: 2026-10-06. Status: implemented locally; first live comparison failed safe response validation; interactive verification pending.

## Evidence and decision

The authorized intent-variation trial returned 23 unique pages, all with collection signals. Replace broader-plan version 1 with version 2: five sequential basic searches of the same controlled public query, each restricted to a fixed employer/ATS source group. Single-search mode remains the existing unrestricted generic search.

| Source group | Reviewed domain restrictions |
|---|---|
| Greenhouse | boards.greenhouse.io, job-boards.greenhouse.io |
| Lever | jobs.lever.co, jobs.eu.lever.co |
| Ashby | jobs.ashbyhq.com |
| Workday | myworkdayjobs.com |
| SmartRecruiters | jobs.smartrecruiters.com, www.smartrecruiters.com |

These are source scopes sent to Tavily, not new direct network endpoints or integrations. The only search endpoint remains the fixed HTTPS Tavily search endpoint. The [official Tavily Search contract](https://docs.tavily.com/documentation/api-reference/endpoint/search) documents `include_domains` and explicit `include_domains_mode: restrict`; prefer mode can admit other domains and is not used. No SDK or page crawling is added. Lever's [official posting documentation](https://github.com/lever/postings-api), Ashby's [hosted-board documentation](https://docs.ashbyhq.com/embedding-ashby-job-boards-in-an-external-careers-page), and Greenhouse's [board documentation](https://harvestdocs.greenhouse.io/reference/get_v3-job-boards) support the hosted source choices. This is a narrow initial catalog, not comprehensive job-market coverage.

## Contract and lifecycle

Plan version 2 adds ordered `sources` records (`name`, `domains`) alongside five identical `queries`. Preserve five-request, ten-results-per-request, 50-raw-candidate, 75-second, estimated-five-credit limits and existing authenticated progress/cancel/partial-result handling. Query-version 1 and base reviewed query remain unchanged. The engine reconstructs and compares the complete exact plan before reading the key; the adapter reconstructs each source group before dispatch. No free-text employer/domain input, profile-derived scope, unknown field or arbitrary endpoint is allowed. Frontend validation independently checks exact groups/order, deep-freezes sources and rejects stale version 1 plans.

Preview lists each source, query and all domains before explicit Find jobs confirmation, plus coverage limits and the single-request opt-out. Duplicate query text uses stable source indexes for rendering. Sending the plan authorizes only those five scopes; no retry, fallback source or automatic criteria broadening is added. Each reviewed role/skill/region/arrangement/seniority stays unchanged in every query. Same-key setup, skip, recovery and cancellation behavior remain. Rebuild/restart frontend and engine together; stale previews must be regenerated. No persistence migration or new dependency.

Existing URL safety and untrusted-text rendering remain. Returned actual hostnames remain visible; asking the provider for a source restriction does not verify a listing's employer, job identity, openness, freshness or eligibility. Collection and sparse pages remain locally distinguishable/reviewable. Employers on other ATS/custom domains are outside this plan. Source restrictions can reduce results dramatically for narrow criteria; fewer than 30 candidates is an honest outcome, not permission to send additional requests.

## Validation and next gate

Captured synthetic requests assert all five exact scope lists, restrict mode, basic depth and exact outbound option set. Modified/reordered/private source lists and stale plans fail before key reads; existing partial failure, timeout, cancellation, deduplication and 50-candidate bounds remain covered. Frontend checks cover all displayed sources/domains, deep immutability and rejection of altered plans. Existing seven-case local shortlist evaluation remains unchanged.

Next: separately reviewed live comparison against the original five-request baseline, inspecting unique individual-posting pages, collection noise, visible role/location/work-mode evidence, latency and domain adherence. Count URL/title evidence separately from verified vacancies. Actual billing, native interactions, full desktop RAM and source freshness remain independent gates. Milestone 17 remains partial until suitable individual-opportunity coverage is demonstrated.

## First authorized comparison

The user explicitly authorized the exact query Software engineer jobs India Remote Python SQL for these five domain groups. The run stopped after the first request in 2.58 seconds with provider_invalid_response: one request attempted, zero completed, zero accepted candidates. No later sources, retries, usage checks or pages were requested. Billing is uncertain. The response failure reason cannot be established from the fixed public error alone; do not infer poor source coverage from rejected data or weaken validation speculatively. A separate one-request Greenhouse diagnostic review is pending. Existing synthetic request/privacy and packaging evidence still applies; live quality remains unverified.

Continuation: the bounded diagnostic isolated one URL rejection among ten otherwise bounded results. [Decision 0023](0023-discard-unsupported-result-links.md) preserves independently valid candidates and separately accounts for discarded links without weakening destination rules. A separately authorized fresh comparison then completed all five requests in 15.781 seconds with forty-nine safe unique links and one discard. Forty-four URLs have individual-posting shapes, five have board shapes, nine titles repeat one Latin America role, and two returned hosts fall outside the requested SmartRecruiters scopes. The pending-review wording above records the earlier checkpoint; full comparison is now complete, while suitable-opportunity coverage, source adherence and freshness remain unresolved.
