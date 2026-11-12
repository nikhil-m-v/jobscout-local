# 0045 — Optional embedding catalog and staged acquisition

Date: 2026-11-08. Status: 24A catalog preview implemented; acquisition and reuse
are not enabled in the product. The 2026-11-09 offline 24B foundation and
2026-11-11 bounded developer preflight are implemented below; descriptor pins
and destination/selected-file review exist, while provenance/NOTICE, recipe,
runtime and product setup integration remain pending. The November 12 provenance
and runtime-contract review narrows these gaps without enabling acquisition or
approving a Windows runtime, as recorded below. The owner explicitly deferred remaining accessibility acceptance
and requested milestone 24 development ahead of the unfinished v1.0 release gates.
This changes development order, not release approval or the version number.

## Small delivery boundary

Keep the model-free core working. Add a checked-in, versioned embedding catalog
and the same optional, initially collapsed preview in Settings and setup → First
use. Catalog reading needs no engine, provider, runtime inventory, filesystem
scan, model download or saved preference. It remains usable offline. The existing
setup steps and Finish later/Go to job search behavior stay intact.

Keep metadata in a small typed frontend module, separate from presentation and
the reference opener. No backend endpoint is needed for static metadata. A later
engine-owned acquisition manifest must carry independently verified artifact
hashes, exact byte sizes, sources and license/notice inputs; **this UI catalog is
not such a manifest**. Model variants are named explicitly instead of `latest`,
but registry tags remain mutable. A short blob identifier in a reference URL is
not a full artifact pin or downloaded-byte verification.

Default is **no selected model**. Neither candidate is a quality recommendation.
No model bytes, tokenizer, runtime dependency, embedding call, derived vector or
index is added. Semantic matching remains unavailable until its implementation
and evaluation. Do not repurpose a generation model as an embedding model or
offer a hosted fallback.

## Metadata and license review

Reviewed public publisher metadata on 2026-11-08. Approximate sizes below describe
the Ollama F16 package listings, not the original Hugging Face repository sizes,
total installation space, runtime RAM or measured speed.

