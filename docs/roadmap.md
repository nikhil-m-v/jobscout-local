# Rough roadmap — next 30 working sessions

Baseline: 2026-09-29. Each row is a small meaningful delivery, roughly one working session. These are estimates, not calendar deadlines; difficult milestones can span several days. Reorder when evidence warrants it, and preserve a working app throughout. No automation or daily reminder is implied.

## Re-estimated delivery timeline — 2026-09-30

The original 30-session plan described the full AI-assisted product, not the minimum useful release. The search-first direction shortens the first delivery target:

| Outcome | Additional working sessions from the current checkpoint | Scope |
|---|---:|---|
| First usable search demo | 4–6 | Reviewed criteria, one source, privacy boundary, and basic results |
| Model-free personal alpha | 10–15 total | Useful filtering/ranking, deduplication, local saving, basic tracking, recovery, and native checks |
| Optional-AI alpha | 16–25 total | Small embeddings, evaluated semantic matching, and optional local LLM explanations/writing help |

These ranges are cumulative from the current checkpoint. They are planning bands rather than deadlines. The largest risks are source coverage, result relevance/freshness, outbound privacy verification, and Windows install behavior. After the first search demo, reassess using measured top-ten relevance, duplicates, freshness uncertainty, latency, provider cost, storage, and RAM. If the schedule slips, defer optional AI before reducing privacy verification or core search quality.

Thirty sessions remains a reasonable upper planning allowance for the broader AI-assisted product and release hardening. It is not a requirement for a useful JobScout release.

The aim is a usable personal alpha: import and review a resume, discover relevant current jobs without sending personal career data, rank and save them locally, and track applications. Job-search quality is the main product benefit; local AI is an optional enhancement. Optional online search must remain off until its privacy boundary is verified.

## Direction update — 2026-09-30

JobScout should work well without downloading a model. A local generative LLM is not required to discover jobs through a search API or a public feed, apply explicit filters, deduplicate results, or perform initial keyword/rule-based ranking. An online provider may use AI internally; that does not require local inference or permit sending personal information.

Offer three levels, with the core remaining useful when either AI level is skipped:

| Level | Capability | Model requirement |
|---|---|---|
| Core | Discover, filter, rank with transparent rules, save, and track jobs; local resume import/review | No model download or Ollama prerequisite |
| Optional semantic matching | Compare meanings beyond exact keywords; combine similarity with explicit preferences and evidence | A small local embedding model, selected through quality/resource evaluation; no generative LLM required |
| Optional AI assistant | Interpret nuanced career text and produce grounded explanations or drafts | A separately acquired local generative model; size follows measured task quality and hardware limits |

Potential LLM use cases are editable structured resume suggestions, detailed match explanations, adjacent-role exploration, questions over saved jobs, application-writing assistance, and interview practice. These benefit from an LLM but often have simpler rule/template alternatives. They are candidates, not prerequisites or promises for the first alpha. Generated claims must cite available evidence, expose uncertainty, and never invent qualifications. Writing assistance must not automatically submit applications.

Personal resume/profile text, embeddings, notes, retrieval context, and generated assessments remain local. Models must never construct unconstrained outbound search queries; search continues to use the restrictive, user-reviewed generic criteria boundary in [privacy.md](privacy.md). No hosted-model fallback.

## Resume-assisted discovery experience — 2026-10-01

Discover is the home for assisted job finding. Amendment — 2026-10-04: keep two entry paths inside the existing search-first roadmap. Resume import alone originally only extracted/reviewed/saved text, so it produced the same query as manual search. The first local assistance slice now detects supported role/skill mentions, prepares controlled query categories, and orders returned candidates by shared skill mentions. It does not yet understand structured qualifications, career chronology or nuanced fit.

With a resume: upload/import locally → correct and review extracted text → automatically identify supported public role/skill categories and prepare the engine query → review the category summary and exact query, optionally correct categories → explicitly search → refine results with local preference filters and profile evidence. Do not require the full manual preferences form before a supported resume query. Without a resume: choose job preferences and optional skills → prepare/review the engine query → explicitly search → results with local filters, preserving provider order unless an explicit local ranking basis exists. Saving a resume is optional for either session flow.

