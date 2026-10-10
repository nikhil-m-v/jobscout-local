# 0030 — Source-linked work requirements for review

Date: 2026-10-11. Status: implemented bounded 17D quality increment; overall acceptance remains partial.

The saved approved public trial contains explicit working-hour, physical-location, work-authorization and unavailable-visa-sponsorship statements. One of the two candidates supporting role/India/remote text also expects physical presence within named timezones. Those three supported fields do not establish eligibility.

Expose a **Work requirements to review** disclosure on individual candidates, in both manual and assisted Results, quoting exact title/snippet clauses and naming the source. Each repeated-role alternative retains its own notes. Use existing disclosure styles and keyboard semantics. No new setup, dependency, model or provider request.

Rules remain narrow: an explicit requirement cue plus working-hour/timezone language, a required physical-location phrase, required authorization to work, or explicitly unavailable visa sponsorship. Only complete clauses up to 240 characters are considered. Questions, incidental distributed-team prose, negated positive requirements, long paragraphs, collections/resources and known boards do not gain individual notes. Unrecognized wording stays unclassified. The notes are incomplete returned-text prompts, not verification of the full posting; their absence does not establish unrestricted work.

Do not convert timezone labels into countries, compute compatibility with a private address, infer citizenship/authorization, or exclude/rank a candidate based on these notes. Existing role/region/work-mode statuses, unknown/conflict handling, strict filters, grouping, order and reviewable counts remain authoritative for their existing scope. The 10–20 suitable-opportunity gate still needs independent suitability evidence.

Implementation is a small frontend helper separate from relevance statuses. It receives bounded candidate text and optional existing content signals, never a resume/profile. React renders quotes as plain text; no external resources or links are created by the disclosure. Wire schemas, outbound criteria/scopes/budgets, credentials, persistence, privacy contract and application version stay unchanged. Existing installed packages must be rebuilt to receive the frontend change.

The explicit offline replay tool adds aggregate requirement counts and source-substring assertions without printing raw text or links. Replaying the same 47-link envelope finds five flagged candidates: two working-hour, one physical-location, one authorization and one unavailable-sponsorship case. All five remain among 33 selected default reviewable groups. Strict role/India/remote filtering still leaves two groups, one with a physical-location note. All 47 unfiltered links remain. Counts describe returned text, not eligible or suitable jobs. No trial approval is reused.

Synthetic checks cover literal sources, questions/prose/negation/long-clause rejection, collection/board suppression, unchanged strict/default/reset order, and safe rendering per repeated-role alternative. The preview fixture now includes the four kinds on two synthetic repeated-role links; its isolated transports and privacy boundaries remain unchanged. Package and interactive evidence belongs in the dated progress note, with separate installed/native verification gaps retained.
