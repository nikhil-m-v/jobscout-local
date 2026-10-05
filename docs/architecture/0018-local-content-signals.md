# Decision 0018 — Conservative local candidate content signals

Date: 2026-10-05. Status: implemented for local development; interactive/live-provider release checks pending.

## Problem and choice

Shared-category counts promote guides, courses and directories alongside job openings. Add a small replaceable pure classifier in the local engine, using only already-returned titles/snippets. No page fetch, model, provider request, profile persistence or dependency is added.

The classifier returns `resource`, `opening` or `unknown` plus at most four exact source phrases (one resource/opening signal per title/snippet). Explicit resource titles without competing opening language are likely resources. Opening-only signals indicate opening language, never verified vacancy status. Competing signals, absent signals and resource snippets alone remain unknown. Generic Careers pages remain unknown. Training benefits and sparse titles must not be rejected merely for lacking hiring language.

## User behavior and contracts

Results hide likely resources by default in both resume and manual flows after local analysis completes. A local checkbox restores them, a count discloses the classification, and expandable per-candidate evidence explains the signals. Unknown content remains eligible; explicit category filters still apply independently. No candidate is deleted from the provider response. Existing cancellation/stale-response handling and provider-order tie behavior are preserved. If local analysis fails, original candidates remain available.

The engine adds a required `content` field to each local assistance match. Frontend validation requires bounded enums, unique source/kind pairs, exact phrases present in the supplied title/snippet and consistent status/evidence. Rebuild and restart engine/frontend together; an older engine response fails closed to the existing retry/manual recovery. No storage migration or new setup requirement. Provider configuration, search cost and outbound privacy remain unchanged.

## Evidence and limits

Four synthetic ten-candidate cases compare unfiltered provider/resume order, content-filtered order and category filters. The evaluation guards labeled relevant retention and top-five non-degradation. New cases cover sparse openings, training benefits, resource-named jobs, mixed language and generic navigation. This is diagnostic evidence, not live quality or representative accuracy.

Literal rules can miss resources and misread titles, employer names or negated opening language. Conflicting evidence deliberately stays unknown; users can restore hidden resources. This does not resolve incompatible skills, broad cloud aliases, role ambiguity, freshness or the ten-candidate coverage ceiling. Next: engine-owned reviewed bounded broader discovery with disclosed requests/cost, cancellation, deduplication, partial failures and honest shortfalls.