Personalisation changes candidate-specific local analysis, controlled query categories and returned-result ordering; it does not train a separate model for each upload or promise unique results for every person. Candidates with the same supported categories may receive the same provider query. Names, employer history, contact details, private summaries and unconstrained generated text must never enter provider requests. Do not infer location or preferred work mode from resume addresses/history. Query generation stays behind the existing controlled catalog, engine revalidation and explicit confirmation boundary.

Current implementation uses deterministic word/alias rules with visible category summaries, supported-role fallback, cancellation, stale-state invalidation and session-only analysis. Results filters act on category mentions in titles/snippets, keep missing details by default, and do not establish verified location, requirements or eligibility. Shared skill counts are transparent ordering evidence, not a fit probability. The current provider pool remains at most ten; this does not satisfy the 30–50-job shortlist gate.

Keep optional local LLM summarisation and richer structured extraction in milestones 27–30 after runtime/model selection, resource/licence checks and evaluated evidence quality. A local LLM may produce a private reviewable candidate summary and suggest fixed public categories; it must not write an unconstrained outbound query. Preserve the deterministic fallback when the model is skipped, unavailable or cancelled. Compare relevance and effort against manual search before enabling richer matching. Existing saving, tracking, data controls, release verification and mature-product backlog remain in sequence.

PDF resumes are now limited to 10 pages. DOCX remains bounded by file size, extracted text and parser complexity; it has no reliable rendered-page count.

## Feature priorities and mature-product backlog — 2026-10-01

Implementation direction: [architecture decision 0007](architecture/0007-assisted-discovery-and-applications.md) defines module boundaries, data flow, local AI evidence, task recovery and the separate future submission boundary.

The first priority is a useful shortlist, before improvement advice, resume tailoring or automatic applications. These are planned features, not implemented capabilities. The later features extend beyond the current 30-session estimate; schedule them after the core discovery quality gate rather than adding speculative delivery dates.

| Priority | Feature | Intended behavior and completion evidence |
|---|---|---|
| 1 — core, first | 30–50 relevant job opportunities | Discover returns a ranked shortlist targeting 30–50 unique opportunities matching reviewed filters and the candidate's locally reviewed profile. Apply explicit location/work-mode and other supported filters, deduplicate, and rank locally with supporting job/profile evidence. Fetch a bounded candidate pool with progress, cancellation and provider quota limits. If fewer suitable jobs exist, show the actual count and coverage limitations rather than padding with poor matches. Evaluate relevance across the shortlist as well as the first ten; a query form or raw provider results do not satisfy this milestone. |
| 2 — mature product | AI-assisted skills and certification gaps | Across the retrieved shortlist, use optional local AI to extract and normalize requested skills/certifications, distinguish required from preferred, and compare them with reviewed candidate evidence. Show recurring areas for improvement with counts such as “requested in 18 of 40 analyzed jobs,” source snippets and links, analysis coverage, and uncertainty. Count each deduplicated job once. Say “not evidenced in your profile” until the user confirms a gap; absence from a resume does not establish lack of a skill or certification. Users can correct suggestions. Personal comparisons and AI processing remain local. |
| 3 — mature product | Job-specific resume fine-tuning | For a selected job, suggest minor wording, spelling, ordering and emphasis changes using local AI and existing candidate evidence. Show a before/after review, preserve the original, and let the user accept or reject each change and export a separate tailored version. Never invent experience, skills, certifications or achievements. Test factual fidelity and exported document readability. Resume tailoring does not submit an application. |
| 4 — mature product | Automatic job applications | Introduce reviewed form preparation first, then opt-in automatic submission for explicitly selected jobs through supported integrations. Preview the recipient, resume version, answers and personal data to be sent; obtain explicit submission authorization with a bounded job scope. Track success, failure and uncertain submission states locally, prevent duplicate applications, and never retry an uncertain submission blindly. Support stopping a batch and returning unsupported flows to the user; do not bypass CAPTCHA or platform restrictions. Discovery adapters remain unable to access personal data. This requires a separate application-submission boundary and an explicit privacy-contract extension before implementation: applying intentionally shares approved data with the employer/application service. |
| 5 — mature product | Periodic background discovery and guarded auto-apply | Optionally install a restricted Windows service and create a per-user scheduled task at a user-selected interval. Discover new jobs while the desktop is closed, deduplicate against durable seen-job history, rank locally and notify only for new matches. The service handles generic provider requests; a per-user agent owns private data and notifications. Later, the agent may create/apply eligible plans only under a narrow, expiring standing policy with caps, prohibited questions, duplicate prevention and uncertain-outcome recovery. Background discovery never implies auto-apply permission. See [decision 0008](architecture/0008-background-discovery-service.md). |

