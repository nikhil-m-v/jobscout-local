from dataclasses import replace
import json

import pytest

from jobscout_engine.embedding_contract import review_embedding_contract
from jobscout_engine.embedding_packages import PACKAGES
from jobscout_engine.embedding_preflight import ArtifactPin


@pytest.mark.parametrize('package', PACKAGES)
def test_report_binds_reviewed_manifest_without_granting_compatibility(package):
    result = review_embedding_contract(package)
    assert result['status'] == 'blocked'
    assert result['manifest_sha256'] == dict(package.files)['manifest'].sha256
    assert not any(result[key] for key in (
        'runtime_approved', 'recipe_verified', 'inference_enabled', 'acquisition_enabled'))
    assert result['runtime_candidate']['status'] == 'source_review_only'
    assert 'owned_offline_runtime_boundary_unimplemented' in result['blocking_reasons']
    assert 'input_role_chunking_contract_undefined' in result['blocking_reasons']


@pytest.mark.parametrize('role', ['manifest', 'config', 'model', 'license', 'params'])
def test_changed_artifact_does_not_inherit_reviewed_recipe_from_name(role):
    package = PACKAGES[0]
    changed = replace(package, files=tuple(
        (name, ArtifactPin('0' * 64, pin.size_bytes)) if name == role else (name, pin)
        for name, pin in package.files))
    result = review_embedding_contract(changed)
    assert result['status'] == 'descriptor_not_reviewed'
    assert result['recipe_candidate'] is None
    assert result['manifest_sha256'] is None
    assert result['blocking_reasons'] == ['descriptor_not_reviewed']
    assert not result['runtime_approved']


@pytest.mark.parametrize('field,value', [
    ('model_id', 'unreviewed'), ('variant', 'all-minilm:latest'),
    ('upstream_revision', '0' * 40),
])
def test_changed_identity_cannot_inherit_review(field, value):
    result = review_embedding_contract(replace(PACKAGES[0], **{field: value}))
    assert result['status'] == 'descriptor_not_reviewed'
    assert result['recipe_candidate'] is None


def test_long_context_is_not_accepted_from_package_parameter_alone():
    result = review_embedding_contract(PACKAGES[1])
    recipe = result['recipe_candidate']
    assert recipe['package_context_tokens'] == 8192
    assert recipe['proposed_context_ceiling'] == 2048
    assert recipe['publisher_query_prefix'] == 'search_query: '
    assert recipe['publisher_document_prefix'] == 'search_document: '
    assert 'nomic_context_extension_unverified' in result['blocking_reasons']
    assert not result['recipe_verified']


def test_report_mutation_cannot_change_later_review_or_enable_a_runtime():
    first = review_embedding_contract(PACKAGES[0])
    first['runtime_candidate']['windows_binary'] = 'approved'
    first['recipe_candidate']['native_dimensions'] = 1
    first['blocking_reasons'].clear()
    again = review_embedding_contract(PACKAGES[0])
    assert again['runtime_candidate']['windows_binary'] == 'not_reviewed'
    assert again['recipe_candidate']['native_dimensions'] == 384
    assert 'minilm_mit_base_attribution_unresolved' in again['blocking_reasons']
    assert not again['runtime_approved']
    # Reports remain JSON data; no paths, input text or executable recipe.
    json.dumps(again)
