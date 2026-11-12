"""Offline 24B compatibility requirements, never a supported-runtime allowlist.

Byte reuse and sufficient space cannot clear these blockers. No request builder,
text processing, model/runtime inspection or executable model code lives here.
See docs/24b-runtime-contract.md and docs/24b-model-provenance.md.
"""
from dataclasses import asdict, dataclass

from jobscout_engine.embedding_packages import PACKAGES, PackageEvidence


@dataclass(frozen=True)
class RecipeReview:
    model_id: str
    native_dimensions: int
    publisher_query_prefix: str
    publisher_document_prefix: str
    package_context_tokens: int
    proposed_context_ceiling: int
    specific_blockers: tuple[str, ...]


# Proposed ceilings include prefixes and special tokens. They are not measured
# tokenizer limits, a chunking implementation or permission to truncate inputs.
RECIPES = (
    RecipeReview('minilm-l6-v2', 384, '', '', 256, 256, (
        'minilm_mit_base_attribution_unresolved',
    )),
    RecipeReview('nomic-embed-v1-5', 768, 'search_query: ', 'search_document: ',
                 8192, 2048, (
        'nomic_base_tokenizer_attribution_unresolved',
        'nomic_context_extension_unverified',
        'nomic_pooling_postprocessing_unverified',
    )),
)

COMMON_BLOCKERS = (
    'converted_artifact_provenance_unresolved',
    'applicable_notice_inputs_unresolved',
    'windows_runtime_binary_unreviewed',
    'owned_offline_runtime_boundary_unimplemented',
    'shared_model_runtime_reuse_unverified',
    'tokenizer_pooling_normalization_unverified',
    'input_role_chunking_contract_undefined',
    'synthetic_embedding_acceptance_not_run',
)


def review_embedding_contract(package: PackageEvidence) -> dict:
    """Report requirements only, bound to the exact reviewed descriptor set.

    A new tag, changed pin or unknown package receives no recipe metadata. The
    fixed false flags are deliberate: callers cannot supply approval booleans.
    """
    reviewed = next((p for p in PACKAGES if p.model_id == package.model_id), None)
    recipe = next((r for r in RECIPES if r.model_id == package.model_id), None)
    known = reviewed == package and recipe is not None
    return {
        'revision': '24b-compatibility-review-v1',
        'reviewed_on': '2026-11-12',
        'status': 'blocked' if known else 'descriptor_not_reviewed',
        'manifest_sha256': dict(reviewed.files)['manifest'].sha256 if known else None,
        'runtime_candidate': {
            'name': 'Ollama', 'source_version': '0.34.0',
            'source_revision': 'd8ab4b4f0ca24b51d3a46b3bf4f462e58ce66b1f',
            'status': 'source_review_only', 'windows_binary': 'not_reviewed',
        },
        'recipe_candidate': asdict(recipe) if known else None,
        'blocking_reasons': [*COMMON_BLOCKERS, *recipe.specific_blockers]
                            if known else ['descriptor_not_reviewed'],
        'runtime_approved': False, 'recipe_verified': False,
        'inference_enabled': False, 'acquisition_enabled': False,
    }
