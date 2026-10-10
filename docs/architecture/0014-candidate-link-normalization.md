# Conservative candidate link normalization

Target references amended 2026-10-10 to the current 10–20 suitable-job requirement. Recorded measurements and trial outcomes remain historical.
Date: 2026-10-04. First result-quality slice of roadmap increment 16.

Search results are still web candidates, not verified vacancies. Normalize their links locally before deduplication so tracking variants do not occupy multiple slots in the bounded result pool. The provider-independent `domain/result_urls.py` helper retains the existing public HTTPS syntax boundary and performs no DNS lookup, website fetch, redirect following or resource loading.

Lowercase hosts, remove the default HTTPS port, normalize an empty root path to `/`, remove fragments and discard case-insensitive `utm_*`, `gclid`, `dclid`, `fbclid`, `msclkid`, `mc_cid` and `mc_eid` query keys. Decode parameter names only for tracking-key comparison. Preserve unknown parameters, job IDs, repeated parameters, their order and original escaping, path case and trailing slashes. Broad keys such as `ref`, `source` and `campaign` may identify a listing and remain untouched. Reject normalized links exceeding the existing 2048-character bound.

Deduplicate by the resulting URL, retaining the first candidate and provider order. This does not merge different job-board links for the same vacancy or recognize listing identity from titles. All returned records must still pass validation, including duplicates. Check selected raw title/content/URL fields for a credential echo before normalization or deduplication can discard it. Unsupported results still fail closed with fixed errors.

The session result gains `duplicates_removed` and engine-generated UTC `retrieved_at`, sampled when the response has been validated. It is retrieval time, not publication, expiry or verification time. The UI validates metadata/count bounds, displays the source hostname as plain text, and distinguishes unique candidates from removed duplicate links. Counts never imply employer coverage or a filled shortlist. No provider-supplied dates or employer/location details are inferred.

No new dependency, storage, credential setting, setup step or outbound request is introduced. Results remain session-only and disappear on invalidation/restart. The local response contract is strict: rebuild/restart engine and frontend together; an old engine paired with the new UI fails with an unsupported-response error. Packaged upgrades include both sides. There is no database migration.

Synthetic tests cover tracking aliases, meaningful job IDs/parameters, path distinctions, idempotence, URL safety/size limits, deduplication, credential echoes in discarded records, response metadata, request privacy and escaped rendering. Native interaction and deliberate live-provider search remain separate release gates. Job-specific filters, cross-source duplicates, local profile ranking and the 10–20-job shortlist remain next increments.
