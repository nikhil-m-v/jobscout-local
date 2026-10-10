# 0016 — Literal evidence for shared skill categories

Target references amended 2026-10-10 to the current 10–20 suitable-job requirement. Recorded measurements and trial outcomes remain historical.
Date: 2026-10-04

Milestone 17 continues with grounded explanations for the existing no-model ordering. Each shared category includes one exact matched phrase from the reviewed resume and one from the returned candidate title or snippet, with the job source identified. Prefer the title when both job fields mention the category. Repeated mentions count once; ties keep provider order. Evidence is a literal alias mention, not verified expertise or job requirements.

The local assistance module returns only these bounded phrases, not surrounding personal context. It has no network, credential or database access. Evidence stays in transient assistance state and is cleared with the existing review/result lifecycle. Provider requests still contain only the reviewed public criteria. No new dependency, persistence or model setup is introduced.

The frontend requires one evidence entry per shared category in the same order, rejects additional fields and unsupported sources, and checks each phrase against the exact review and candidate used for that request. Render evidence as escaped text inside a keyboard-accessible disclosure using existing semantic styles. Failure leaves provider candidates available with retry guidance.

Limitations: aliases can group different tools (AWS and Azure both map to Cloud); mentions may be negated, incidental or aspirational. Neither absence nor presence establishes competence, a gap, required/preferred status or suitability. UI copy explains that shared categories do not establish proficiency, requirements or exact tool matches. Do not present this as a fit score. Full job extraction, nuanced interpretation and optional model evaluation remain separate work.

Upgrade: rebuild/restart frontend and local engine together for the strict added evidence field. A mismatched engine fails local analysis safely; manual search and returned candidates remain available. No storage migration or setup requirement. Next: bounded broader discovery toward 10–20 candidates and synthetic ranking/coverage evaluation, then deliberate live-provider and native validation before claiming the shortlist gate.
