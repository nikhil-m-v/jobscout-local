# 0017 — Planned weighted local suitability ranking

Date: 2026-10-05. Status: planned design; no scoring model, embedding inference, generative analysis or new agent is enabled by this decision.

## Purpose and sequence

Once discovery can supply a useful 30–50-job shortlist, help the user see which opportunities are best supported by their reviewed career evidence and preferences. Current discovery returns at most ten candidates, and shared-category counts are a diagnostic baseline, not suitability scores. This expands roadmap milestones 25–26 and 29–30 rather than adding an unrelated service or making the core depend on a model.

There are two distinct optional AI uses: (1) locally summarize a reviewed resume and suggest fixed public search categories; (2) locally compare returned job evidence against the reviewed profile and explain the ordering. The summary itself never goes to the search API. Both flows work with deterministic fallbacks. Semantic ranking can precede generative summarization because embeddings do not require an LLM summary.

## Ranking design

First identify usable job records and apply user-selected hard constraints using supported evidence. An explicit contradiction of a mandatory constraint cannot be rescued by semantic similarity. Unknown location, eligibility, experience or requirements remain unknown and follow a visible include/review/exclude policy; missing resume evidence is not proof that a candidate lacks a qualification. Assess incomplete snippets separately from sufficiently described jobs. No automatic job-page retrieval is introduced; richer descriptions require an independently reviewed, bounded acquisition design or explicit local job-text input.

Build a feature vector for each candidate/job comparison: role compatibility, skill/tool evidence, responsibility/domain similarity, experience/seniority compatibility and soft preferences. Compare corresponding source-grounded sections with a small local embedding model, combining semantic similarity with exact requirement/tool checks. Avoid one whole-resume-versus-whole-description cosine score: repeated keywords, broad aliases, negative requirements and unrelated career content can hide contradictions. Do not use identity/contact details or employer prestige as suitability features. Candidate goals can differ from previous titles; primary and adjacent role suggestions need user review.

For supported components, compute a deterministic weighted sum `S = sum(w_i * s_i)` with bounded, normalized component scores and nonnegative weights summing to one. Illustrative starting weights are role 30%, skills/tools 25%, responsibilities/domain 20%, experience/seniority 15%, soft preferences 10%. These are evaluation hypotheses, not established defaults. Define semantic-score transformations before combining them with rule scores; raw cosine values and ordinal model outputs are not automatically comparable. Avoid double-counting the same evidence across components.

Track component evidence coverage separately. Unknown components remain unknown rather than zero evidence of suitability or a perfect score. If only some components are supported, expose a conservative score range: known weighted contributions form the lower bound; unknown weight forms the remaining upper bound. Do not silently renormalize sparse jobs to compete as fully supported matches. The exact ordering policy for incomplete records must be evaluated, with a clearly visible needs-review state and stable ties. Show component contributions, source spans, contradictions and coverage beside relative ordering. A suitability index is not a probability of hiring or verified eligibility.

Let users inspect and change soft-factor weights locally, reset to a versioned default and compare the ordering. Hard constraints remain separate from weights. Weight changes rerank cached local records without a provider request. Profile/job edits invalidate derived comparisons; version weights, taxonomy, model and evidence snapshots. Bound inference, offer progress/cancellation, discard stale responses, reuse compatible models, and integrate acquisition/skip/recovery/deletion with existing setup and data controls.

## LLM and agent responsibilities

After local runtime setup, an optional LLM may extract structured, source-backed profile facts and job requirements (required/preferred/unclear), identify contradictions and explain score components. Validate schemas, exact spans and supported claims; retain user corrections. Estimated experience must follow reviewed chronology with overlap/ambiguity handling. The deterministic matcher calculates weights and order; generated prose cannot silently alter scores or assert unsupported proficiency. Evaluate whether an optional local cross-encoder reranker improves difficult pairs before introducing it; it is a separate comparison model, not a mandatory generative agent.

Use the existing bounded local task orchestration for analysis, comparison and explanation. An autonomous tool-using agent is not a prerequisite for weighted ranking. Neither an LLM nor orchestration may send private context, change query approvals, fetch arbitrary links, invoke credential tools or submit applications. Treat job text as untrusted data, including prompt-injection instructions.

## Milestones and completion gate

- 25: local section embeddings, evidence-linked component vectors, versioned storage/cache and deletion; deterministic fallback remains usable.
- 26: weighted suitability ranking with editable soft weights, hard-constraint separation, explicit unknown/coverage handling, and component explanations. Compare provider order, current shared-category ranking, weighted rules and weighted semantic ranking on independently labeled candidate/job cases.
- 29: optional reviewed local candidate summary and structured job-requirement suggestions after generative runtime setup; never send private summaries to discovery.
- 30: grounded suitability explanations and evaluated optional reranking. Any more capable local orchestration is contingent on measured benefit and retains the same bounded permissions.

Evaluate first-ten and full-shortlist relevance (including graded nDCG), pairwise ordering judgments, relevant retention, hard-constraint violations, unknown coverage, explanation factuality, ranking changes under weights, repeated keywords, negation, broad tool aliases, adjacent roles, incomplete dates and sparse descriptions. Extend the current synthetic baseline with independently labeled cases and a reviewed real-world trial; do not tune exclusively to the three adversarial pools. Measure packaged latency, RAM and storage, with cancel/restart/offline behavior. Set acceptance thresholds before tuning, and enable semantic or generative components only when improvements justify their resource cost. No hiring probability or claim of an objectively best career is warranted.

## Technical references

Sentence Transformers documents [semantic textual similarity](https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html) through embeddings and similarity functions, and [retrieve and rerank](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html) as separate retrieval and pair-comparison stages. These establish available techniques, not their quality for job suitability; the weights, evidence policies and evaluation above are JobScout design proposals.
