# Contributing

Follow [AGENTS.md](AGENTS.md): think big, act small. Choose one meaningful improvement, explain the user benefit, and keep the application usable throughout the change.

Start with [README.md](README.md). Check frontend changes with type checking and a production build. Run the engine checks for API, persistence, or provider changes. Native changes also need a Windows desktop build.

Keep provider integrations behind domain interfaces. Use synthetic resume/job fixtures for development and avoid committing personal data, credentials, caches, model weights, or generated binaries.

Provider setup checks: run `npm run test:provider` and the engine suite. On Windows, `test_providers.py` writes only isolated synthetic Credential Manager entries and removes them afterward. Vault access may need a scoped execution permission in sandboxed environments; do not replace the OS store with plaintext to make tests pass. Browser preview and native workspaces have separate vault entries. Never use a real provider key for a regression fixture.

Connection checks: run `npm run test:connection`. Engine connection tests use captured HTTPX mock transports, never live provider calls. Keep endpoint/TLS/proxy/redirect/byte/time/header protections and explicit confirmation intact. Local key-status tests must never perform an account check. Any live check requires a deliberate review/send action, and does not establish the search privacy release gate.

For UI changes, include a screenshot where practical and review keyboard navigation, readable contrast, reduced motion, narrow windows, and responsiveness during slow work. Describe unavailable or planned features honestly.

New runtime, model, or provider requirements must update the [installation design](docs/design/installation.md) with setup guidance, defaults, privacy effects, recovery, and upgrade behavior.
