# Project Instructions: Think Big, Act Small

## North star
Build an open-source, local-first Windows AI job-finder that helps people understand their fit for real opportunities and take the next step. Keep the architecture modular so people can fork it, configure it with minimal effort, and replace components without rewriting the product.

## How we work
- Think big about the product, but make small, meaningful, reviewable changes.
- Prefer one coherent improvement per change: a user-visible feature, reliability fix, performance improvement, accessibility improvement, or useful documentation.
- Keep each change narrow enough to understand, review, and build on the next day. Avoid speculative frameworks and premature service splitting.
- Preserve a working application as we grow. Explain the user impact and architectural consequences of meaningful changes.
- Make sensible local decisions and record durable decisions in `docs/architecture/` when they affect future work.

## Experience principles
- The UI is a core part of the product, not a finishing layer. Aim for a distinctive, calm, polished interface with clear hierarchy, thoughtful typography, purposeful color, and consistent spacing.
- Use Dribbble and other high-quality product interfaces as visual inspiration for craft and interaction patterns. Treat references as inspiration, not templates to copy; keep the product's own identity and make the interface practical for job-search workflows.
- Make interactions feel smooth and immediate. Avoid blocking the UI during parsing, indexing, search, or model generation. Use background work, progress feedback, responsive controls, and graceful cancellation where appropriate.
- Protect perceived performance: show useful loading states, preserve scroll and selection, avoid unnecessary rerenders, and keep animations subtle and interruptible.
- Design for keyboard use, accessibility, readable contrast, and Windows desktop conventions alongside visual polish.

## Product and technical direction
- Default to local processing and local storage for resumes and profile data. Clearly disclose any data sent to external search providers such as Tavily.
- Keep model, search, parsing, vector storage, and persistence behind small replaceable interfaces.
- Treat extracted resume details and generated match assessments as suggestions. Let users review profile data and show evidence for match explanations.
- Keep provider credentials out of source control and logs. Provide setup guidance and safe example configuration for forks.
- Favor a modular monolith for the personal application. Introduce workers, hosted services, or distributed infrastructure only when a real workload or product need justifies them.
- Keep Windows personal use straightforward, while documenting clean extension points for other platforms and optional hosted deployments.

## Daily change checklist
Before considering a change complete, ask:
1. Does it move the product toward the job-finder vision in a concrete way?
2. Is the scope small and understandable?
3. Does the interface remain responsive during slow work?
4. Does the visual and interaction quality fit the rest of the app?
5. Are privacy, accessibility, and forkability preserved?
6. Is the change easy for the next contributor to run and continue?

## Collaboration expectations
- Prefer direct, plain-language explanations and focused pull requests or commits.
- Include screenshots or short recordings for substantial UI changes when practical.
- Document setup, configuration, and decisions as the project evolves.
- Do not add dependencies or complexity without a clear user or contributor benefit.


## Installation and first-run experience
- Treat installation and onboarding as part of the product's visual identity and responsiveness requirements. Follow `docs/design/installation.md` as the initial design brief.
- Provide a guided flow for install location, device checks, local AI runtime, model selection and download, API keys, verification, and first use. Keep advanced settings optional.
- Explain application, personal-data, and model storage separately. Validate selected paths and available space before starting downloads.
- Offer license-reviewed open-source models, reuse compatible existing models, and support setup later. Show download size and hardware guidance without promising speed that has not been measured.
- Provide masked API-key fields with show/hide, clear instructions, official provider links, connection checks, and an option to skip. Store secrets in an OS-backed secret store.
- Keep slow setup work in the background with honest progress, cancellation, recovery, and saved progress. A working local experience must remain available when online search is not configured.
- Revisit setup whenever we add a provider, model, dependency, permission, or configuration requirement. Record the default, user guidance, error recovery, privacy effect, and upgrade behavior alongside the feature.
