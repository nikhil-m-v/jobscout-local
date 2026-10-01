# Installation and first-run design

Status: initial product design; this document describes the planned experience, not an implemented installer.

## Goal and scope

Help a person reach their first useful resume analysis without a terminal or developer knowledge. Use two connected stages: the Windows installer handles the app location and shortcuts; the app's first-run wizard handles models, credentials, and personal settings under the user's own account. Both stages share the same visual identity. Keep API keys out of elevated installer processes.

## Visual direction

A calm, spacious wizard with a compact step list, one main task per screen, and persistent Back / Continue actions. Use clear typography, restrained color, and subtle transitions. Take inspiration from polished Dribbble onboarding examples while keeping Windows folder pickers, keyboard navigation, screen-reader labels, visible focus, and reduced-motion support. Do not hide essential instructions in hover-only tooltips.

```text
 JobScout                                     Step 3 of 6
 --------------------------------------------------------
 Device checked       Choose your local AI
 Local AI             Your resume is processed on this PC.
 Job search
 Ready                [ Lightweight ]  [ Balanced ]
                      [ Use an existing model ]
                      Download size | Memory guidance
                      License | Storage folder

                      Back      Set up later      Continue
```

## Screen flow

| Stage | Screen | Main controls and guidance | Completion |
|---|---|---|---|
| Installer | Welcome | Brief product explanation, local processing, optional internet search, project and license links. | Continue |
| Installer | Install location | Editable application folder, Browse, required and available space; shortcuts as optional choices. Default to an appropriate per-user application folder. | Writable location accepted |
| Installer | Install app | Real progress, readable status, cancel and recovery. Identify missing prerequisites and explain why each is needed. | Launch JobScout |
| First run | Device and storage | Check supported Windows version, runtime compatibility, RAM, detected GPU/VRAM, disk space, and connectivity. Show separate personal-data and model locations. | Continue or fix a blocking issue |
| First run | Local AI | Detect an existing runtime; offer Connect, Get runtime, or Set up later. After detection, offer compatible model cards or reuse installed models. | Model choice saved |
| First run | Job search | Optional provider cards, masked API-key input, Show/Hide, Open provider dashboard, How to get a key, Check connection, and Skip for now. | Provider saved or skipped |
| First run | Download and verify | Download chat and embedding models, display bytes, progress and speed when available, then verify loading and a short local response. | Ready or recoverable issue |
| First run | Ready | Summarize local AI, search availability, and storage. Primary action: Add my resume. Offer a synthetic sample resume. | First useful action |

These are proposed screens, not a fixed count. Combine steps only when doing so keeps each screen understandable.

## Paths and existing installations

Separate application binaries, personal data, and large model files. Show the current location for each rather than suggesting that changing the app folder automatically moves models. Use native folder pickers, check write access and free space, and explain inaccessible or removable drives in plain language.

