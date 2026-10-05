# Privacy is the product

Status: product contract and implementation requirements. Local PDF/DOCX extraction, text review, and explicit reviewed-text saving/deletion are implemented. Optional provider-key setup and an explicit account connection check are implemented. Explicit Tavily search is implemented for local development; live-provider and interactive release verification remain pending. Future controls below must be implemented and verified before enabling those features.

## Promise

Help people find jobs without uploading their personal career information. Resume parsing, profile creation, embeddings, retrieval, matching, and explanations run locally. There is no hosted AI fallback. Privacy must remain useful and understandable for someone installing the application for the first time.

Use the product message: **Find your next role. Keep your personal story private.**

## What stays on the computer

- Resume files and their filenames, extracted text, OCR output, and document metadata.
- Names, contact details, addresses, personal links, employment and education history, and private notes.
- Profiles, embeddings, vector indexes, prompts containing personal data, and generated assessments.
- Saved jobs, application status, interview notes, and search history associated with the user.

No telemetry, tracking pixels, remote fonts, automatic crash uploads, or background sync. Do not fetch images, links, scripts, or other embedded resources from imported documents or job descriptions. Store personal information outside the repository and exclude it from logs and diagnostic exports. Local storage is not automatically encrypted or protected from other software running as the same user; do not claim that it is.

## What optional online features may send

| Action | Permitted outbound content | User guidance |
|---|---|---|
| Explicit job search | Reviewed generic role, broad search region, seniority, work arrangement, and selected public skill categories; required provider authentication | Preview the actual query and provider. Omit region if the user prefers. A search region is a job preference, not an inferred home address. |
| Provider connection check | Saved Tavily credential in the Authorization header for one fixed HTTPS GET to its account usage endpoint; no request body, profile or job criteria | Review the exact endpoint/data disclosure before explicitly sending. No search is performed; provider billing/rate-limit rules apply. Stopping waiting cannot recall a sent request. |
| Model/runtime download (planned) | Model identifier and required download request | Show source, license, size, and network requirement; never attach profile data. |
| Open a provider or job website | Normal browser navigation | Clearly indicate that this opens an external site with its own data practices. Never append personal data to URLs. |
| Periodic job discovery (planned mature feature) | The same reviewed generic criteria as an interactive search, sent at the user-selected interval | Explain that requests occur while the desktop is closed, may consume credits, and reveal timing/network/account metadata. Provide pause/off/next-run controls. No resume or personal career data is sent. |

Credentials go only to their intended provider, over HTTPS, and belong in an OS-backed secret store. JobScout requires no central account. Provider accounts may be necessary for search APIs.

Implemented local setup: Settings can explicitly save/replace/remove a Tavily key in Windows Credential Manager and check whether one is saved. These local operations send nothing to Tavily. A separate reviewed connection check sends the saved credential only to the fixed Tavily account usage endpoint; it does not search or send career data. The response is reduced to transient acceptance/fixed error information; account details are not retained or returned to the UI. Discover can send one explicitly reviewed generic query, or an explicitly reviewed broader plan of up to five controlled query variations, and show session-only text candidates. Each broader query retains the same reviewed categories; no private data or unconstrained text is introduced. Saved key bytes are never returned to the interface or stored in the profile database. Each workspace has a separate vault entry; unsupported/unavailable stores have no plaintext fallback. Other software running as the same user may access credentials. Uninstall currently retains vault entries independently of app data; remove the key in Settings before uninstalling or manage its JobScout entry in Windows Credential Manager afterward. See [the checked transport contract](architecture/0010-provider-connection-check.md) for bounds and remaining release evidence.

Automatic applications are outside the current permitted outbound actions. Before implementation, extend this contract to define the exact reviewed personal fields, resume artifact, answers, recipient and authorization that may leave the computer. Background discovery permission is never application-submission permission. Any future unattended mode requires a narrow, revocable, expiring standing policy with per-run/day caps and must route sensitive, legal, ambiguous or changed questions back to the user.

