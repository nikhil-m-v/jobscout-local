# 24B — bounded model lineage and attribution review

Reviewed 2026-11-12. This narrows the attribution questions for the two pinned
Ollama candidates; it does not clear distribution, enable acquisition or verify
the unacquired GGUF weights. The package descriptors and Apache-2.0 license blobs
from [the earlier review](24b-embedding-preflight.md) remain unchanged.

## MiniLM: the base-model chain also carries MIT evidence

The [pinned sentence-transformers card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/blob/1110a243fdf4706b3f48f1d95db1a4f5529b4d41/README.md)
identifies `nreimers/MiniLM-L6-H384-uncased` as its pretrained starting point.
Its [pinned tokenizer configuration](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/blob/1110a243fdf4706b3f48f1d95db1a4f5529b4d41/tokenizer_config.json)
also names that repository. The [nreimers card](https://huggingface.co/nreimers/MiniLM-L6-H384-uncased/blob/3276f0fac9d818781d7a1327b3ff818fc4e643c0/README.md)
declares MIT and describes deriving six layers by retaining every second layer
of Microsoft's twelve-layer model. The [Microsoft card](https://huggingface.co/microsoft/MiniLM-L12-H384-uncased/blob/44acabbec0ef496f6dbc93adadea57f376b7c0ec/README.md)
also declares MIT and links the original UniLM/MiniLM repository.

Retained the [UniLM MIT license](https://github.com/microsoft/unilm/blob/31c5b904ca1bf2afb4c234a6675c683a4e5fc7cd/LICENSE)
with its Microsoft Corporation copyright notice as exact bytes. Its permission
condition requires preserving the copyright and permission notices in copies or
substantial portions. This is a concrete additional attribution input; the
Apache package label alone does not finish its review. Do not invent a copyright
notice for nreimers or claim this current repository license proves the exact
historical GGUF conversion inputs. The Microsoft and nreimers reduced inventories
contain no separate LICENSE or NOTICE path at these revisions.

## Tokenizers and Nomic lineage

The pinned MiniLM, pinned Nomic and
[BERT vocabulary](https://huggingface.co/google-bert/bert-base-uncased/blob/86b5e0934494bd15c9632b12f734a8a67f723594/vocab.txt)
were each read under a 400,000-byte response bound. All three have identical
231,508-byte content and SHA-256
`07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3`.
Only the reduced digest comparison is retained, not the vocabulary files.
This establishes equality of those upstream vocabulary snapshots; it establishes
neither historical origin nor equality of the embedded GGUF tokenizer, its
normalization rules or special-token handling.

The [pinned Nomic card](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5/blob/e9b6763023c676ca8431644204f50c2b100d9aab/README.md)
uses the BERT uncased tokenizer in its example and describes training from the
long-context `nomic-ai/nomic-bert-2048` model. The pinned Nomic tokenizer config
declares `BertTokenizer`, lowercasing and an 8,192-token limit. Its model config
points to code in `nomic-ai/nomic-bert-2048`; that code was not downloaded or run.
The config retains both 2,048 positional/training fields and `n_positions: 8192`;
these are upstream metadata, not proof of the converted runtime's context behavior.

Retained the [BERT Apache-2.0 LICENSE](https://huggingface.co/google-bert/bert-base-uncased/blob/86b5e0934494bd15c9632b12f734a8a67f723594/LICENSE).
The reduced immutable inventories identify Apache-2.0 for BERT,
[Nomic's long-context base](https://huggingface.co/nomic-ai/nomic-bert-2048/tree/7710840340a098cfb869c4f65e87cf2b1b70caca)
and the [released contrastive checkpoint](https://huggingface.co/nomic-ai/nomic-embed-text-v1-unsupervised/tree/b53d557b15ae63852847c222d336c1609eced93c),
and list no NOTICE path. This does not authenticate which revisions produced the
pinned package or establish that no other notices apply.

## What remains unresolved

| Question | Evidence and next concrete action |
| --- | --- |
| Package-to-upstream binding | The inspected registry manifests/configs contain blob descriptors and format/family metadata, but no authenticated source revision, converter version/command or modification ledger. Obtain a publisher conversion record binding each exact GGUF digest to its source/tokenizer revisions, or separately scope a reproducible conversion and review its new artifact identity. |
| Converted tokenizer and model metadata | Upstream vocabulary equality does not verify the unacquired GGUF's embedded tokenizer. Inspect only after separately reviewed acquisition/reuse and retain the bounded metadata comparison; never execute downloaded model code. |
| Additional attribution | Carry the retained Microsoft MIT input into the MiniLM attribution review. Confirm applicable historical notices and modifications through the actual conversion chain; do not replace or relabel the package's Apache-2.0 blob. |
| NOTICE disposition | No NOTICE in the reviewed finite inventories/manifests is bounded absence. Resolve applicability for the actual source/conversion/runtime chain before offering acquisition or distribution; keep reports unresolved. |
| Runtime distribution | Neither model license review clears the eventual Windows runtime binary, its dependencies or installer notices. Runtime artifact/version and license inventory remain a separate gate. |

[Apache-2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0) distinguishes
license delivery, modified-file notices, source attribution retention and the
conditional handling of an included NOTICE file. A NOTICE file is not automatically
required merely because a package declares Apache-2.0, and absence from one
repository is not a complete downstream attribution determination. These review
dispositions are evidence tracking, not legal or release approval.

## Retained evidence and bounds

[Receipts](model-evidence/2026-11-12/receipts.json) bind seven exact small public
documents and two reduced evidence files (lineage inventories and vocabulary
digest comparison), totaling 23,317 bytes excluding the receipt index. Every
stored file has its SHA-256 and byte length. Five upstream inventories were read
at explicit immutable revisions; their representation is labeled reduced, not
the original HTTP response. Vocabulary reads total 694,524 bytes; none are weights.
Individual metadata/license reads were capped at 200,000 bytes and vocabulary
reads at 400,000 bytes, with 15-second network timeouts.

Only fixed public metadata/license/tokenizer URLs were read, without credentials,
private content, provider calls or runtime contact. No weights, training data,
downloaded executable code, model installation, shared-file change or inference.
Both candidates remain blocked for acquisition; existing model-free use and the
catalog's setup-later path remain available.
