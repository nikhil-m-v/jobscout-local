# Rough roadmap — next 30 working sessions

Baseline: 2026-09-29. Each row is a small meaningful delivery, roughly one working session. These are estimates, not calendar deadlines; difficult milestones can span several days. Reorder when evidence warrants it, and preserve a working app throughout. No automation or daily reminder is implied.

The aim is a usable personal alpha: import a resume, review a local profile, find opportunities without sending personal career data, and explain matches using local RAG. Optional online search must remain off until its privacy boundary is verified.

| Session | Increment | Useful completion evidence |
|---|---|---|
| 1 | Windows development prerequisites and first native launch | Tauri window starts/stops its bundled engine; record concrete packaging failures if blocked. |
| 2 | Resume import contract and accessible file picker | PDF/DOCX selection, file size/type rules, cancel and readable errors; synthetic files only. |
| 3 | Local PDF text extraction | Text-based PDF is extracted without network access; scanned input gets honest guidance. |
| 4 | Local DOCX extraction | Paragraphs/tables produce usable text; embedded external content is not fetched. |
| 5 | Background import task lifecycle | Progress, cancellation, timeout, and retry keep navigation responsive. |
| 6 | Extracted-text review | User can inspect/edit the text and decide whether to keep it. |
| 7 | Profile persistence and deletion | Reviewed data survives restart; discard/delete removes app-owned imported copies. |
| 8 | Local runtime setup | Detect/reuse Ollama and explain setup later and failure recovery. |
| 9 | Reviewed model catalog | Exact model licenses, sources, size, and measured hardware guidance. |
| 10 | Explicit model acquisition | User starts/cancels download; real progress and interrupted-download recovery. |
| 11 | Local inference adapter | Bounded local generation with cancellation; no hosted fallback. |
| 12 | Structured profile suggestions | Extract skills/experience locally with source references and editable review. |
| 13 | Local embeddings adapter | Embed synthetic resume/job text locally; record model/version. |
| 14 | Local retrieval store | Save/retrieve chunks with document/page references and index versioning. |
| 15 | Manual job-description import | Useful fully local matching input with untrusted-content handling. |
| 16 | First evidence-based match | Retrieve supporting snippets; show fit, gaps, and uncertainty without invented qualifications. |
| 17 | RAG quality review | Synthetic examples expose unsupported claims and poor retrieval; fix the largest issue. |
| 18 | Public search-criteria contract | Controlled role/region/skill choices; no resume context reaches the search adapter. |
| 19 | Outbound privacy boundary | Reject extra fields, identifiers, unsafe URLs, and unconstrained generated queries. |
| 20 | Search preview and disclosure | Show exact outbound criteria/provider and explain IP/account metadata before sending. |
| 21 | Provider secret storage | OS-backed keys, masked inputs, remove/replace behavior, no secret logging. |
| 22 | First search adapter (Tavily candidate) | Explicit search with bounded requests, cancellation, quota errors, and offline handling. |
| 23 | Search privacy verification gate | Captured requests contain no synthetic personal markers; malformed inputs and redirects fail safely. |
| 24 | Results and local saving | Normalize/deduplicate jobs, retain source/time, and avoid loading remote trackers. |
| 25 | Local matching of search results | RAG explanations cite job/resume evidence; inference remains local. |
| 26 | Simple application tracker | Saved/applied/interview stages and private local notes. |
| 27 | Privacy and data controls | Review outbound actions; verify deletion of documents, derived data, indexes, and caches. |
| 28 | Guided setup integration | Model/search skip paths, storage guidance, external-site disclosures, and restart recovery. |
| 29 | Native installer and UX hardening | Clean Windows install/upgrade/uninstall review, keyboard access, both themes, and measured slow-device behavior. |
| 30 | Personal alpha documentation and demo | A fresh user can install/run it; synthetic demo shows the full workflow and known limitations. |

## Scope controls

- A complete import/review workflow is the first user-facing milestone. Resolve native packaging early alongside it.
- OCR, multiple providers, job-board integrations, automatic applications, syncing, mobile apps, and network anonymity services are outside this estimate.
- A provider can be replaced if its terms, cost, quality, or privacy behavior do not suit the contract. Do not describe any plan as permanently free.
- Every data-bearing milestone includes failure handling, privacy checks, and deletion semantics. UI work includes glass/opaque rendering, responsive layout, visible focus, and reduced motion.
- Prefer deterministic filters and evidence over opaque fit scores. Do not imply hiring success or fabricate experience.
- Review progress after sessions 7, 17, and 23. If time slips, reduce scope; keep the privacy gate and installation checks.
