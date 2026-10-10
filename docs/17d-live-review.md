# Approved 17D live quality trial — 2026-10-10

Status: **completed once on 2026-10-10; approval consumed**. The user explicitly approved the exact query, five ATS scopes, five basic requests, fifty raw candidates, seventy-five seconds and five-credit ceiling below. All five requests completed in 15.398 seconds, retaining 47 unique links. Offline filters leave 33 reviewable groups but zero with recognized joint role/India/remote support; 17D remains partial. See [results and limitations](17d-live-results-2026-10-10.md). Current shortlist quality target: ten to twenty suitable unique opportunities; request budgets are separate. This approval is independent of implementation/release planning and does not permit retries, extra queries, page retrieval, account-usage checks or credit purchases. Historical permissions are not reused.

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

Keep the bounded public candidate envelope in ignored local storage solely for offline review; commit only aggregate evidence. Evaluate canonical links/groups, boards/resources, exact role/region/remote support, contradictions, unknowns, and first-ten support using existing local rules. Report suitable-evidence shortfalls without padding. Retrieved snippets and URL shapes cannot establish current vacancy status, eligibility or freshness; no promise of ten to twenty suitable jobs follows from fifty results.

Approval applied to this completed bounded run only. Any further dispatch needs a new concrete review, even with unchanged query, scope or limits.
