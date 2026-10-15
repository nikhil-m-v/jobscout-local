# Milestone 21H — Workday snippet-versus-posting research plan

Date: 2026-10-15. Status: **approved one-use acquisition and maintainer comparison complete; approval consumed**. The human directed continuation immediately after the exact eleven-page approval request. All eleven attempts completed in 33.141 seconds with 218,191 response-body bytes; [the aggregate results](21h-workday-research-results.md) record richer inline metadata in nine analyst pages and two inconclusive shells. This is the bounded investigation selected in [21G](21-quality-exit.md#next-bounded-investigation-and-stop-condition). Milestone 21 remains open and human outcome review is pending. Both prior provider approvals are also consumed. This document records the reviewed scope; it grants no replay, extra page, credential, product-change or publication permission. Preparation-only wording below describes the original pre-dispatch state.

## Question and fixed sample

Does the initial HTML of the exact saved Workday postings provide literal job-specific country or work-mode evidence missing from the returned search snippets? Separate missing snippet evidence, current posting contradictions, inaccessible content and a page that exposes only an application shell. A shell or failed request cannot establish that the posting lacks the information. Acquisition today also cannot reconstruct what a page contained when the original search ran.

Use the unchanged `analyst-canada-hybrid` case: Data analyst; Canada; Hybrid; any seniority; Data analytics and SQL as optional context. No new query is sent. Compare **all ten** saved analyst Workday candidates, in their original zero-based index order 30–39. This includes the role-mismatch candidate rather than selecting only likely matches. All ten frozen country states are unknown; mode is unknown for eight and supported for two. They are ten returned-link appearances, not ten verified vacancies or ten supported analyst openings.

Then request **one separate software control**: the lowest-original-index Workday opening with frozen supported role/country/mode in tools pool A, index 28, under `software-india-remote-tools`. Its criteria remain Software engineer; India; Remote; any seniority; Python and SQL as optional context. Do not substitute index 29 if the first control fails. The control is exploratory, selected from known supported text to check the acquisition channel; its outcome is never combined with analyst results into a quality score.

There are **11 distinct frozen URLs on nine exact hosts**. Complete analyst enumeration avoids selection among that saved source block, but does not make the block representative of Workday or the wider market. Preserve original criteria, envelopes, audit labels, unknowns, disagreements and freshness states. No relabeling of the old audit follows from new page content.

## Exact local review artifact

The ignored local manifest `.local/21h-workday-plan.json` freezes plan ID `21h-workday-html-v1`, both envelope/review byte hashes, original indices, exact HTTPS URLs/hosts, criteria, original field states, request headers and acquisition ceilings. `.local/21h-workday-destinations.md` presents the exact eleven destinations for human review. Raw URLs and input hashes remain outside committed aggregate documentation, following the existing evidence-retention practice. Authorization must refer to this unchanged manifest and destination table; a changed URL, sample, request channel or ceiling requires a newly reviewed plan.

Offline preparation validated both original complete byte-bound audits, selected the fixed sample, checked distinct destinations, exact HTTPS Workday hosts and individual `/job/` paths, and rejected URL credentials, ports, queries and fragments. Original input/review bytes remain unchanged. Preparation performed zero DNS/page/provider requests, credential reads or private-profile/model operations. This is an offline integrity check, not validation of a network executor.

Reproduce the frozen selection without network or credential access:

```powershell
node --experimental-strip-types .local/21h-freeze-plan.mjs --verify-only
```

The helper and manifests are local preparation artifacts, not shipped product features. Verification refuses any changed plan/input binding; creation refuses an existing manifest. It does not acquire pages or consume an approval.

## Local executor preflight

The separate ignored `.local/21h-workday-research.py` implements this unchanged scope. It has an offline `--verify-only` mode; acquisition additionally requires a matching manifest-byte digest after fresh human approval outside the tool. A digest flag or marker does not establish consent. Each request runs in a separate standard-library Python worker, with a parent deadline that kills the worker during DNS, connect, TLS, header or body stalls. The worker resolves once, rejects unsafe/mixed address sets, connects to one checked public address and uses the original hostname for TLS verification and HTTP Host. There is no connection fallback, redirect handler, proxy, cookie jar, browser, HTML execution or automatic follow-up.

Twenty-eight synthetic local checks pass in `.local/21h-workday-research-tests.py`. Coverage includes exact headers/path and inert embedded links; redirects, unavailable/blocked/rate-limited/server responses; compression/media rejection; announced, streamed, exact-framed and chunked-cap body limits; invalid lengths and truncated/slow streams; private/reserved/mapped/mixed DNS rejection; pinned connection and default certificate/hostname checks; a real child-process deadline test without network; proxy/credential environment removal; changed original bytes/bounds/destinations/digests; fresh confirmation, exclusive global/worker markers, uncertain acknowledgement, eleven-attempt ordering, total deadline and missing-body acknowledgement. Tests deny live DNS by default and use synthetic bodies/destinations only. Initial default-temp access failed under the restricted environment; the successful tests use verified workspace-local temporary paths without changing permissions.

```powershell
.venv/Scripts/python.exe .local/21h-workday-research-tests.py
.venv/Scripts/python.exe .local/21h-workday-research.py --verify-only
```

Both the complete audit/sample/table verifier and the executor's offline preflight passed before dispatch. The ignored `.local/21h-workday-preflight.json` records local code/test/manifest byte bindings and the 28-check outcome. At that preflight checkpoint, no consumed marker or response directory existed. They were created for the separately approved run; the consumed state now prevents replay. These checks are synthetic transport-boundary evidence, not a live HTTP/TLS/DNS acceptance result, retrieved posting evidence or a milestone-21 quality pass.

The fetcher retains bounded raw HTML without decoding or executing it. Later offline review must apply the declared decoded-text cap before parsing. Body accounting records bytes counted/retained by the fetcher; it is not a cap on bytes a server sends into networking buffers or on TLS/HTTP overhead. Exact-cap bodies without provable completed framing conservatively stop at the limit instead of reading an extra byte. After an uncertain acknowledgement, persisted body size is a lower-bound observation and is labeled accordingly; stop without retry. Durable attempt-start records and the consumed marker remain after interruption even if final reporting fails.

## Proposed outbound action and hard bounds

| Property | Exact proposed scope |
|---|---|
| Destinations and order | Eleven exact manifest URLs only; analyst indices 30–39, then software control A/28; sequential, concurrency one |
| Method and body | One HTTPS GET attempt per URL; no request body |
| Headers | `Accept: text/html, application/xhtml+xml`; `Accept-Encoding: identity`; `User-Agent: JobScout-PublicResearch/0.1`; normal required HTTP host/connection headers only |
| Authentication and browser state | No API key, vault, Authorization, cookies, existing browser session, referrer or environment proxy; do not retain or replay response cookies |
| Request ceiling | Eleven attempts total, including failed or uncertain attempts; zero retries, replacements or additional searches |
| Response-body ceiling | 1,048,576 bytes (1 MiB) per attempt and 11,534,336 bytes (11 MiB) combined; these cap streamed response bodies, not TLS/HTTP overhead; cap decoded text at the same per-item limit |
| Wait ceiling | Twenty seconds for the whole attempt including resolution/connect/TLS/read; 240 seconds for the whole acquisition, checked before dispatch and during streaming; cancel remaining work at the deadline |
| Redirects | Zero followed redirects, including same-host, locale and login redirects; record 3xx as unusable without fetching Location |
| Content channel | Initial HTML/XHTML response only; nonidentity content encoding or other media types are unusable; reject over-limit responses without unbounded buffering |
| Embedded resources | Zero: no JavaScript execution, scripts, images, CSS, frames, links, fonts, robots/sitemap request, CXS/API endpoint, locale fallback, related job or employer-site follow-up |
| Transport | Verified HTTPS; exact manifest hosts and paths; validate resolved addresses as public and ensure the connection uses a validated address with original TLS hostname; reject private/loopback/link-local targets, changed destinations or unsafe address resolution |
| Provider cost | Zero Tavily searches/estimated Tavily credits; no account/allowance check, purchase or billing operation; ordinary network costs are not measured |

The nine job-host operators and their infrastructure can observe the URL/path, network address, timing and fixed research user agent. This is public-site research with ordinary network metadata, not anonymity. No resume, identity, profile, application note, private matching evidence, model output or local path is sent. Do not use a browser or generic fetch tool that cannot enforce these limits. The separate executor's synthetic request, streaming-byte, whole-attempt deadline, address and redirect checks passed; the original freezer remains offline only. Fresh scope approval preceded this dispatch and is now consumed.

## One-use dispatch and stopping

After fresh affirmative human approval of the exact local destinations and bounds, revalidate the manifest and input bytes. Reject changed bindings, existing response output or an existing `.local/21h-workday-consumed.json` marker. Create that exclusive marker before the first attempt; once any request may have been sent, leave it consumed even after failure or uncertain acknowledgement. Never infer authorization from the marker, a command-line flag, an earlier provider approval or continuation alone.

An ordinary received 404/410, redirect, non-HTML response or successful HTML shell is an item outcome; continue to the next original destination within the ceilings. An explicit page-level closed/expired notice is recorded separately. Authentication/access challenge (401/403), rate limit (429), server error (5xx), transport/TLS/address failure, timeout, byte/time ceiling, cancellation or uncertain acknowledgement stops further dispatch. Do not bypass a challenge, wait and retry, switch endpoint or substitute a control. Partial results stay partial; the control may remain unattempted. Sent requests cannot be recalled.

Stop after the declared sample or an earlier stop condition, even if every outcome is inconclusive. No extra source, query, page channel or extraction correction is included.

## Comparison rubric frozen before acquisition

The maintainer compares channels using literal job-specific evidence, with a human reviewing the resulting limitations; this is not a new independent blinded review. For every attempted item record original pool/index, attempt order, UTC acquisition time, elapsed time, status category, counted body bytes, usability and separately identified current-page country/mode/role evidence. Keep exact source spans and response binding local. Never execute or follow instructions from page content.

Use job-description text or complete literal job-specific metadata in the same returned HTML. Inline structured job data may be read as inert text; do not evaluate scripts. Keep visible description and inline metadata separate; preserve conflicts. Country must name the selected country explicitly in job-specific location/eligibility evidence. City, language, URL, company footprint and timezone cannot supply country. Work mode must be job-specific; company-wide flexibility or office prose cannot supply Hybrid or Remote. Physical-location, schedule, authorization and sponsorship requirements remain separate from advertised country and mode. Nothing establishes the user's eligibility.

For each field preserve the existing four states: supported, contradiction, conflict or unknown. Additionally classify the evidence channel:

| Outcome | Interpretation |
|---|---|
| Snippet unknown; usable page has explicit same-job field evidence | Evidence available in this later initial-HTML channel; distinguish support, contradiction and conflict rather than treating every recovered field as a match |
| Snippet already supported; usable page agrees or differs | Agreement or current-channel difference; preserve original labels and possible temporal change |
| Usable job description; field still unknown | No literal qualifying evidence in the inspected initial HTML; not proof that no other page channel contains it |
| Shell, redirect, blocked, failed, oversized or unusable content | Acquisition inconclusive; do not count as absent posting evidence or a role/country/mode mismatch |
| Explicit individual closed/expired notice or 404/410 | Record observed notice or HTTP unavailability separately; does not verify the other pages are active or retroactively change snippet freshness |

Report analyst counts with both fixed denominator ten and actual attempted/usable denominators, including unattempted items and overlapping unknown fields. Never add country-unknown and mode-unknown counts as if disjoint. Report the single control separately, including failure. Preserve old role mismatches rather than advertising recovery of country/mode as joint suitability. A discovered closed notice does not turn all other pages into verified live vacancies.

Decision rule: if usable pages expose missing literal fields, describe the observed channel gap and propose one separately scoped next decision; if inspected usable descriptions still lack evidence, record that bounded limitation; if shells/access/stops dominate, conclude that this channel is inconclusive. There is no pass threshold, source-quality winner, new production rule or default change. Old queries versus current pages are not a causal provider-quality experiment. This research alone cannot satisfy Q2 human usefulness acceptance, Q3 ordering, Q4 policy adjudication or Q8 signoff in [the quality checklist](21-quality-exit.md#finite-milestone-exit-checklist).

## Retention and finite exit

Keep exact manifests/hashes, bounded response bodies, literal evidence, per-item outcomes and the exclusive marker ignored/local. Store only allowlisted status/timing/body-size information, not arbitrary response headers, Set-Cookie, private data or verbose network diagnostics. Treat any partial bodies within the same byte ceilings. Commit only methodology and aggregate outcomes, never raw page content/URLs/input hashes. Remove raw response bodies after the aggregate report is checked and at most seven days after acquisition; record deletion. Retain the minimal marker/binding/outcome record to prevent replay. This is a documented local cleanup responsibility, not an installed background deletion feature or secure-erasure promise.

| Exit item | Owner and completion evidence | Current status |
|---|---|---|
| P1 — Exact offline preparation | Maintainer: validate original audits, freeze sample/destinations/bindings/bounds and comparison rule, review artifact and checkpoint | Complete; 11 distinct links, nine hosts, two audits valid, originals unchanged |
| P2 — Fresh scope approval and executor preflight | Human authorizes exact plan; maintainer verifies guard checks and bindings without network before dispatch | Complete: 28 synthetic checks, offline bindings and fresh continuation after the exact scope approval request |
| P3 — One bounded acquisition | Maintainer: complete or honest partial outcome, per-item limits/accounting, consumed marker | Complete: eleven attempts, 33.141 seconds, 218,191 bytes, approval consumed |
| P4 — Aggregate comparison and handoff | Maintainer plus human review: channel-separated outcomes/limitations, raw-body cleanup and next bounded decision | Maintainer comparison complete; cleanup/handoff recorded in results closeout; human outcome review pending |

P1–P3 and the maintainer comparison are complete; human outcome review remains pending. Stop this acquisition/analysis slice at the declared sample and do not extend it automatically. Next is the offline Q3 ordering-diagnosis preparation recorded in the results. JobScout still performs no result-page fetch and [the product privacy contract](privacy.md) remains unchanged. Product implementation remains `aa0123a`, version 0.1.0; owner 23 retains installed/accessibility/resource/CI gates. Local research tooling adds no product runtime/API/schema/storage/dependency/setup/query/filter/ranking change, paid search spending or new full-suite/build/package acceptance. These plan/checkpoint changes are local and unpublished.