Prefer reusing an existing compatible Ollama installation. Treat its model storage as shared with other apps: detect and display the actual location, and do not silently change it. If JobScout later manages its own runtime process, configure its model folder for that process before downloading. Moving existing models needs a separate guided operation with space checks and rollback. Ollama documents its Windows model-location setting and restart requirements in its [Windows guide](https://docs.ollama.com/windows).

## Model selection

Each model card displays the exact model/version, license link, download size, recommended memory guidance, supported languages, and a plain explanation of the quality/speed tradeoff. Suggested groups are Lightweight and Balanced; the final default depends on measured device compatibility. CPU use must remain possible when supported, with an honest notice that analysis may take longer.

Maintain a versioned, reviewed model catalog. Verify licenses before labeling a model open source; distinguish open weights when its license does not meet the project's open-source policy. Do not promise unlimited redistribution. Provide separate chat and embedding selections, with a sensible embedding default and an explanation: "This smaller model helps find relevant parts of your resume and job descriptions."

Allow reuse of installed models and setup later. Show total disk requirements before download, including temporary files and runtime requirements. Ask before acquiring a new runtime or model and make its source and license visible. Avoid fixed model sizes or hardcoded hardware promises in help text.

## API-key guidance

Only show credential fields for enabled providers. Local models do not need a hosted-model API key. Start with Tavily for online job discovery; future providers use the same reusable setup panel.

Example helper text: "Tavily helps JobScout find jobs online using generic criteria you review. Your resume and personal details stay on this computer. Create or sign in to your account, find API keys in your dashboard, and paste a key here. You can add this later in Settings. Search requests may use your provider credits."

Link to the official [Tavily dashboard](https://app.tavily.com) and [API-key guide](https://help.tavily.com/articles/9170796666-how-can-i-create-an-api-key). Explain which information leaves the PC: only reviewed, generic role/skill categories and an optional broad search region; resume files and all personal career data must stay local. Explain that the provider still sees connection metadata and API-account association, so this is not a guarantee of network anonymity. Follow [the privacy contract](../privacy.md). Show the provider's current usage guidance rather than promising a permanent free allowance.

Keep keys masked; support paste and explicit Show/Hide. Save them in Windows Credential Manager or an equivalent OS-backed secret store, with only a secret reference in ordinary settings. A user-triggered connection check uses a minimal request, never resume data, and explains whether it may consume credits. Distinguish invalid key, exhausted quota, offline connection, and provider failure. Do not display or log the key in errors or diagnostics.

Current increment: the optional Settings panel implements Tavily masked entry, explicit vault save/replace/remove, local status and setup later. Local key status is not a provider connection check. A separate Review connection check exposes the fixed HTTPS account-usage endpoint, credential/network disclosure and billing/limit caveat before Send connection check. It sends no criteria/profile/query, returns only transient acceptance/errors, and makes no search request. Stop waiting cannot recall a request already sent; retries are explicit and no startup/upgrade check is automatic. Invalid key, rate limit, quota limit, offline/timeout and unsupported response have fixed recovery messages. Online discovery remains unavailable. Windows-only storage fails closed without a plaintext fallback; native and development-preview workspaces use separate entries. Upgrades retaining the data directory retain its reference; moving data or cross-platform secret migration needs a later guided flow. Uninstall currently retains credentials independently of database deletion, so users should remove the key in Settings before uninstall or manage its JobScout vault entry afterward. Packaged-vault/installer retention and browser/native connection-check interaction remain pending.

## Download and verification behavior

Run runtime checks, downloads, extraction, and model warm-up outside the UI thread. Present each operation separately: Getting ready, Downloading, Verifying, Loading, Ready. Use actual provider progress; when total size or ETA is unknown, say so rather than inventing a percentage.

Allow cancellation and retry without discarding unrelated settings. Offer pause/resume only when the runtime adapter supports them. For the first version, cancel and retry are acceptable. Save setup checkpoints so reopening resumes from the last completed step. Define ownership of partial downloads before cleanup; preserve shared runtime resources.

Verification includes credential retrieval, writable storage, runtime connectivity, model presence, a short local generation, and an embedding call. An online-provider check is optional. Completion must describe capabilities accurately: "Local AI ready; online job search not configured" is a valid result. In that mode, permit resume analysis, saved jobs, and manual job-description import.

## Errors and recovery

| Issue | User-facing message | Useful action |
|---|---|---|
| Not enough disk space | This drive needs more space for the selected model. | Choose another drive or a smaller model |
| Folder unavailable | JobScout cannot save files in this folder. | Choose a different folder |
| Runtime missing | Local AI needs a compatible runtime to run the model. | Get runtime, connect an existing one, or do this later |
| Download interrupted | The download did not finish. Your setup choices are saved. | Retry or return to model choice |
| Model cannot load | This model could not start on your PC. | Choose a smaller model or view safe diagnostics |
| Invalid key | The provider did not accept this key. | Replace the key or open the official key guide |
| Credits exhausted | Online search is unavailable until your provider allowance is restored. | Open provider usage or continue locally |

## Modularity and future requirements

Keep installer, setup screens, and setup services separate. Define small services for device checks, path checks, runtime adapters, model catalog/downloads, provider configuration, secret storage, and setup checkpoints. UI components display typed status and actions; they must not contain provider-specific download logic.

Each new dependency or provider must specify required/optional status, detection rules, setup fields, official guidance links, outbound data, secret handling, recovery actions, and upgrade behavior. Reopen only the affected setup section when a requirement changes. Make the wizard available through Settings so users can change models or providers later.

A mature release may offer optional background discovery following [architecture decision 0008](../architecture/0008-background-discovery-service.md). Keep it disabled by default. Its setup must name and explain the Windows service, per-user scheduled task, provider-credit/network use while the app is closed, interval, power/network conditions, notifications, pause control, next run and uninstall behavior. Machine-service registration may elevate, but user secrets, profile data and scheduled-task configuration stay in the user's context. Enabling discovery must not enable automatic applications; unattended applications require a separate standing-policy flow after the interactive workflow and privacy extension exist.

On upgrades, preserve user data and secrets, migrate settings with a recovery path, and disclose new required downloads. Uninstall should explain retained personal data and app-owned models, with a deliberate optional cleanup flow. Do not remove shared Ollama installations or shared models as part of JobScout removal.

## Small delivery steps

1. Build the wizard shell with accessible navigation and a working install-location prototype.
2. Add device/storage checks with readable results and failure states.
3. Add runtime detection and the reviewed model picker.
4. Add cancellable downloads, persisted progress, and local verification.
5. Add the Tavily credentials panel and skip path.
6. Add the Ready screen and handoff to resume import.

For each step, review keyboard use, visual consistency, honest status messages, and responsiveness during slow work. Set measured UI performance targets once the first runnable wizard exists; distinguish interface responsiveness from model inference speed.

## Privacy during first run

Lead with the local-data promise. Explain offline resume analysis and manual job-description import, then offer online discovery as an optional separate step. Show the exact outbound criteria before the first search and after changes. Do not generate provider queries from resume text. Provider connection checks use fixed non-personal requests. Runtime/model downloads and external provider links still create internet connections; explain that these services can observe connection metadata. Do not present a setup checkmark as proof of anonymity. Resume import and matching must remain usable with online discovery skipped once those local features are implemented.