## Search without disclosing the user's identity

The desired experience is searching for opportunities without attaching a personal identity or resume. This is a restriction on query content, not a guarantee of full internet anonymity. Providers can observe search terms, IP/network metadata, request timing, and API-account association. Even generic combinations can reveal interests. Search queries must not be described as inherently anonymous.

IP masking, unlinkable credentials, provider retention guarantees, and anonymous application submission are not implemented or promised. Any future proxy or anonymity feature needs a separate threat model and verification. Applying to a job ordinarily involves sharing details with that employer; JobScout must make that external step explicit.

## Required architecture before online search ships

1. Keep personal processing in the local engine. Search adapters must receive a small typed `PublicSearchCriteria` object, with no access to resume files, profile storage, or model conversation context.
2. Construct criteria from controlled role/skill categories and explicit user choices. Do not concatenate resume text, employer names, personal links, filenames, or model-generated text into queries. Do not assume removing a name anonymizes a document.
3. Show the actual outbound query before the first search and whenever criteria change. A user's confirmation must not override the prohibition on sending personal career data.
4. Validate and serialize at one outbound boundary. Reject unknown fields, arbitrary free text, identifiers, unsafe URLs, and unexpected redirects. Treat detection/redaction as an additional check, not the primary protection.
5. Allow only configured provider endpoints and the minimum required headers. Return readable errors and keep analysis available when search is skipped, cancelled, or unavailable.
6. Treat job content as untrusted data. It cannot instruct the app to disclose local files, alter network permissions, or call tools. Render text safely and do not automatically load trackers or embedded remote resources.
7. Keep operational logs free of personal content and credentials. A local activity view can show provider, time, and action; detailed query history requires deliberate local retention controls.

## Release evidence

Local candidate-content classification uses only already-returned titles/snippets, with exact evidence, uncertainty and reversible hiding. It does not fetch result pages, persist assessments or make provider requests; opening language is not verified vacancy status. See [decision 0018](architecture/0018-local-content-signals.md).

The local shortlist evaluation uses only checked-in synthetic profiles and candidate pools. It invokes local analysis and frontend validation/filtering without provider requests, credential access or profile persistence. Labels and results are diagnostic judgments, not verified vacancy or live-provider quality claims. See [the evaluation baseline](shortlist-evaluation.md).

The isolated Tavily search adapter has captured synthetic request tests for controlled-query serialization, fixed authentication/options/endpoint, forbidden private fields, redirects, response bounds and malicious result text/URLs. It performs no result-page or embedded-resource fetch. Decision 0012 adds explicit dispatch and text results, with synthetic API confirmation and rendering checks. Interactive and live-provider release verification remain pending. See [decision 0011](architecture/0011-bounded-discovery-adapter.md).

Before advertising private online discovery, inspect captured outgoing requests using synthetic profiles with distinctive identifying markers. Verify that those markers, resume contents, embeddings, and extra fields never reach providers. Exercise malformed criteria, provider errors, redirects, malicious job text, cancellation, and offline behavior. Check that installed model inference uses only the local runtime and that no unexpected outbound requests occur while working locally.

Also verify deletion of all app-owned copies, derived text, indexes, caches, and records. Respect shared models and explain what uninstall retains. Do not claim secure disk erasure. See the installation design for the setup experience.

## Result normalization

Shared-skill explanations show only exact matched category phrases from the reviewed resume and candidate title/snippet. These phrases remain in transient local analysis; no surrounding profile context, evidence or explanations are sent to providers or saved. Frontend validation checks the phrases against the exact local sources before rendering. They establish mentions, not proficiency or verified job requirements. See [decision 0016](architecture/0016-local-match-evidence.md).

Planned local summary work may suggest roles and experience/seniority from resume chronology and responsibility evidence. Such estimates will remain local, cite source spans, show uncertainty and require user review. JobScout will not claim exact years, verified seniority or missing qualifications when the resume does not support them. Only user-confirmed catalog categories may affect an outbound query.

