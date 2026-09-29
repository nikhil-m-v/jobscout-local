# JobScout Local

Find your next role. Keep your personal story private.

JobScout is an open-source Windows application designed to keep resumes, AI analysis, and career records on your computer. Its defining promise is local intelligence without uploading your personal career data. Built with Tauri 2, React, TypeScript, and a Python/FastAPI local engine.

**Status: early foundation.** The interface, navigation, engine connection, SQLite initialization, Ollama availability check, and local PDF/DOCX file selection are implemented. Text extraction, profile saving, model downloads, RAG matching, online job search, and application tracking are planned. The UI identifies those features clearly.

![JobScout glass interface in light appearance](docs/images/glass-light.png)

Choose Light, Dark, or Follow system from the appearance control at the top of the window. The choice is remembered on this device. The Windows app uses the same interface in a Tauri desktop window; the browser preview is a development convenience.

![JobScout glass interface in dark appearance](docs/images/glass-dark.png)

The My profile page accepts a local PDF or DOCX selection up to 10 MiB and shows only its metadata. It does not read or save document contents yet. Invalid selections have readable errors; cancelling a replacement keeps the previous selection. Selection metadata lasts only while the app is open. The next milestone is local text extraction and an editable review.

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

Our product contract is that resume files, extracted text, profiles, embeddings, match explanations, and application notes stay local. The current picker validates filename, size, and operating-system MIME metadata for immediate feedback; the future engine parser must validate the actual file bytes and resource limits independently. No hosted AI fallback, product analytics, advertising trackers, or automatic uploads of diagnostics are part of the design.

Planned online discovery will send only user-reviewed, generic job criteria through a restricted search adapter. It will not send your resume or identity. Online search is **not implemented yet**. A search provider can still see queries, connection metadata such as an IP address, and the account associated with an API key; JobScout does not currently provide network anonymity. Opening a job website or applying there creates a separate interaction with that site.

See [the privacy contract](docs/privacy.md) for the exact boundary, implementation requirements, and release checks. Privacy statements must describe verified behavior, not imply that planned safeguards already exist.

The engine binds only to `127.0.0.1`, requires a fresh app-session token on every API request, and does not enable cross-origin access. The browser preview uses Vite's server-side proxy for its single health route; the token is not embedded in frontend assets. Tauri requests health through a narrowly scoped Rust command. No resume or search credentials are collected in this release.

## Next milestone

Local PDF text extraction with byte-level validation and an editable review. Start with [the current memory checkpoint](MEMORY.md), [today's progress](docs/progress/2026-09-29.md), and [the roughly 30-session roadmap](docs/roadmap.md). Also see [the architecture decision](docs/architecture/0001-foundation.md), [project instructions](AGENTS.md), and [contribution guidance](CONTRIBUTING.md).

Licensed under MIT. Model weights, provider services, and third-party dependencies retain their own licenses and terms.
