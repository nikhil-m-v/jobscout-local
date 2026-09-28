# JobScout Local

A personal Windows workspace for a more thoughtful job search. Built with Tauri 2, React, TypeScript, and a Python/FastAPI local engine.

**Status: foundation release.** The interface, navigation, engine connection, SQLite initialization, and Ollama availability check are implemented. Resume import, model downloads, RAG matching, online job search, and application tracking are planned. The UI identifies those features clearly.

![JobScout glass interface in light appearance](docs/images/glass-light.png)

Choose Light, Dark, or Follow system from the appearance control at the top of the window. The choice is remembered on this device. The Windows app uses the same interface in a Tauri desktop window; the browser preview is a development convenience.

![JobScout glass interface in dark appearance](docs/images/glass-dark.png)

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

The foundation was checked in the browser with the real engine. Native compilation and installer execution are unverified; the implementation machine has WebView2 but lacks Rust and the Microsoft C++ build tools.

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
.\.venv\Scripts\python.exe -m pytest
```

Review Overview and Settings with the engine connected, disconnected, and without Ollama. Check navigation by keyboard, a narrow window, and reduced-motion settings. For native changes, also run `npm run desktop:build` on a prepared Windows machine.

## Privacy and local connections

The engine binds only to `127.0.0.1`, requires a fresh app-session token on every API request, and does not enable cross-origin access. The browser preview uses Vite's server-side proxy for its single health route; the token is not embedded in frontend assets. Tauri requests health through a narrowly scoped Rust command. No resume or search credentials are collected in this release.

## Next milestone

PDF/DOCX import, local text extraction, and a reviewable profile. See [the architecture decision](docs/architecture/0001-foundation.md), [project instructions](AGENTS.md), and [contribution guidance](CONTRIBUTING.md).

Licensed under MIT. Model weights, provider services, and third-party dependencies retain their own licenses and terms.
