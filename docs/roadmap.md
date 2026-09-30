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
| 10 | Public search-criteria contract | Controlled role/region/skill choices; no resume context reaches the search adapter. |
| 11 | Outbound privacy boundary | Reject extra fields, identifiers, unsafe URLs, and unconstrained generated queries; provider endpoint allowlist. |
| 12 | Search preview and disclosure | Show actual outbound criteria/provider and explain IP/account metadata before sending. |
| 13 | Provider configuration and secrets | Select one source; OS-backed keys if required, masked controls, skip/remove behavior, safe connection checks. |
| 14 | First search adapter (Tavily candidate) | Bounded explicit discovery, cancellation, quota/offline handling; keep public release disabled pending the privacy gate. |
| 15 | Search privacy verification gate | Captured synthetic requests contain no personal markers; malformed inputs, redirects and malicious job text fail safely. |
| 16 | Results normalization and filtering | Canonical links, source/time, deduplication, explicit preference filters, and no remote trackers. |
| 17 | Local ranking without a model | Keyword/skill-alias/rule baseline with supporting snippets; useful results without Ollama or model downloads. |
| 18 | Local job saving | Save normalized jobs, preserve source/time, bound caches, and handle changing or unavailable listings honestly. |
| 19 | Simple application tracker | Saved/applied/interview stages and private local notes; external applying remains explicit. |
| 20 | Privacy and data controls | Verify deletion of profile, jobs, notes, derived indexes and caches; explain retention and original-file limits. |
| 21 | Search quality review | Evaluate top-ten relevance, duplicates, freshness uncertainty, coverage, latency and provider cost; fix the largest issue. |
| 22 | Guided core setup | Storage/search configuration, skip paths, external-site disclosures and recovery; no model download required. |
| 23 | Core personal alpha hardening and demo | Fresh-user install/run, native lifecycle/accessibility/themes/resource checks, documentation and a synthetic search/save/track demo. |
| 24 | Optional embedding catalog and acquisition | License/source/size review, hardware guidance, compatible-model reuse, explicit download/cancel/recovery and setup later. |
| 25 | Local embeddings and retrieval | Bounded local embeddings, chunk/evidence references and versioned storage; include manual job-text input and deletion. |
| 26 | Semantic matching evaluation | Compare hybrid matching with the no-model baseline; enable only if quality gains justify disk/RAM/latency costs. |
| 27 | Optional generative runtime and model setup | Detect/reuse a local runtime; license-reviewed model choices, measured hardware guidance, acquisition/recovery and skip. |
| 28 | Local inference adapter | Bounded generation/cancellation, load/unload behavior and resource measurements; no hosted fallback. |
| 29 | Structured profile suggestions | Suggest skills/experience locally with source references and editable review; saved text is not silently replaced. |
| 30 | Evidence-based AI explanations | Ground explanations in job/resume retrieval; evaluate unsupported claims, gaps and uncertainty before enabling. |

## Scope controls

- The import/review/save workflow is implemented; remaining native checks continue alongside discovery. Search quality and a useful no-model core now take priority over generative AI setup.
- OCR, multiple discovery adapters, broad job-board integrations, automatic applications, syncing, mobile apps, and network anonymity services are outside this estimate.
- A provider can be replaced if its terms, cost, quality, or privacy behavior do not suit the contract. Do not describe any plan as permanently free.
- Every data-bearing milestone includes failure handling, privacy checks, and deletion semantics. UI work includes glass/opaque rendering, responsive layout, visible focus, and reduced motion.
- Prefer deterministic filters and evidence over opaque fit scores. Do not imply hiring success or fabricate experience.
- Review progress after sessions 7, 15, 23, and 26. If time slips, defer optional AI first; keep the privacy gate, core search quality, and installation checks.