Reviewed resume text can now be analysed through a separate authenticated local assistance route. Fixed word/alias rules suggest only supported public role/skill identifiers. Users see the category summary and engine query before explicit dispatch and can correct categories or use manual preferences. The assistance module has no provider, credential or database access; it stores nothing. Region, seniority and work preference are not inferred from private text. Candidate titles/snippets can be analysed locally for category mentions and compared with resume skill categories for transparent ordering and result filters. Private input, category analysis and result filters never become extra provider fields. See [decision 0015](architecture/0015-two-path-local-discovery.md). No LLM summary or model inference is implemented in this slice.

Search result links are normalized and deduplicated locally: known tracking parameters and fragments are removed while job identifiers and unknown parameters remain. Source domains are displayed as plain text; the app does not resolve or fetch them. Retrieval timestamps come from the local engine and do not establish when a listing was posted or whether it is still open. Duplicate counts apply to canonical links within and across responses in the same broader run; different URLs may still refer to one job. No normalization data is sent to providers or saved as durable search history. See [decision 0014](architecture/0014-candidate-link-normalization.md).

## Current saved-text controls

Only explicitly saved reviewed text and its save timestamp persist in the local database. Original file bytes, filenames, and unsaved edits are not persisted. Save replaces the previous record. Discarding/removing a draft keeps saved data. Delete saved profile removes the saved record and clears the current draft/import in the UI; it leaves the original document intact. SQLite uses overwrite-on-delete and non-retained rollback journaling, with synthetic restart/replacement/deletion checks. This does not promise secure disk erasure or deletion from external backups. Storage is not encrypted. Default profile retention passed a scoped silent install/uninstall check; interactive optional data cleanup remains unverified.

Local query previews may identify Tavily when its key is saved. This checks only OS-vault entry presence and performs no provider request or key readback. If the vault is unavailable, the query remains usable with no provider available in that preview. The preview discloses the future fixed Tavily search endpoint and provider-visible query, authentication, network metadata and API-account association. Opening Settings discards the prior snapshot and review. Preparing a query neither verifies a key nor authorizes sending it. Find jobs on the preferences side only prepares and displays the local query. Find jobs on the query side explicitly confirms the displayed query or full broader plan and authorizes its disclosed request limit; no separate review button is required. The textbox is read-only and edits use the controlled dropdowns. See [decision 0013](architecture/0013-compact-query-confirmation.md).

The first search flow accepts only exact controlled criteria, fixed provider/version, matching reviewed query and explicit confirmation. It checks the key only after validation and prevents overlapping searches. Results are bounded untrusted text, with no automatic website/image/resource loading or durable history. Stop waiting discards replies but cannot undo a sent request or its credits. Captured synthetic API and renderer tests pass; interactive browser/native checks and a deliberate live-provider trial remain pending before public-release claims. See [decision 0012](architecture/0012-explicit-search-flow.md).

## Bounded broader discovery

The optional broader plan previews every query, up to five sequential basic requests, up to 50 candidates before deduplication/filtering, a 75-second wait limit and an estimated five-credit ceiling under current basic-search pricing. A single-search option remains. The engine exactly revalidates the plan before reading the saved key and revalidates each fixed variant before dispatch. Only the same controlled public categories and fixed search intent terms reach Tavily. No result content, run ID, profile, match evidence or private text becomes a provider field.

Progress/cancellation are authenticated local UUID routes. Counts and bounded run-ID memory remain transient; there is no durable search history. Stop discovery asks the local engine to cancel its active wait and skip unsent requests while returning earlier safe results. Confirmation can fail when local connectivity is lost; an already-sent provider request cannot be recalled or guaranteed unbilled. A failed request stops further dispatch without retries. Results disclose partial coverage and honest shortfalls; they are not verified vacancies. See [decision 0019](architecture/0019-bounded-broader-discovery.md). No live provider call was used to validate this increment; interactive/live-provider release checks remain pending.