| Candidate | Published metadata | Constraints |
|---|---|---|
| [MiniLM L6 v2](https://ollama.com/library/all-minilm:l6-v2) | `all-minilm:l6-v2`, about 46 MB, English, 384 dimensions, Apache-2.0 | The listing configures 256 tokens; original model guidance also warns of default truncation beyond 256 word pieces. Prefer bounded sections; GGUF architecture context metadata alone does not establish the configured input limit. |
| [Nomic Embed Text v1.5](https://ollama.com/library/nomic-embed-text:v1.5) | `nomic-embed-text:v1.5`, about 274 MB, English, 768 dimensions, Apache-2.0 | The [package parameters](https://ollama.com/library/nomic-embed-text:v1.5/blobs/ce4a164fc046) configure 8,192 tokens, while its [GGUF metadata](https://ollama.com/library/nomic-embed-text:v1.5/blobs/970aa74c0a90) reports 2,048 architectural context. Runtime behavior and long-input truncation still need verification. |

The [original MiniLM card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
describes short-text encoding. The [original Nomic card](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)
requires task prefixes such as `search_query:` and `search_document:`. Future
embedding records must version prefix, chunking, pooling, normalization and
dimension choices with the artifact identity; do not mix spaces from different
models or recipes. These are implementation constraints for milestones 25–26,
not verified suitability or a reason to send private text online.

Both publisher model cards and the Ollama package license pages identify
Apache-2.0: [MiniLM package license](https://ollama.com/library/all-minilm:l6-v2/blobs/c71d239df917),
[Nomic package license](https://ollama.com/library/nomic-embed-text:v1.5/blobs/c71d239df917).
This is a metadata/license-text review sufficient for a preview. It does not
certify the provenance or completeness of an unacquired distribution. Before
offering exact packages, retain their license and applicable attribution/NOTICE
inputs, review conversion/runtime/tokenizer obligations, and account for any
modifications. [Apache-2.0 sections 4 and 6](https://www.apache.org/licenses/LICENSE-2.0)
require redistribution conditions and distinguish trademark rights. No blanket
claim of unrestricted redistribution or full training-data openness is made.
Existing JobScout native/historical source-delivery gates stay separate.

CPU compatibility, RAM, GPU behavior, speed and matching quality have not been
measured in JobScout. No device is labeled ready from file size, logical processor
count or a functioning Ollama health endpoint. No numeric RAM minimum or speed
promise is supplied without evidence. Space guidance must include runtime,
temporary files, final artifacts and any retained recovery copies.

## Outbound and setup behavior

Reading or expanding the catalog performs no I/O. Only an explicit reference
button opens a fixed official Ollama model or license page in the browser. A
resolver rejects unknown model IDs/reference kinds at runtime; native opener
permissions list exactly four new URLs. No wildcard, arbitrary URL input,
download endpoint, credential or private-data parameter is introduced. The UI
discloses browser/site connection metadata, marks external actions and provides
a local error if opening fails. Reference navigation is not acquisition consent.

The preview persists no model choice or consent. Career-data deletion and
upgrades therefore need no new storage migration or deletion action. Existing
display/setup preferences retain their prior semantics. Add inventory, recovery,
upgrade and deletion controls before retaining any future model-related state.

## Remaining finite slices

### Implemented 24B foundation (2026-11-09)

`embedding_preflight.py` separates byte identity from space budgeting. Its
internal immutable artifact pins require full lowercase SHA-256 and exact positive
byte counts. A bounded binary-stream verifier checks size and digest, reads no
more than the expected length plus one byte, supports cooperative cancellation
and propagates read errors without claiming verification. The caller must open
an explicitly selected stable regular file from the start; later use must
reverify bytes. No file selection, scan, runtime contact or endpoint is exposed.

The single-volume planner counts new final bytes plus mandatory explicit
temporary, runtime, recovery and reserve costs. Temporary space includes transfer
staging, so the planner conservatively allows staging and final copies to coexist.
Exact previously verified blobs reused **in place** avoid new transfer/final
storage costs. A shared file copied into owned storage must instead be budgeted
as new storage. Existing files already reduce observed free space; recovery means
additional future copies, avoiding double counting existing copies. Deduplicated
pins, exact integer bounds and safe sums prevent ambiguous or overflowing budgets.
Unknown free space never becomes sufficient. Each overhead must be reviewed;
passing zero is an explicit caller assertion, not an inferred default.

These are internal primitives, not an externally trusted manifest parser or a
compatibility result. No production pin or approval list is supplied. Future
integration must bind verified blobs to reviewed model/recipe/license/NOTICE
inputs, reject unsupported recipes, inspect a separate fixed-drive destination,
keep hashing on a worker, handle file mutation and cancellation, and refresh
space before writes. Multi-volume layouts need per-volume budgets. Sufficient
space is only a transient calculation, not CPU/RAM/performance or write readiness.
No existing shared runtime/model is altered. No new retained state, migration,
deletion behavior, dependency or network permission is introduced.

### Implemented 24B descriptor/destination/reuse review (2026-11-11)

`embedding_packages.py` pins both current catalog candidates' exact manifests,
configs, F16 weight descriptors, license and parameter blobs. Public small
evidence is retained with hashes and immutable upstream revisions; model weights
were not acquired. Neither inspected manifest/inventory supplies a NOTICE input;
that bounded absence leaves NOTICE and conversion/tokenizer/base-model provenance
unresolved, rather than cleared. See [the evidence and procedure](../24b-embedding-preflight.md).

The candidate format remains Ollama packages. `embedding_review.py` and the
developer-only `scripts/preflight-embedding.py` compose the existing primitives
with explicit-file disclosure, regular-file identity/stability checks, bounded
hashing/cancellation and separately selected fixed-drive destination inspection.
The caller declares application, active/retained career-data and shared runtime/
model roots; overlapping destinations are rejected without enumeration or writes.
Only an exact manifest can unlock selected-blob reuse credits. Partial blobs are
distinguished from a complete exact package; neither verifies a semantic recipe
or Windows runtime capability. No shared runtime/model is changed or contacted.

Refresh free space after hashing and count staging, final copies and all explicit
runtime/working/recovery/reserve costs on the selected destination. Shared bytes
are reused in place; copying and multivolume writes require separate budgets.
Reports are transient and never consent. The product catalog, skip path and
reference permissions stay unchanged. No endpoint, persistent state, dependency,
model acquisition or inference is enabled; no new deletion/upgrade action exists.
Future product wiring must use a worker and reverify before use. A cooperative
deadline cannot interrupt a blocked OS call. See the procedure for test evidence
and the remaining product/release limits.

### Implemented 24B provenance and compatibility requirements (2026-11-12)

The [lineage review](../24b-model-provenance.md) retains further small, immutable
public evidence, including the MIT input in MiniLM's declared base chain and
upstream tokenizer vocabulary digest comparisons. This narrows attribution
questions but does not authenticate a conversion chain or clear NOTICE/license
obligations for the actual GGUF package. Package Apache license blobs stay intact.

The [proposed Windows runtime contract](../24b-runtime-contract.md) binds its
source observations to one exact Ollama revision. This is not a supported-runtime
or Windows binary approval. Future private inference requires a verified owned
process, effective cloud disablement, restricted transport and proven offline
behavior; a loopback port, version string or health response is insufficient.
Do not start a new runtime against someone else's shared model store: startup
repair can run even when pruning is disabled. Reuse through a shared service or
a read-only bridge remains a design/acceptance requirement, not implemented reuse.

The developer preflight's additive `24b-compatibility-review-v1` report binds
candidate dimensions/prefix/context constraints and explicit remaining blockers
to the complete reviewed package descriptor set. Changed or unknown descriptors
receive no recipe metadata. All runtime/recipe/inference/acquisition flags stay
false, even when byte identity and space checks pass. No executable recipe,
request builder, vector-space key, persisted state, endpoint or UI is introduced.
Final tokenizer/pooling/normalization, role mapping and chunking decisions must
precede derived-data identity and inference integration.

### Remaining work

1. **24B — finish product preflight:** resolve the retained descriptor evidence's
   conversion/NOTICE gaps and satisfy the proposed runtime/recipe contract,
   then integrate explicit destination/selected-file background review into setup.
   Descriptor identity alone is not independent weight verification. Inspect only
   explicitly selected files or a disclosed bounded loopback inventory. A matching
   tag/name is not verification; require artifact/recipe identity. Never alter
   or delete someone else's shared runtime/model, scan disks automatically or
   trust downloaded executable model code. Existing compatible models must be
   reusable without downloading another copy.
2. **24C — reviewed acquisition:** show exact source/endpoints, network metadata,
   total bytes/storage/space and license before explicit download consent. Use an
   engine-owned bounded task with progress, cancellation, saved nonpersonal
   checkpoints, owned partial files, integrity checks and explicit recovery after
   interruption. No automatic runtime install, model update or retry that broadens
   the reviewed transfer. Redirect/CDN behavior needs a restrictive transport
   design and synthetic captured-request tests before activation.
3. **24D — local verification and acceptance:** verify acquired/reused bytes and
   runtime capabilities using fixed synthetic text only; record measured resource
   limits, offline/restart/cancel/recovery/upgrade behavior and separate installed
   acceptance. Selection or successful embeddings must not imply search consent,
   match quality, a ready generation model or milestone-26 acceptance.

Do not silently use the preview's approximate size as an integrity/space bound.
Future remote changes require fresh review; maintain deterministic fallback and
setup later throughout. Download permission never permits sending a resume,
profile, embedding, private note or other career record to the model host.

## Continuing locally

Run `npm run acceptance:preview` for the disposable synthetic workspace, then
open Settings → Optional semantic matching → Review embedding models. The same
preview is in setup → First use; Finish later must still return to resume import.
Do not activate provider or model acquisition actions for this catalog check.
Use `node --experimental-strip-types --test apps/desktop/tests/embedding-catalog.test.mjs`
for the focused offline contract checks and `npm run build` for typechecking and
frontend packaging. Browser evidence, native permission compilation and installed
external-reference behavior are separate checks.
