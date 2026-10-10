# 0029 — Bounded ATS title evidence

Date: 2026-10-11. Status: implemented local quality correction during 17D; overall acceptance remains partial.

The [approved 2026-10-10 trial](../17d-live-results-2026-10-10.md) exposed three specific returned-title gaps. Correct those forms without broad country/remote matching, page retrieval or changes to the outbound contract.

- Add the whole-term `software development engineer` alias to production local analysis. Exact title/snippet phrases remain source-linked. Reviewed profile suggestions use the existing `software-engineer` catalog value; region, work mode and seniority remain unselected. Suggestions still require the existing public-query review. Near-miss words do not match.
- Recognize a bounded application title of the form `Job Application for ... - India at ...`. Require the application prefix, country delimiter and trailing employer field. Preserve the literal country suffix. An employer name containing India or the same text in snippet prose does not establish location.
- Recognize delimited `100% Remote - India` title metadata, including the existing Latin America/EMEA restriction alternatives. Partial percentages, team/client prose and unqualified worldwide availability do not gain remote support. Existing negative signals and conflicts still apply.

All fields remain optional evidence. A returned title may disagree with the body, and these rules do not parse every restriction or prove eligibility. Collections/resources/boards cannot gain individual-opportunity coverage. Unknowns and conflicts remain reviewable by default; strict filters require supported evidence. Reset and manual order preserve links. No new ranking weight or claim of suitable vacancies.

Engine/frontend wire schemas, provider queries/scopes/budgets, credentials, persistence, dependencies and version remain unchanged. Matching a new reviewed role phrase can suggest the existing public category, but does not send text or dispatch a search. Setup has no new requirement; current installed packages need rebuilding to receive the paired local changes. Analysis errors retain existing retry/manual recovery.

Regression evidence includes exact phrases, exclusions, collection suppression, near misses, synthetic engine-to-frontend validation/filtering and a captured-request privacy check using the new alias. On the saved 47-link pool, all links remain; selected default filters still leave 33 reviewable groups, while joint role/India/remote support and strict survivors rise from zero to two. The first-ten joint-support count remains zero. One joint-support result includes timezone language requiring review; two supported title combinations are not two verified suitable jobs. No new provider request or page fetch.

Continue installed/full accessibility and resource acceptance as separate small 17D slices. Assess remaining source scarcity and unsupported restrictions explicitly; further live evaluation requires fresh review rather than reusing the consumed approval.
