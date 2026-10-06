# Decision 0021 — Literal shortlist evidence and honest page coverage

Date: 2026-10-06. Status: implemented locally; interactive/native verification pending.

## Evidence and problem

The user authorized one exact five-query Tavily trial: Software engineer jobs India Remote Python SQL, replacing jobs with job openings, vacancies, hiring and careers. The production restricted adapter and bounded coordinator completed five requests in 12.636 seconds. It returned 23 unique public pages and removed 24 canonical-link duplicates (47 raw candidates). Title review found job-board collections rather than clearly individual openings; local collection signals identify all 23. No result pages were fetched. Five intent synonyms are not an evidenced route to 30–50 individual opportunities.

Existing category counts also conflate AWS/Azure, promote a teammate's role mentioned in a snippet, and count explicit negative phrases as positive skill evidence.

## Decision

Add pure engine shortlist evidence behind the existing local assistance interface. Preserve historical category/evidence data, but additionally return bounded exact role phrases with title/snippet sources, one literal shared tool phrase per category, and narrow explicit exclusion phrases. Search adapters remain independent of these fields.

Resume-assisted ordering places likely collection pages after individual/unclear candidate pages. Within the latter pool: reviewed-role title mentions first, snippet-only mentions next, absent role details next, other advertised roles last. An advertised different title cannot gain the reviewed-role group through a teammate's snippet mention. Within groups, exact shared tool categories precede broad shared categories. Explicit exclusions do not add positive category evidence unless another positive exact occurrence exists. Provider order resolves ties. No fit probability, mandatory qualification or eligibility claim.

Literal tool overlap requires the same alias ignoring case: AWS does not equal Azure, and Figma does not equal generic product design. It can locate a matching alias after a nonmatching alias. Count each category once to avoid repetition boosting. No inferred proficiency, synonym equivalence or absence-as-skills-gap claim. Resume aliases are scanned once per analysis, not once per candidate. Existing bounded thread-based local analysis remains responsive.

Exclusions are deliberately narrow: no Python positions/roles/jobs/openings and do not/don't/never use Python. No Python experience required, Python not required and not only Python are not exclusions. Positive and negative occurrences can coexist and remain reviewable. Broad negation understanding is not implemented.

Collection signals use titles only: counted job lists, regional/plural remote lists and explicit Job Board titles. They override opening language, since collections frequently contain apply/hiring text. Collection pages remain visible by default and have an independent reversible filter in both discovery paths. Manual ordering remains provider order. Counts disclose collection/opening-language/unclear pages and explicitly avoid counting collections as individual opportunities or verifying vacancies.

Every evidence field has bounds, exact local-source validation, fixed category IDs, duplicate checks and escaped rendering. Frontend and engine must be rebuilt/restarted together for the new strict contract. No storage migration, provider option, query change, dependency, model or credential requirement is added. Current setup/skip/recovery behavior remains. No extra network calls follow automatically from the poor trial.

## Quality and limitations

Seven diagnostic pools contain 114 raw candidates and 59 labeled relevant candidates. New tool/title and collection pools improve top-five relevance from prior reviewed-role ordering 40% to 80% and 40% to 100%; all 59 relevant labels and identical post-resource candidate sets remain. First-five/first-ten non-degradation assertions preserve existing cases. These are synthetic diagnostic judgments, not representative live accuracy.

The trial used only generic public criteria, no private resume, provider usage check or webpage fetch. The native app's OS-vault key was consumed by the restricted adapter; no credentials, machine paths, raw response or personal logs are committed. Billing was not independently measured; five basic requests is an estimated five-credit allowance, not a receipt. Warm in-process analysis of the 23 public pages had a five-run median of 55.8 ms; this is not desktop startup/RAM evidence. Interactive UI/cancellation and full desktop resources remain unverified because the browser automation sandbox failed initialization.

Next: replace near-identical intent expansion with a separately reviewed, engine-owned strategy aimed at individual employer/ATS opening pages; compare unique individual-page coverage before spending more requests. Do not add unrestricted page crawling or a hosted-model fallback. Broader bounds, explicit review, source uncertainty, relevance/retention and privacy verification stay required. Milestone 17 remains partial.