Existing local ranking and writing-assistance plans are expanded by these requirements. The first search adapter, privacy gate, normalization and ranking increments below are prerequisites to priority 1, not competing product features. Complete and evaluate the shortlist before beginning priorities 2–5. Optional AI setup is a prerequisite for AI assistance, not for the core shortlist. Background discovery also requires stable manual search, deduplication and notifications; unattended applications require the interactive application workflow to be safe first.

## Resource and search quality gates

- Measure production installed size, temporary extraction space, cold-start time, idle RAM, and peak import/search RAM separately. Set initial budgets after measuring the baseline and track changes per release. Development build caches are not the shipped application.
- Recorded installer sizes increased from 21.93 to 22.04 MiB across recent additions (about 0.5%); this does not establish exponential growth. The [engine baseline](resource-baseline.md) now records startup, temporary extraction, and idle/import memory; full desktop RAM and installed footprint remain unmeasured. Do not confuse the parser's memory safety ceiling with observed consumption.
- Benchmark Python single-file versus folder-based packaging before changing it; consider parser imports, process startup and health polling. Preserve parser isolation and cancellation. Change architecture only when a measured benefit justifies it.
- Bound job caches/history and deduplicate normalized records. Avoid retaining full HTML/images or duplicate model copies. Keep heavy ML dependencies and downloads optional, reuse compatible models, and expose deletion/storage controls.
- Compare keyword/rule ranking against optional embeddings on realistic synthetic evaluation cases. SQLite FTS5 is a candidate already supported by the development runtime; verify it in the packaged engine before relying on it. Choose the smallest model that passes quality, license, latency, and memory checks. Quantization must be evaluated for both quality and speed.
- Track relevance among the first ten results, source coverage, freshness/closed-listing uncertainty, duplicate rate, response time, provider cost, and resource use. Do not infer quality from model parameter count or advertise unverified freshness.

The revised sequence below preserves increments 1–7 and moves resource measurements and private discovery ahead of optional model setup. Session numbers are delivery estimates, not the project's calendar-day count.

