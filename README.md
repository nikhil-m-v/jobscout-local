# JobScout Local

Find your next role. Keep your personal story private.

JobScout is an open-source Windows application designed to keep resumes, AI analysis, and career records on your computer. Its defining promise is local intelligence without uploading your personal career data. Built with Tauri 2, React, TypeScript, and a Python/FastAPI local engine.

**Status: early foundation.** The interface, navigation, engine connection, SQLite initialization, Ollama availability check, and local PDF/DOCX file selection are implemented. Local PDF/DOCX extraction and session-only editable review are implemented. Reviewed profile text can be saved and deleted locally. Model downloads, RAG matching, online job search, and application tracking are planned. The UI identifies those features clearly.

![JobScout glass interface in light appearance](docs/images/glass-light.png)

Choose Light, Dark, or Follow system from the appearance control in Settings. The choice is remembered on this device. The Windows app uses the same interface in a Tauri desktop window; the browser preview is a development convenience.

Settings also offers optional Tavily key setup: masked paste, Show/Hide, explicit save/replace, local status check, remove, and setup later. Keys use Windows Credential Manager, separately for each workspace, and never go into the local database. Saving/checking local key status makes no provider request. A separate Review connection check shows the exact HTTPS account usage endpoint and data sent; Send connection check uses the saved key and sends no resume, profile or job criteria. Stop waiting ignores late results but cannot recall a sent request. Key acceptance does not guarantee available search credits or enable online search. Discover now supports a separate explicit reviewed search; live-provider and interactive release checks remain pending. Official setup links open external websites. If the vault is unavailable or the platform is unsupported, continue with local features; there is no plaintext fallback. Saved keys are retained after uninstall; remove them in Settings first or through Windows Credential Manager afterward. See [the credential contract](docs/architecture/0009-search-provider-secrets.md) and [connection-check contract](docs/architecture/0010-provider-connection-check.md).

![Local key setup before the connection-check increment](docs/images/provider-setup-light.jpg)

![JobScout glass interface in dark appearance](docs/images/glass-dark.png)

The My profile page reads local text-based PDFs (up to 10 pages) and Word DOCX documents up to 10 MiB. Extraction runs in a bounded, cancellable local worker. Review and edit the text before marking it reviewed for this session. Importing and editing do not save automatically. Mark text reviewed, then explicitly save it to keep it after restart. Closing the app clears unsaved drafts. Word body paragraphs and tables are supported; headers, footers, images, and embedded documents are omitted. Scanned PDFs need OCR, which is not implemented. Linked resources are never fetched.

![Resume picker in light appearance](docs/images/resume-picker-light.png)

The interface uses shared glass materials for navigation, panels, and controls, with responsive layouts and opaque accessibility fallbacks. See [the glass design rules](docs/design/glass.md). This is a Windows-compatible CSS treatment inspired by Liquid Glass; native Windows rendering and performance still need release checks.

## Run the foundation

Development prerequisites: Node.js 22.12+ (Node 24 recommended) and Python 3.11+. End-user packaging will bundle the engine; developers use a virtual environment.

Windows PowerShell, from the repository root:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
npm ci
npm run dev
```

If Python is installed under another name, use that executable to create `.venv`. An existing environment can be selected with `JOBSCOUT_PYTHON`. The Node scripts do not auto-load `.env` files; `.env.example` documents shell overrides.

Open [the development preview](http://127.0.0.1:1420). This starts both the real engine and the React interface. Press Ctrl+C to stop them. The engine uses an available loopback port and a random session credential. Preview database files are stored in `.local/`, which is ignored by Git.

Ollama is optional for this milestone. When it is absent, the workspace continues running and Settings shows the actual unavailable status. No model downloads or search-provider requests run automatically.

## Run as a Windows desktop app

Install the official [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/): Rust with the MSVC toolchain, Microsoft C++ Build Tools, and WebView2 where needed. Then:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[desktop]"
npm run desktop:dev
```

This packages the engine as a sidecar, starts Vite, and opens the Tauri window. Tauri owns the engine process and shuts it down when the application exits. Native app data goes in the OS application-data folder for `app.jobscout.local`.

Managed desktop development uses the ignored `work/desktop-dev` Cargo cache, separate from direct Cargo checks and release packaging. The first run rebuilds this cache; later runs reuse it. An explicit `CARGO_TARGET_DIR` override is respected.

If Tauri's build helper reports `Access is denied` while replacing `jobscout-engine.exe`, a running sidecar may be locking that build directory. Close the associated JobScout app and its development command normally before retrying. Use `npm run desktop:dev` from the repository root to select the managed development cache. Avoid running multiple desktop builds against the same cache. If an old elevated/orphaned sidecar cannot be identified safely, restart Windows; do not change filesystem permissions or stop unrelated Python processes. A custom `CARGO_TARGET_DIR` must also be free of running executables.

```powershell
npm run desktop:build
```

The build creates a Windows NSIS installer under `apps/desktop/src-tauri/target/release/bundle/`. Native Windows builds are an additional check: the browser preview alone does not verify the desktop installer. The guided installer/onboarding design is in [installation.md](docs/design/installation.md); model selection, API-key setup, custom model storage, and download recovery remain future work. The initial installer is configured for the current Windows user.

The foundation was checked in the browser with the real engine. A native Windows build and NSIS installer generation have been verified. Running the installer and reviewing clean install, upgrade, and uninstall behavior remain release checks.

