# 0010 — Restricted provider connection check

Status: accepted for the connection-check increment, 2026-10-01. Search dispatch remains unavailable.

## One disclosed operation

Settings offers Review connection check only for a saved Tavily key with no replacement draft. It then shows the exact destination, credential/network/account disclosure and provider billing/limit caveat. Send connection check is a separate explicit action. Opening Settings, checking local key status, saving/removing a key, health polling and query preview never perform this request. There is no automatic retry or connection check on startup.

The check uses the documented [GET account usage endpoint](https://docs.tavily.com/documentation/api-reference/endpoint/usage), `https://api.tavily.com/usage`, rather than running a sample search. No resume/profile/criteria/query or body is sent. Billing policy is provider-owned; do not promise that an account check is permanently free. The response only establishes that Tavily accepted the saved key at that moment; it does not establish available search credits or guarantee later availability. Key-level limits alone cannot establish account/pay-as-you-go allowance.

## Internal retrieval and transport

The secret-store interface gains engine-only read. Windows returns a bounded printable ASCII key from its dedicated vault entry and clears/frees the allocated native copy on success/error. Retrieval never returns secret bytes to a frontend route. Missing, inaccessible or malformed vault entries fail closed. Immutable Python/request strings may remain transiently in process memory; no complete memory-erasure claim is made.

`TavilyConnection` has no storage, resume, model or search imports, except the existing strict duplicate-JSON helper from the public search domain. It accepts only a credential, validates it again to exclude header injection, and has one fixed operation. The HTTPS URL, GET method, minimal application headers, empty body, verified TLS, disabled redirects and environment-proxy/netrc bypass are engine-owned. New clients do not reuse cookies or authentication across checks. One request is attempted; error bodies, redirects and provider account details are never returned or logged by JobScout.

Response bounds: ten-second total network/stream deadline, five-second HTTP phase timeouts, 16 KiB raw response limit including streamed bodies without Content-Length, JSON media type, identity encoding only and duplicate-key rejection. Reject invalid length/encoding/schema rather than expanding/decompressing responses. Only the documented key usage/limit integer shape and account object are inspected; raw account/usage content is discarded. Fixed codes distinguish invalid key, rate limit, quota limit, timeout, unavailable provider and unsupported response. This transport proves the usage-check boundary only; it does not authorize `/search` or arbitrary URLs/headers.

## Local API, state and cancellation

Authenticated POST `/api/v1/providers/tavily/check` accepts exactly `{confirmed:true}`: 256 bytes maximum, a five-second body deadline, JSON-only and duplicate/unknown-field rejection. Validate before reading credentials or invoking transport. A single-check lock rejects overlap with a fixed busy error; the separate setup lock protects retrieval against simultaneous key mutations without blocking navigation/local health. Browser and native bridges expose this fixed route/command only. Responses are no-store and contain either a fixed error code or `{provider:'tavily', connection_verified:true, dispatch_available:false}`.

The result is transient and applies only to the explicit check. Local provider-status responses continue to report connection_verified=false; no account details or durable verification state are stored. Criteria/query preview continues to report provider=null, dispatch=false. An active-provider selection and configured-provider preview are the next separate slice.

During a check, settings mutations are disabled. Stop waiting immediately clears local result/progress, aborts browser waiting and invalidates late native/browser results. It does not recall or guarantee cancellation of a request already sent; the bounded engine request may finish. A new check may receive busy until the previous request finishes. Disconnect, unmount, local-status refresh, draft edit and setup changes also invalidate the result. Each retry requires the disclosure/action again. Unknown transport failures never echo diagnostics or silently retry.

## Evidence and limits

Forty-six new synthetic engine tests capture the fixed method/endpoint/empty body/headers and reject confirmation misuse, extra private context, duplicate keys, unauthenticated/missing-vault requests, redirects, error bodies, oversized/encoded/malformed responses and unexpected schemas. Tests cover proxy/TLS settings, timeout closure, no retries, duplicate-check suppression and non-echo logging. Real isolated Windows vault tests now also verify internal read. Full engine suite: 140 passed. Six new frontend tests cover routing, response validation, mapped errors, stopping/late responses, overlapping requests and explicit retry. Full frontend suite: 22 passed. Frontend production build and Windows NSIS packaging pass (22.08 MiB).

No live Tavily request or real key was used. Browser visual verification could not run because the desktop automation runtime failed to start after the earlier session interruption; a reset/retry also failed. The disposable synthetic harness was not used to claim UI evidence. Native UI/packaged credential retrieval and live account behavior remain unverified. The public search privacy release gate still needs captured `/search` requests and malicious job-content/normalization checks before discovery ships.

## Live response compatibility — 2026-10-02

A usage-only live check exposed key.limit=null in an otherwise accepted JSON response. The validator now requires a present limit that is either null or a bounded nonnegative integer. Usage remains a required bounded integer; account remains an object. No account values are returned or retained. Null establishes no quota guarantee and is not interpreted as unlimited. Synthetic regressions and a repaired live usage-only check pass. This supersedes the earlier numeric-limit-only assumption; live search and native interaction remain separate evidence.
