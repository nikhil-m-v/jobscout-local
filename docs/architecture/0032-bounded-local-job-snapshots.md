# 0032 — Bounded local job snapshots

Date: 2026-10-12. Status: implemented milestone 18.

After [17D core closure](0031-core-acceptance-and-deferred-release-gates.md), a user can explicitly save any selected returned candidate, including a repeated-role alternative, and find it in Saved jobs after returning or restarting. Saving does not certify a vacancy, suitability, eligibility, freshness or distinct opportunity. No page is fetched or refreshed.

## Small persistence contract

Use the existing local SQLite database and `Database` interface. Add `saved_jobs` and schema marker 2 without replacing profile records or schema marker 1. Initialization is transactional and repeatable; synthetic version-1 upgrade preserves the profile. Older code leaves the additive table alone, but cannot manage saved jobs. Genuine installed upgrade remains milestone 23 evidence.

Each first-save snapshot retains title (512 characters), safe canonical HTTPS URL (2,048), snippet (16,384), provider (`tavily`), nullable originating source index (0–4), UTC retrieval time, local UUID and UTC save time. Source indices retain the fixed plan-v2 order: Greenhouse, Lever, Ashby, Workday, SmartRecruiters. Any future source-plan change must preserve or migrate this historical interpretation before changing the Saved jobs renderer. Host/domain scope mismatch remains reviewable. Saving alone does not prove that the input came from a live provider.

Project only these fields. Do not persist the query, public preferences, resume, private profile, local match evidence, fit assessments, rendered HTML or full page content. Adapters still receive generic public criteria only and cannot read saved jobs. Local saved-job operations never access the provider, vault or model. No network, dependency, download or hosted fallback is added.

Bound each save body to 120,000 bytes and total retained records to 200. Enforce the count and insert under `BEGIN IMMEDIATE` across SQLite connections; never silently evict an older candidate. Same canonical URL returns the original record and timestamps, even at capacity. A changed title/snippet or retrieval time cannot overwrite a first copy; remove and save again deliberately if needed. Different URLs remain separate regardless of repeated-role grouping. These are logical record/content bounds, not a measured on-disk footprint budget.

## Local boundary and recovery

Authenticated fixed routes: `GET /api/v1/jobs`, confirmed bounded `PUT /api/v1/jobs`, and idempotent `DELETE /api/v1/jobs/{uuid}`. Reject duplicate JSON keys, extra fields, invalid text/URLs/provenance/timestamps, malformed confirmation and unsafe identifiers without echoing input. Responses use `Cache-Control: no-store` and fixed errors. Work runs through the existing thread pool. Native commands and the restrictive browser development proxy expose only these local routes.

The frontend validates saved records before rendering and escapes all text. Save controls stay disabled before loading, while busy, when disconnected or after uncertain writes. Retain last known items until acknowledgement; never optimistically remove. An uncertain response requires a local reload before another mutation; reconnection during a mutation queues a read afterward and never repeats the write. Removal asks for an inline choice: keyboard focus starts on Keep candidate, cancellation restores the original control, and confirmed deletion focuses the Saved jobs heading. Navigation to Saved jobs preserves active discovery; Settings retains its existing search invalidation behavior.

## Retention and setup

Saving is optional; search results remain transient until the user selects Save candidate. No new configuration is required. Native records use the existing per-user app-data location; development previews use ignored local or disposable temporary storage. No browser local-storage career records are introduced. Clearing results, replacing/deleting the profile and removing the provider key do not delete saved jobs. Uninstall retains local app data under the existing installation policy; remove each saved item before uninstalling when desired. Broader deletion controls belong to 20.

Confirmed removal deletes the owned SQLite record with `secure_delete=ON` and DELETE journal mode. Synthetic tests check absence after restart and removal of distinctive snapshot bytes from app-owned files. Do not promise encryption, secure disk erasure, removal from backups, or deletion of an employer website. Display retrieval/save times as snapshot history, not listing dates; listings may change or close.

## Evidence and next step

See [dated progress](../progress/2026-10-12.md) for suites, package and synthetic browser evidence. Engine restart/delete/upgrade/concurrent-limit/rollback and no-external-service tests, frontend projection/transport/validation/uncertain-write/reconnection and escaped-rendering checks cover this contract. Browser save/alternative/reload/clear/keyboard-removal/compact Light/Dark checks use disposable synthetic data. They do not establish native or installed job-saving interaction, genuine installed upgrade or production resource measurements; these remain owner 23.

Next: 19 — simple application stages and private local notes for saved records, one coherent increment with restart/deletion evidence. No application submission is implied.
