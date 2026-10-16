# 0038 — Optional guided core setup

Date: 2026-10-17. Status: implemented locally as milestone 22A, following the owner's request to return to feature work. Milestone 21's human quality gates remain open under the [delivery amendment](0037-finite-search-quality-delivery.md#delivery-amendment--2026-10-17). This does not declare milestone 22 complete or release readiness.

## Small first slice

An optional guide opens from the resume landing screen or Settings. Three screens explain the local workspace/storage contract, optional online search and first use. Back, Continue and Finish later preserve access to discovery. This first slice uses the existing data location; folder selection/migration, disk/device checks and installer changes remain future work. No model/runtime acquisition is introduced.

The guide reuses existing health and provider settings. Provider key controls mount only after an explicit Set up Tavily action and close on leaving/reopening the guide or changing steps. Opening setup invalidates any old query preview/review/search, as entering Settings already does. Resuming a step does not open key controls or send a check/search. The existing masked-key/vault/review-send/external-site boundaries apply unchanged. Health describes local connection/storage only; guide completion is never provider readiness, search consent or proof of useful/current vacancies.

## Progress, failure and upgrade

Webview/browser local storage retains only one fixed step identifier under `jobscout.setup-step.v1`. It contains no career content, credentials, query, key/check result, consent or acceptance state. Missing/malformed progress starts at Your workspace. If storage is blocked, navigation still works for the current workspace session and the guide says it cannot remember progress for next time. Provider drafts are not stored in this marker.

Existing users keep the discovery landing page; upgrades do not force a new wizard or change the database/location. The guide can be reopened and traversed in either direction. Reviewed career-data deletion retains this display/navigation marker alongside appearance; it grants no permission and includes no private record. Uninstall retention follows existing webview/user-data behavior. No engine/API/schema/dependency/version change is required; an existing installer does not contain this frontend work until repackaged. Data-control blocking also makes setup inert; deletion remounts the existing workspace and clears transient drafts.

## Finite exit and verification

22A exits after: optional entry/reopening, three readable steps, Back/Continue/Finish later, safe step-only persistence/session fallback, explicitly opened existing key setup, truthful local readiness and focused frontend/build checks. Broader folder/device/installer work belongs to later 22 slices; installed/accessibility/OS/resource/CI checks remain owner 23. Browser synthetic evidence is not installed acceptance.

Five new tests cover restart/invalid and blocked storage, privacy/storage limits, provider controls closed by default and connected/storage-failure/offline readiness. All 146 frontend tests and 17 report/audit tests pass; production frontend typecheck/build passes. Synthetic browser evidence covers optional entry, explicit key-panel expansion using disposable mocked state, Finish later, reload/resume with the panel closed, skipping provider setup, first-use guidance and keyboard Back. Compact viewport inspection shows no horizontal overflow. Dark-theme screenshot is ignored/local. Full OS accessibility, light-theme visual inspection, engine/package/native/installed/resource/CI acceptance is not claimed. No new real provider/page/vault/model/private-profile operation or spending was performed.