## Structure

```text
apps/
  desktop/
    src/                 React interface, health hook, transport boundary
    src-tauri/           Windows shell and engine process lifecycle
  engine/
    src/jobscout_engine/
      domain/            Provider-independent models and interfaces
      adapters/          Ollama availability adapter
      app.py             Authenticated local API
      storage.py         SQLite initialization and health
    tests/               Session authentication and storage startup checks
scripts/                 Preview and sidecar packaging commands
docs/
  architecture/          Technical boundaries and decisions
  design/                Product flows
```

Future parsing, discovery, matching, and tracking modules belong in the engine. Their external providers should implement domain interfaces. Keep UI components free of provider-specific calls.

## Check a change

```powershell
npm run typecheck
npm run build
npm run test:selection
.\.venv\Scripts\python.exe -m pytest
```

Review Overview, My profile, and Settings with the engine connected, disconnected, and without Ollama. Check navigation by keyboard, a narrow window, and reduced-motion settings. If pytest cannot use the system temp directory in a restricted environment, run it with `-p no:cacheprovider --basetemp=.local/pytest` instead. For native changes, also run `npm run desktop:build` on a prepared Windows machine.

## Privacy and local connections

Our product contract is that resume files, extracted text, profiles, embeddings, match explanations, and application notes stay local. The current picker validates filename, size, and operating-system MIME metadata for immediate feedback; the engine independently validates file structure and resource limits. No hosted AI fallback, product analytics, advertising trackers, or automatic uploads of diagnostics are part of the design.

Explicit online discovery is implemented for local development through a restricted search adapter using only reviewed generic job criteria. Resume/profile data stays local. Interactive release checks and a deliberate live-provider search remain pending. A search provider can still see queries, connection metadata such as an IP address, and the account associated with an API key; JobScout does not currently provide network anonymity. Opening a job website or applying there creates a separate interaction with that site.

See [the privacy contract](docs/privacy.md) for the exact boundary, implementation requirements, and release checks. Privacy statements must describe verified behavior, not imply that planned safeguards already exist.

The engine binds only to `127.0.0.1`, requires a fresh app-session token on every API request, and does not enable cross-origin access. The browser preview uses narrowly scoped Vite proxy routes; the token is not embedded in frontend assets. Tauri uses fixed Rust commands to reach the engine. Resume bytes go only to this authenticated local engine; optional search credentials use Windows Credential Manager with no plaintext fallback.

## Next milestone

The first [production engine resource baseline](docs/resource-baseline.md) includes a reproducible Windows benchmark, measured startup/import memory, and provisional regression thresholds. Full desktop and installed measurements remain outstanding.

Measure production storage/startup/RAM, close remaining native checks, then implement private job discovery. The core search workflow will not require a model download; semantic matching and a local generative assistant are optional later enhancements. Start with [the current memory checkpoint](MEMORY.md), [latest progress](docs/progress/2026-09-30.md), and [the roughly 30-session roadmap](docs/roadmap.md). Also see [the architecture decision](docs/architecture/0001-foundation.md), [project instructions](AGENTS.md), and [contribution guidance](CONTRIBUTING.md).

Licensed under MIT. Model weights, provider services, and third-party dependencies retain their own licenses and terms.

## Saved profile data

My profile keeps one explicitly saved text record in local SQLite storage. Saving replaces the previous saved text. Review saved text copies it into an editable draft; edits remain unsaved until reviewed and saved again. Discarding a draft or removing the selected document leaves saved text intact. Delete saved profile removes that record and clears the current import and draft, while keeping the original file. Storage is not encrypted, and deletion is not secure disk erasure or removal of external backups. Installer data-retention behavior remains unverified. See [the storage decision](docs/architecture/0003-reviewed-profile-storage.md).

![Saved profile with synthetic data](docs/images/saved-profile-dark.jpg)

## Try the first explicit search

Save your optional Tavily key in Settings, then return to Find jobs. Choose/review a local resume or select Search without a resume. On Job options, choose public criteria and select Find jobs to prepare the local query. Read the exact query/provider/data disclosure on the query face, then select Find jobs there to confirm and send one basic request. It may consume credits and returns up to ten text candidates. A saved key does not guarantee accepted authentication or available credits. No resume/profile data is sent.

Each retry requires explicit confirmation again. Stop waiting discards late replies but cannot undo a sent request. Editing criteria or opening Settings clears the preview/results. Results are session-only web search candidates, not verified vacancies or ranked matches. Known tracking parameters and duplicate links are removed locally. Results show source domains, retrieval time (not listing date), and duplicate-link counts; different links may still describe the same vacancy. URLs are selectable text; the app does not open result websites or load their images. No automatic or background discovery. See [the normalization decision](docs/architecture/0014-candidate-link-normalization.md).

Synthetic API/privacy/rendering tests and Windows packaging pass. Browser/native interaction and a deliberate live-provider search remain unverified. See [the implementation contract](docs/architecture/0012-explicit-search-flow.md).

Tavily currently supplies web discovery through its direct HTTP API; JobScout uses no LangChain integration or hosted model for searching. The search-provider interface is replaceable. Local matching and optional future models do not depend on Tavily. A live usage-only connection check now passes after supporting nullable key limits; a real search remains a separate deliberate trial.
