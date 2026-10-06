# 0023 — Preserve valid candidates when a provider returns unsupported links

Date: 2026-10-06

Status: implemented; explicitly reviewed full live source comparison completed.

## Evidence and decision

The first reviewed source comparison stopped after its first request with `provider_invalid_response`. The subsequent bounded one-request Greenhouse diagnostic received HTTP 200, identity-encoded JSON, 11,660 bytes and ten results. Nine candidates passed existing validation; one failed URL validation. The rejected URL was not retained, so its exact failure cause is unknown. Offline inspection of the nine retained public candidates found nine Greenhouse domains, two opening-language signals and seven unknown content statuses. These are text signals, not verified vacancies or evidence of full five-source coverage.

Keep strict public HTTPS destination validation unchanged. Discard an individual candidate only when its URL fails that validator; never repair, expose, resolve or fetch the rejected destination. Validate bounded text and credential echoes before discarding or deduplicating. Invalid response envelopes, oversized batches/bodies, malformed text, duplicate JSON keys and credential echoes still fail the entire request and stop subsequent dispatch without retry.

## Contract and experience

Every result includes separate nonnegative `discarded_results` and `duplicates_removed` counts. Broader discovery aggregates both, including cross-response duplicates. Accepted candidates plus duplicates plus discarded results cannot exceed ten per completed request, or fifty for the full run. The frontend enforces that accounting independently and reports unsupported-link discards separately from duplicate removal.

A structurally valid response containing only rejected links completes with no usable candidates and an honest discard count. Completion counts provider responses, not suitable opportunities. Remaining fixed sources may run only within the already-reviewed five-request/time limits. Transport/provider failures retain their existing stop behavior. Rebuild frontend and engine together; old result contracts require a fresh paired app session and new preview.

No dependencies, storage migration, credentials, provider options, new network endpoint, automatic retry or setup requirement. Existing OS-vault setup and manual/single-search choices apply. Results and counts remain transient, with no durable search history. Safe mocked mixed/all-discard batches, credential echoes, strict accounting and escaped UI disclosure have regression coverage. Full live coverage, freshness and native interaction remain unverified.

## Authorized comparison after the fix

The user separately authorized a fresh maximum-five-request comparison of the same generic query and exact source scopes. All five responses completed in 15.781 seconds: fifty raw results, forty-nine unique accepted links, zero canonical duplicates and one discarded URL. No retries, result-page fetches or personal input. Inspection of returned URLs found forty-four individual-posting shapes and five board shapes (three Ashby employer roots and two SmartRecruiters careers roots). Shapes do not verify job identity, freshness or suitability. Nine Lever results have the same Latin America role title but different IDs; URL deduplication cannot establish whether they are separate opportunities. Two SmartRecruiters results use `careers.smartrecruiters.com`, outside the exact requested hosts. Provider restriction adherence is therefore imperfect; JobScout did not send those additional hosts as scopes or contact them.

Local analysis of title/snippet text finds thirty-two software-engineer title-category mentions, fourteen India mentions, twenty-seven remote mentions and twenty literal Python-plus-SQL overlaps with a synthetic local reference. Only two candidates combine all four signals. Mentions can refer to benefits, other offices or related roles; unknown evidence remains unknown. The content classifier labels eleven opening-language and thirty-eight unknown, with no collection labels despite the five board URL shapes. This identifies the next quality work: source/board URL evidence, repeated-role grouping and source-linked location/work-mode interpretation. Milestone 17 remains partial.
