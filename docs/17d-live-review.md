# Proposed 17D live quality trial — 2026-10-10

Status: **prepared, awaiting fresh user review; not dispatched**. Continuing implementation does not authorize this paid/network trial. The historical trial's permission has ended.

Use the same public criteria as the historical baseline to assess current coverage. They are test preferences, not inferred profile details: software engineer, India, remote, any seniority, Python and SQL. The production engine constructs exactly:

`Software engineer jobs India Remote Python SQL`

Five sequential POST requests to `https://api.tavily.com/search` use that same query, with one fixed `include_domains` scope per request:

| Request | Scope | Domains |
|---|---|---|
| 1 | Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io` |
| 2 | Lever | `jobs.lever.co`, `jobs.eu.lever.co` |
| 3 | Ashby | `jobs.ashbyhq.com` |
| 4 | Workday | `myworkdayjobs.com` |
| 5 | SmartRecruiters | `jobs.smartrecruiters.com`, `www.smartrecruiters.com` |

Each request uses the production basic-search adapter with at most ten results. The full run is capped at five requests, fifty raw candidates and seventy-five seconds. Stop on failure/time limit; no automatic retry, extra query, extract/crawl call or result-page fetch. Stopping cannot recall a sent request or its billing.

Tavily's [official credit documentation](https://docs.tavily.com/documentation/api-credits), checked 2026-10-10, prices basic search at one credit per request. The proposed ceiling is **five credits**; at published pay-as-you-go pricing ($0.008/credit) this is **$0.04**, subject to the account's plan and available credits. Do not change billing configuration or buy credits. No account-usage check is included, so a provider-billed usage delta would remain unverified.

Authentication uses an existing JobScout OS-vault credential; never export it. Tavily receives the generic query, search options/domain filters, credential and normal network/account metadata. No resume, profile, name/contact details, private history, match evidence, notes or local paths are sent. The runner must not load profile storage or call a model. Review criteria changes locally before any dispatch.

Keep the bounded public candidate envelope in ignored local storage solely for offline review; commit only aggregate evidence. Evaluate canonical links/groups, boards/resources, exact role/region/remote support, contradictions, unknowns, and first-ten support using existing local rules. Report suitable-evidence shortfalls without padding. Retrieved snippets and URL shapes cannot establish current vacancy status, eligibility or freshness; no promise of thirty to fifty suitable jobs follows from fifty results.

Approval applies to this one bounded run only. If the user changes query, scope or limits, prepare the replacement for review first.
