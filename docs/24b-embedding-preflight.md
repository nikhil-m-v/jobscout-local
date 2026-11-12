# 24B — bounded offline package preflight

Implemented 2026-11-11 as an internal engine review and developer command. The
Settings/setup catalog remains a preview; no route, picker, runtime inventory,
selection persistence, acquisition or inference is enabled. Use the existing
engine interpreter with `scripts/preflight-embedding.py --help` for the disclosure
and exact arguments. [Decision 0045](architecture/0045-optional-embedding-catalog.md)
continues to govern scope.

## Exact artifact and license evidence

[Retained public evidence](model-evidence/2026-11-11/receipts.json) records sources,
full SHA-256, exact byte lengths and review date. Raw manifests, config, parameters
and license bytes are preserved without newline conversion. Model cards are
retained at immutable upstream revisions. The two upstream inventories are
explicitly **reduced** API metadata (revision, license label and complete returned
siblings paths), not byte copies of HTTP responses or authenticated conversion
provenance. Tests reconcile every retained receipt and every manifest descriptor
with `embedding_packages.py`, including ordered config `diff_ids`.

| Catalog ID | Exact manifest SHA-256 | Pinned weights | Entire five-file package |
|---|---|---:|---:|
| `minilm-l6-v2` | `1b226e2802dbb772b5fc32a58f103ca1804ef7501331012de126ab22f67475ef` | 45,949,216 bytes | 45,961,703 bytes |
| `nomic-embed-v1-5` | `0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f` | 274,290,656 bytes | 274,303,158 bytes |

Each package counts its exact manifest, config, weights, license and parameters.
Full weight/config/parameter pins are in the engine module and retained manifests;
the catalog's rounded MB figures and short web blob IDs never become integrity
inputs. These are **publisher descriptor pins**: weights were not downloaded or
independently hashed during this work. This is not an acquisition allowlist.

The shared 11,357-byte license blob hashes to
`c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4`.
Its retained text is Apache-2.0, including an unfilled example copyright template;
that template does not identify the model's copyright owner. Publisher cards and
the captured upstream license labels also identify Apache-2.0. Neither reviewed
manifest contains a NOTICE layer; neither captured upstream file inventory lists
a NOTICE file. This bounded absence does **not** establish that no notice applies.
Both package reports therefore retain `notice: unresolved` and
`conversion_provenance: unresolved`. Converter, tokenizer/base-model attribution,
modification history and runtime obligations still require review. No legal,
source-delivery or release clearance follows from matching the license blob.

The [November 12 lineage review](24b-model-provenance.md) narrows these gaps and
retains additional checksum-bound inputs, including Microsoft's MIT license in
MiniLM's declared base-model chain. It does not replace the Apache package blob
or authenticate the converted artifacts. Upstream tokenizer vocabulary equality
is recorded separately from the unverified embedded GGUF tokenizer.

