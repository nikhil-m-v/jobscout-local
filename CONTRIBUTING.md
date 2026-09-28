# Contributing

Follow [AGENTS.md](AGENTS.md): think big, act small. Choose one meaningful improvement, explain the user benefit, and keep the application usable throughout the change.

Start with [README.md](README.md). Check frontend changes with type checking and a production build. Run the engine checks for API, persistence, or provider changes. Native changes also need a Windows desktop build.

Keep provider integrations behind domain interfaces. Use synthetic resume/job fixtures for development and avoid committing personal data, credentials, caches, model weights, or generated binaries.

For UI changes, include a screenshot where practical and review keyboard navigation, readable contrast, reduced motion, narrow windows, and responsiveness during slow work. Describe unavailable or planned features honestly.

New runtime, model, or provider requirements must update the [installation design](docs/design/installation.md) with setup guidance, defaults, privacy effects, recovery, and upgrade behavior.