| Session | Increment | Useful completion evidence |
|---|---|---|
| 1 | Windows development prerequisites and first native launch | Tauri window starts/stops its bundled engine; record concrete packaging failures if blocked. |
| 2 | Resume import contract and accessible file picker | PDF/DOCX selection, file size/type rules, cancel and readable errors; synthetic files only. |
| 3 | Local PDF text extraction | Text-based PDF is extracted without network access; scanned input gets honest guidance. |
| 4 | Local DOCX extraction | Paragraphs/tables produce usable text; embedded external content is not fetched. |
| 5 | Background import task lifecycle | Progress, cancellation, timeout, and retry keep navigation responsive. |
| 6 | Extracted-text review | User can inspect/edit the text and decide whether to keep it. |
| 7 | Profile persistence and deletion | Implemented: explicit saved text survives restart; separate draft discard and saved-profile delete. Restart/replacement/deletion tests pass; native profile UI remains unverified. |
| 8 | Production resource baseline | Record installer/installed/temp sizes, startup time, idle/peak RAM; propose budgets and the largest measured optimization. |
| 9 | Native import/profile verification | Synthetic DOCX save/restart/delete flow; clean installer lifecycle check or a concrete blocker. |
| 10 | Public search-criteria contract | Implemented local controlled choices and session review; synthetic validation tests pass. No adapter/network yet; browser/native UI verification pending. |
| 11 | Outbound privacy boundary | Engine validation and deterministic local query construction implemented; 24 search tests pass. Provider endpoint allowlist/redirect controls pending transport. |
| 12 | Search preview and disclosure | Engine-generated query shown with explicit review and stale-result invalidation; earlier real-engine browser flow verified. Preview now identifies saved Tavily configuration and discloses the future fixed search endpoint. New disclosure visual/native interaction checks remain pending. |
| 13 | Provider configuration and secrets | Partial: Tavily vault setup, provider-aware local preview and separate disclosed fixed account-usage connection check implemented, with restricted transport and synthetic captured-request tests. Explicit first search integrated for local development; browser/native check interaction and live provider verification pending. |
| 14 | First search adapter (Tavily candidate) | Isolated bounded adapter implemented: controlled query revalidation/review equality, fixed basic ten-result POST, timeout/cancellation and quota/offline errors. Explicit authenticated confirmation, browser/native dispatch bridge and session text candidates are integrated. |
| 15 | Search privacy verification gate | Adapter-level captured synthetic requests and malformed/private inputs, redirects, malicious text/URLs and cancellation checks pass. Synthetic API confirmation/captured-request and React-rendering checks pass; browser/native interaction and live-provider verification remain pending before public release. |
| 16 | Results normalization and filtering | Partial: canonical links, tracking-key removal, source/time, deduplication and local role/region/work-mode/seniority/skill mention filters implemented (decisions 0014–0015). Missing snippet details remain visible by default. Verified job attributes and cross-source identity remain pending; no result websites/resources are fetched. |
| 17 | Core 30–50-job shortlist and local ranking without a model | Partial: reviewed-resume category suggestions → automatic local query preview, manual fallback, shared-skill ordering and literal resume/title/snippet evidence implemented (decisions 0015–0016). Next: bounded broader fetching toward 30–50 suitable opportunities and ranking/coverage evaluation, with honest shortfalls. Remains the highest-priority product milestone; no model download required. |
| 18 | Local job saving | Save normalized jobs, preserve source/time, bound caches, and handle changing or unavailable listings honestly. |
| 19 | Simple application tracker | Saved/applied/interview stages and private local notes; external applying remains explicit. |
| 20 | Privacy and data controls | Verify deletion of profile, jobs, notes, derived indexes and caches; explain retention and original-file limits. |
| 21 | Search quality review | Evaluate relevance across the 30–50-job shortlist and first ten, filter adherence, duplicates, freshness uncertainty, coverage, latency and provider cost; fix the largest issue before mature-product features. |
| 22 | Guided core setup | Storage/search configuration, skip paths, external-site disclosures and recovery; no model download required. |
| 23 | Core personal alpha hardening and demo | Fresh-user install/run, native lifecycle/accessibility/themes/resource checks, documentation and a synthetic search/save/track demo. |
| 24 | Optional embedding catalog and acquisition | License/source/size review, hardware guidance, compatible-model reuse, explicit download/cancel/recovery and setup later. |
| 25 | Local embeddings and retrieval | Bounded local embeddings, chunk/evidence references and versioned storage; include manual job-text input and deletion. |
| 26 | Semantic matching evaluation | Compare hybrid matching with the no-model baseline; enable only if quality gains justify disk/RAM/latency costs. |
| 27 | Optional generative runtime and model setup | Detect/reuse a local runtime; license-reviewed model choices, measured hardware guidance, acquisition/recovery and skip. |
| 28 | Local inference adapter | Bounded generation/cancellation, load/unload behavior and resource measurements; no hosted fallback. |
| 29 | Structured profile suggestions | Extend the two-path discovery flow with an optional local LLM candidate summary and supported role/skill suggestions, grounded in source references and editable review. Private summaries stay local; only confirmed catalog categories can reach search. Keep the deterministic fallback and do not silently replace saved text. |
| 30 | Evidence-based AI explanations | Ground explanations in job/resume retrieval; evaluate unsupported claims, gaps and uncertainty before enabling. |

## Scope controls

- The import/review/save workflow is implemented; remaining native checks continue alongside discovery. Search quality and a useful no-model core now take priority over generative AI setup.
- OCR, multiple discovery adapters, broad job-board integrations, syncing, mobile apps, and network anonymity services are outside this estimate. AI gap analysis, resume tailoring, automatic applications and periodic background discovery are explicit mature-product backlog items above, also outside this estimate.
- A provider can be replaced if its terms, cost, quality, or privacy behavior do not suit the contract. Do not describe any plan as permanently free.
- Every data-bearing milestone includes failure handling, privacy checks, and deletion semantics. UI work includes glass/opaque rendering, responsive layout, visible focus, and reduced motion.
- Prefer deterministic filters and evidence over opaque fit scores. Do not imply hiring success or fabricate experience.
- Review progress after sessions 7, 15, 23, and 26. If time slips, defer optional AI first; keep the privacy gate, core search quality, and installation checks.