Sources: [MiniLM registry manifest](https://registry.ollama.ai/v2/library/all-minilm/manifests/l6-v2),
[Nomic registry manifest](https://registry.ollama.ai/v2/library/nomic-embed-text/manifests/v1.5),
[MiniLM upstream revision](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/1110a243fdf4706b3f48f1d95db1a4f5529b4d41),
[Nomic upstream revision](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5/tree/e9b6763023c676ca8431644204f50c2b100d9aab).
The one-time evidence review read public metadata/license documents only. Small
registry blobs redirected to exact digest paths on the observed Cloudflare R2
host; signed query strings are not retained. No weight, executable model code,
private record, provider credential or local runtime was accessed. This manual
metadata review does not implement or authorize an application download transport.

## Separate storage and explicit reuse

The candidate format is the existing catalog's Ollama F16 package. Reuse review
reads selected files directly, without contacting Ollama or installing/changing a
runtime. The config's `os: linux` and `architecture: amd64` metadata do not certify
a Windows runtime. Runtime version/capability and the embedding adapter remain
unverified. Package compatibility here means **the exact reviewed package bytes**;
it is not approval of a semantic recipe or a usable inference integration.

The caller must supply application, active and retained personal-data folders,
shared runtime/model roots, and a separate model destination. There is no default
under personal-data storage. All declared roots must exist. The destination may
be an existing directory or one new child of an existing directory; it is never
created. Existing path components use the fixed-local-drive/reparse checks from
workspace routing. Existing directories are canonicalized after reparse checks
to avoid treating Windows path aliases as separate storage. Ancestor/descendant overlap with any declared root is rejected
in both directions, as are shared roots overlapping protected application/data
roots. Nothing enumerates children, searches disks, queries a loopback inventory,
tests writes, copies, updates or deletes shared files.

Before selected-file reads, the command requires `--inspect-selected-files`,
whose help text discloses the exact scope. File roles are explicit: `manifest`,
`config`, `model`, `license`, `params`. No filename/tag inference is accepted.
At most five unique selected paths and 512 MiB of expected reads plus EOF probes
are allowed; hashing uses 1 MiB chunks and a thirty-second cooperative deadline.
The selected manifest must match its full pin before blobs earn reuse credit.
Selected files must be regular, single-link files beneath a declared model root;
symlink/reparse ancestors are rejected. Identity, size and modification time are
compared at open, after hashing and across the batch. A detected change/error,
hash mismatch or cancellation cannot establish complete-package reuse.

Verified blobs may be credited individually as `partial_blobs`; only all five
exact files yield `exact_package`. In either case, the runtime and semantic recipe
remain unverified. Nomic's task prefixes, context discrepancy and pooling/
normalization/dimension choices from decision 0045 still need a versioned adapter
contract and later fixed-synthetic-text acceptance. No downloaded Python/model
code is imported or executed.

These are transient snapshots, not filesystem locks or protection against every
hostile concurrent replacement. Cancellation cannot interrupt a blocked OS call;
use a supervised worker/process for future UI integration and reverify before
use. Do not persist these reports as consent or readiness. Real destination paths
can contain private account/folder names: keep such output out of commits/log
exports. Nothing is written by the command itself.

## Space calculation and continuation

Observe free bytes at the model destination (or its existing parent), then refresh
after hashing. An unavailable/invalid observation remains unknown. All future
writes are budgeted conservatively on that one destination volume:

`required free = new final bytes + transfer staging + extra working bytes + runtime bytes + additional recovery bytes + reserve bytes`

The last four costs require explicit nonnegative integer inputs; no unknown is
silently zero. Reused files stay in place, including on other volumes, and remove
only their transfer/final-copy cost. Existing files already reduce observed free
space. Copying into owned storage needs a fresh full budget. Runtime downloads,
multivolume writes and arbitrary staging directories are not supported. Free space
does not test writability, reserve capacity, guarantee future space or establish
CPU/RAM/speed readiness. Default acquisition remains disabled even with sufficient
space and exact reuse.

Example with caller-reviewed variables and explicit overhead decisions:

```powershell
& $enginePython scripts/preflight-embedding.py --model minilm-l6-v2 `
  --app-folder $appFolder --data-folder $dataFolder `
  --retained-data-folder $retainedDataFolder --shared-folder $sharedModelFolder `
  --shared-folder $sharedRuntimeFolder --model-folder $separateModelFolder `
  --file manifest $manifestFile --file config $configFile --file model $modelFile `
  --file license $licenseFile --file params $paramsFile --inspect-selected-files `
  --working-bytes $extraWorkingBytes --runtime-bytes $runtimeBytes `
  --recovery-bytes $additionalRecoveryBytes --reserve-bytes $reserveBytes
```

Omit all `--file` arguments and the inspection flag for a destination/full-package
budget review without reading models. Exit 0 means review completed, including an
insufficient/unknown space result; exit 2 means invalid review input. The JSON
always distinguishes space status, artifact status and unresolved license/runtime
evidence, and never enables acquisition or release.

The additive `compatibility_review` report now binds source-reviewed candidate
requirements to the full exact package identity. Known candidates remain blocked,
with explicit conversion/NOTICE, Windows binary, offline-process, shared-model
reuse and semantic-recipe gaps. Unknown or changed descriptors receive no recipe
metadata. The [runtime contract](24b-runtime-contract.md) explains why loopback
alone does not establish local-only inference and why a newly started runtime
cannot safely use another application's shared model root. No runtime is queried
by this report; all runtime/recipe/inference/acquisition approval flags stay false.

Validation: 94 focused engine cases (46 prior primitives plus 48 review/evidence/
CLI cases), 32 adjacent storage/local-check/database cases and four frontend
catalog contract cases pass. Engine profiles use the diagnostic's environment
allowlist, synthetic storage, network/HTTPX/vault/child-launch guards and independent
thirty-second parent deadline. Normal Windows execution is needed for the
hardlink case and the previously diagnosed TestClient socket pair. The first
restricted pass also exposed a path-stat/handle-stat creation-time discrepancy;
the comparison now uses file ID, size and modification time plus full hashing.
Existing Starlette/HTTPX deprecation warnings remain in the adjacent profile.
Full engine regression, packaging, installed acceptance, hosted CI, resource/
model-quality evaluation and prior release gates are not newly established.

Continuation on November 12 adds the provenance inputs and proposed runtime
contract above; it does not complete their acceptance. Next: bind the exact GGUF
digests to source/tokenizer revisions and conversion/modification records, resolve
applicable attribution/NOTICE inputs, and review an exact Windows standalone
runtime distribution plus owned-storage/shared-reuse design. Final recipe and
product background-review wiring remain open. Keep acquisition/cancel/recovery
in 24C and inference/resource/installed acceptance in their later scopes.
