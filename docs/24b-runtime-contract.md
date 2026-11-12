# 24B — proposed Windows embedding runtime contract

Reviewed 2026-11-12. This is a design contract and source-review candidate,
not an implemented adapter, a supported-runtime allowlist or permission to run
models. No Windows binary, model weights, installed runtime or inference was
acquired or exercised. Existing byte/storage review stays offline and read-only.

The internal `24b-compatibility-review-v1` report exposes these requirements via
the existing developer preflight command. It is bound to the complete exact
reviewed descriptor set, including variant and upstream revision. Unknown or
changed descriptors receive no recipe metadata; known ones remain `blocked`.
All runtime approval, recipe verification, acquisition and inference flags stay
false. The candidate's prefixes and context ceilings are review inputs, not
implemented text processing or a vector-space identity. A final executable recipe
and derived-data identity must wait for the unresolved choices and acceptance.

## Reviewed source candidate

The [Ollama v0.34.0 release](https://github.com/ollama/ollama/releases/tag/v0.34.0)
points to source commit
[`d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f`](https://github.com/ollama/ollama/commit/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f).
The following observations bind to that commit, not mutable `main` or a claim
that v0.34.0 is the newest or recommended release. Windows distribution hashes,
bundled libraries/notices, platform behavior and hardware acceptance remain
unreviewed. A runtime source revision is not a Windows executable identity.

The pinned [routes source](https://raw.githubusercontent.com/ollama/ollama/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f/server/routes.go)
shows that `/api/embed` can forward cloud-qualified requests; loopback alone
does not establish local processing. `GET /api/version` returns a version and
`GET /api/status` reports cloud policy. `EmbedHandler` rejects oversized input
when `truncate` is false, limits context by model metadata and requested context,
accounts for special tokens, normalizes output and can reduce dimensions.
Its response carries a model name, not an attested manifest digest. Startup
calls `fixBlobs` before optional pruning. These observations do not prove all
outbound behavior or the absence of private logging.

The pinned [environment implementation](https://raw.githubusercontent.com/ollama/ollama/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f/envconfig/config.go)
implements `OLLAMA_NO_CLOUD`, `OLLAMA_MODELS`, `OLLAMA_HOST`,
`OLLAMA_DEBUG_LOG_REQUESTS` and `OLLAMA_NOPRUNE`. Cloud disablement is true when
either its environment setting or the server configuration disables it.
[Cloud policy](https://raw.githubusercontent.com/ollama/ollama/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f/internal/cloud/policy.go)
delegates to that policy. The pinned
[request logger](https://raw.githubusercontent.com/ollama/ollama/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f/server/inference_request_log.go)
returns without creating its logger when debug request logging is disabled;
when enabled it can retain request bodies and replay commands. This narrow
source check is not a complete runtime log audit.

## Required transport and process ownership

These are JobScout requirements for a future implementation, not claims about
an arbitrary existing Ollama service:

- Own and verify the runtime executable and all loaded dependencies, exact
  version and process lifetime. Use a process-specific allowlisted environment,
  explicit numeric IPv4 loopback binding and a known owned listener. Do not trust
  an unrelated service because its port or health response resembles Ollama.
- Set `OLLAMA_NO_CLOUD=1`, disable request debug logging, avoid inherited proxy,
  account/authentication and unrelated runtime configuration, and verify effective
  policy before any private input. A reported version/cloud flag is corroborating
  evidence, not process authentication or a general network barrier.
- Prove offline behavior under outbound denial using fixed synthetic markers.
  Review automatic background behavior as well as the requested endpoint. Do not
  claim that one environment switch prevents every network operation.
- Connect through an engine-only restricted transport with `trust_env=False`,
  no redirects, DNS, arbitrary host/path, fallback or remote authentication. Use
  exact method/path and request-schema allowlists, bounded bodies/responses,
  finite deadlines, cooperative cancellation and an owned-process stop fallback.
  The browser/native UI must not receive a general-purpose runtime proxy.
- Initially permit only version/policy and explicitly disclosed bounded model
  metadata review, followed later by the exact native `/api/embed` contract.
  Pull, create, copy, push, delete, web-search/fetch, generation and OpenAI-compatible
  proxy endpoints remain outside the embedding boundary. Metadata responses can
  expose paths/model names, so keep them transient and out of diagnostics.
- Handle busy/offline/crashed/unsupported states without a hosted fallback.
  Do not restart, reconfigure or kill another application's shared runtime.

The [Windows documentation](https://docs.ollama.com/windows) offers a standalone
CLI distribution for integration; the [FAQ](https://docs.ollama.com/faq) describes
automatic Windows/macOS application updates. Prefer evaluating an explicitly
pinned standalone distribution over treating a self-updating tray installation
as a stable execution contract. This does not approve that distribution's license,
security, dependencies or byte identity.

## Storage, identity and shared reuse

Future runtime storage must be separately reviewed and JobScout-owned. Never
start a new owned runtime against someone else's shared model root. Startup
repair and pruning mean `OLLAMA_NOPRUNE=1` does not establish read-only behavior.
The existing selected-file preflight may recognize shared exact bytes in place;
that alone does not provide a safe runtime bridge to those files. Such a bridge,
or reuse through a shared service, remains a separate design/acceptance blocker.
Do not silently copy weights or charge zero space for a copy.

The [list-models API](https://docs.ollama.com/api/tags) exposes a digest per model.
In the reviewed source,
[manifest parsing](https://raw.githubusercontent.com/ollama/ollama/d8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f/manifest/manifest.go)
computes SHA-256 while decoding manifest bytes. This is a manifest identifier,
not independent verification of every weight blob or an attestation of the bytes
used for a particular response. Treat inventory as a bounded hint only. Rehash
the selected manifest/config/params/license/weights with the existing exact pins;
bind actual execution to the same stable package and reject mutation/ambiguity.
Tags, filenames, dimensions and rounded size are insufficient identity inputs.

## Versioned recipe requirements

Record package manifest and weight identity, runtime executable/build identity,
recipe schema/version, tokenizer/special-token behavior, task role/prefix,
chunking/context policy, pooling, normalization and native dimensions together.
Any semantic change creates a distinct embedding space; no cross-recipe mixing
or automatic reuse of an earlier index. Model selection is not readiness.

| Candidate | Proposed requirements; acceptance still missing |
| --- | --- |
| MiniLM L6 v2 | Native 384 dimensions; no task prefix; preserve a bounded 256-token context including special-token accounting. Verify actual tokenizer, GGUF pooling and output semantics. |
| Nomic Embed Text v1.5 | Native 768 dimensions; distinguish `search_query: ` and `search_document: ` by explicit reviewed task role. Do not silently apply a retrieval role mapping to resume/job document comparison. Resolve the retained 8192 parameter versus 2048 architectural-context discrepancy before long-input support. |

The retained [package evidence](24b-embedding-preflight.md) and
[decision 0045](architecture/0045-optional-embedding-catalog.md) supply these
candidate constraints. They do not establish a measured Windows recipe. A
conservative proposed 2048-token Nomic ceiling still needs tokenizer, prefix and
special-token acceptance; it is not established long-context capability.

The future request must explicitly disable truncation, preserve native dimensions
and reject overlong inputs without silently losing evidence. Define chunking
before indexing rather than approximating tokens from characters. Validate exact
response count/order/dimensions, finite components, nonzero vectors and a reviewed
unit-norm tolerance. Do not silently repair malformed output or reduce dimensions.
The [embedding API](https://docs.ollama.com/api/embed) documents truncation as
enabled by default, and [embedding guidance](https://docs.ollama.com/capabilities/embeddings)
describes unit-length output. Expected pooling and numeric equivalence to upstream
remain unverified; a correct vector shape alone cannot establish them.

## Acceptance before activation

First retain exact Windows distribution/dependency/license inputs and design the
owned storage/reuse boundary. Then use separately authorized, bounded synthetic
tests for process/listener ownership, cloud rejection/outbound denial, private-log
absence, stable model identity, tokenizer/pooling/prefix semantics, overlong-input
rejection, finite normalized dimensions, cancellation, restart and resources.
Keep setup later and deterministic matching available. Acquisition belongs to
24C; installed/model-quality acceptance belongs to later scopes. This document
does not close the prior full-engine regression gaps, NOTICE/provenance gaps or
release gates and enables no endpoint, runtime download or inference.
