# JobScout — resume here

Last checkpoint: 2026-09-30. This is project memory for contributors and future assistant sessions, not a store for user information.

## Direction

Build an open-source Windows job finder that keeps personal career information local. Think big, act small: one useful, reviewable improvement per session. The UI matters from the first increment: minimal Apple-inspired glass, responsive layouts, Light/Dark/System appearance, keyboard access, and smooth background work.

The governing promise is in [docs/privacy.md](docs/privacy.md). Resumes, profiles, embeddings, and AI analysis never go to online providers. Generic, reviewed job criteria may be sent when online discovery is implemented. Do not promise network anonymity: IP metadata and provider-account association remain visible.

## Current state

- Public repository: https://github.com/nikhil-m-v/jobscout-local, branch `main`.
- Published foundation: `5e438cf`; published responsive glass UI: `4370c00`.
- React/TypeScript/Vite UI; Tauri 2 Windows shell configured; Python/FastAPI engine; SQLite startup; replaceable Ollama health adapter.
- Browser preview starts the real local engine, uses session authentication, and shows actual engine/storage/runtime status.
- Windows development prerequisites are installed: Rust/Cargo stable MSVC, Visual Studio C++ Desktop workload, and the documented Python desktop extra. Native NSIS installer generation succeeds; installer execution and upgrade behavior remain unverified.
- Overview, Settings, and labeled planned-feature pages exist. Appearance is saved locally through a styled Settings control. Glass has opaque and accessibility fallbacks.
- My profile now selects a local PDF/DOCX up to 10 MiB and shows metadata only. It does not read bytes, extract text, or save a profile. The picker contract is in `docs/architecture/0002-resume-selection.md`.
- No resume parsing, model inference, embeddings, RAG, Tavily search, key storage, or application tracking is implemented yet. The privacy boundary for future search is a documented contract, not an implemented filter.
- The prior privacy increment is commit `882079a`; day 2 adds the first resume-selection slice. Check Git status before publication.

## Evidence and limitations

Frontend type checking/production bundling passed during today's UI work. The foundation engine check passed earlier today. Browser views were inspected in light/dark and compact sizes; no horizontal overflow was observed in the 320-pixel glass preview. These do not establish native Windows performance.

The final privacy copy/layout build also passed. The privacy panel was reached by keyboard and inspected at desktop and 390-pixel widths without horizontal overflow. Current screenshots are linked from the README; `docs/images/privacy-settings.png` shows the disclosure panel.

WebView2 is available. Native compilation and bundled Python sidecar packaging have succeeded, producing an NSIS installer. Installer execution/upgrade behavior, native resume picker behavior, model inference, and GPU performance remain unverified. Ollama was unavailable in the observed earlier preview; the workspace handled that state.

Day 2: frontend build, four selection-contract tests, and the existing engine test passed. Browser preview verified synthetic selection, rejected replacement, navigation retention, and removal. Light/dark picker views were inspected; the 390-pixel light view had no horizontal overflow. See [2026-09-30](docs/progress/2026-09-30.md).

Git metadata writes require the environment's scoped approval path. Approved Git commands successfully fetched existing history, committed, and pushed without force. Do not change Windows ACLs to bypass the sandbox. The GitHub connector can independently verify published files. Fetch and inspect status before changing history; never overwrite unrelated work.

## Start the next session

1. Read `AGENTS.md`, this file, the privacy contract, and [the roadmap](docs/roadmap.md). Check local status and remote history.
2. Continue the import milestone with **local PDF text extraction and an editable review**. The file picker and metadata contract are in place; verify bytes and parser limits independently in the engine. Keep search and model generation out of this slice.
3. Review the generated NSIS installer and verify clean install/uninstall behavior before release packaging work.
4. Use the repository `.venv` if present. `npm run dev` launches the local browser preview. Follow `README.md` to recreate dependencies; do not assume yesterday's preview process is still running.
5. End with the relevant checks, a clean reviewable commit, confirmed publication when authorized, and an updated checkpoint/progress entry. Do not mark planned features complete based on placeholder screens.

Detailed record: [2026-09-30](docs/progress/2026-09-30.md). Approximate next 30 working sessions: [roadmap](docs/roadmap.md). No recurring automation has been scheduled.
