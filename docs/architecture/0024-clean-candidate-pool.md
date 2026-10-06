# 0024 — Milestone 17B: a clean, reversible candidate pool

Date: 2026-10-06

Status: implemented; interactive/native release checks remain in 17D.

## Problem and scope

The reviewed five-source trial returned 49 safe canonical links, including five ATS board URLs, nine same-title Lever links and two SmartRecruiters hosts outside the requested scopes. Link count alone overstates candidate diversity. Milestone 17B identifies these noise classes locally without guessing eligibility or fetching websites. Location/work-mode interpretation is 17C; overall acceptance is 17D.

## Provenance and URL evidence

Each candidate carries an engine-owned `source_index`: null for unrestricted single search, or its originating fixed request index. Provider metadata cannot populate it. Canonical deduplication preserves the first occurrence and its scope. Frontend validation requires bounded provenance consistent with completed requests; old responses fail safely. Rebuild/restart engine and frontend together and prepare fresh previews.

A small pure frontend module recognizes conservative Greenhouse, Lever, Ashby, Workday and SmartRecruiters posting/board paths. Workday postings require a requisition-shaped terminal path. Unrecognized routes, lookalike hosts and query-selected board URLs remain unknown. The UI shows the exact returned path as evidence, not vacancy verification. Collection filtering combines known board paths with existing title signals, even when text analysis is unavailable. Boards remain visible by default; hiding them is reversible. Unknowns remain available.

Scope checks compare each returned host with its originating reviewed source group. Exact named hosts apply except the broad `myworkdayjobs.com` root, which accepts dot-bounded subdomains. Outside-scope links stay available with a warning and expected domains. No new scopes, provider options, endpoints, retry, page/image request or DNS resolution.

## Repeated-role grouping

Known posting paths identify an ATS employer account. Matching full titles within the same account are grouped using Unicode NFKC, case and whitespace normalization. Different titles/locations and tenants remain separate. Unknowns, boards, placeholder titles and generic bare role titles are not grouped. No fuzzy title match, snippet-derived identity, job-ID removal or destructive merge.

Grouping follows existing filters/ranking. The first surviving row represents its group; alternatives retain their own URL, snippet, source warning and resume evidence. Keyboard-accessible native details expand the group; a toggle restores individual rows. Groups follow first surviving appearance; manual link order is restored when grouping is off. Controls reset for a new result. All data stays transient and is cleared with results. No dependency, migration, model/runtime setup or new credential requirement. Existing masked-key setup and recovery apply.

## Evidence and limits

The checked-in synthetic 49-link evaluation detects 44 posting patterns, five board paths, two scope mismatches and one nine-link group: 41 groups retain all 49 links/snippets. Reversibly hiding boards leaves 36 groups containing all 44 posting links. Tests cover unknown/lookalike/query paths, scope origin/domain boundaries, distinct titles/tenants, placeholders, filtering before grouping, lossless alternatives and escaped rendering without navigable resources.

Offline replay of the earlier public pool yields the same counts. That historical response predates provenance; its known nine/ten/ten/ten/ten sequential source blocks were reconstructed for replay only, not newly captured metadata. No live request was sent for 17B. Groups are not verified distinct jobs. Multiple openings can share a title; different URLs/titles/accounts can refer to one opening. Native interaction, installation, visual themes/window sizes and full desktop resources remain unverified. Overall milestone 17 remains partial.
