from dataclasses import replace
import hashlib
import json
from pathlib import Path
import runpy
import stat
import sys
from types import SimpleNamespace

import pytest

from jobscout_engine import embedding_review as review
from jobscout_engine.embedding_packages import PACKAGES, PackageEvidence, package_evidence
from jobscout_engine.embedding_preflight import ArtifactPin

EVIDENCE = Path(__file__).resolve().parents[3] / 'docs/model-evidence/2026-11-11'


def pin(raw):
    return ArtifactPin(hashlib.sha256(raw).hexdigest(), len(raw))


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    roots = {name: tmp_path / name for name in ('app', 'data', 'retained', 'shared')}
    for path in roots.values():
        path.mkdir()
    files = {}
    pins = []
    for role in ('manifest', 'config', 'model', 'license', 'params'):
        raw = ('synthetic ' + role).encode()
        path = roots['shared'] / role
        path.write_bytes(raw)
        files[role] = str(path)
        pins.append((role, pin(raw)))
    package = PackageEvidence('synthetic', 'synthetic:fixed', tuple(pins), 'a' * 40)
    monkeypatch.setattr(review, 'package_evidence', lambda model: package)
    monkeypatch.setattr(review.shutil, 'disk_usage', lambda path: SimpleNamespace(free=100000))
    args = dict(destination=str(tmp_path / 'models'),
                protected_folders=tuple(str(roots[key]) for key in ('app', 'data', 'retained')),
                shared_folders=(str(roots['shared']),), working_bytes=11,
                runtime_bytes=22, recovery_bytes=33, reserve_bytes=44)
    return SimpleNamespace(roots=roots, files=files, pins=dict(pins), package=package, args=args)


def run(fixture, roles=(), **overrides):
    args = {**fixture.args, 'selected_files': tuple((role, fixture.files[role]) for role in roles),
            'inspect_selected_files': True, **overrides}
    return review.review_embedding_preflight('synthetic', **args)


@pytest.mark.parametrize('package,key', [(PACKAGES[0], 'minilm'), (PACKAGES[1], 'nomic')])
def test_actual_descriptor_pins_bind_all_manifest_roles_and_small_evidence(package, key):
    manifest_raw = (EVIDENCE / (key + '-manifest.json')).read_bytes()
    manifest = json.loads(manifest_raw)
    pins = dict(package.files)
    assert pin(manifest_raw) == pins['manifest']
    descriptors = [manifest['config'], *manifest['layers']]
    for role, descriptor in zip(('config', 'model', 'license', 'params'), descriptors, strict=True):
        assert descriptor['digest'] == 'sha256:' + pins[role].sha256
        assert descriptor['size'] == pins[role].size_bytes
        if role != 'model':
            name = key + '-' + ('v1' if role == 'config' else role) + '.txt'
            assert pin((EVIDENCE / name).read_bytes()) == pins[role]
    config = json.loads((EVIDENCE / (key + '-v1.txt')).read_bytes())
    assert config['rootfs']['diff_ids'] == [item['digest'] for item in manifest['layers']]
    inventory = json.loads((EVIDENCE / (key + '-upstream-inventory.json')).read_bytes())
    assert inventory['revision'] == package.upstream_revision
    assert inventory['license'] == 'apache-2.0'
    # This bounded absence is evidence of a gap, never proof no NOTICE applies.
    assert not any(Path(name).name.upper().startswith('NOTICE') for name in inventory['paths'])


def test_retained_public_metadata_receipts_are_exact_and_exclude_weight_downloads():
    for receipt in json.loads((EVIDENCE / 'receipts.json').read_bytes()):
        assert pin((EVIDENCE / receipt['file']).read_bytes()) == ArtifactPin(
            receipt['sha256'], receipt['size_bytes'])
        assert receipt['size_bytes'] < 131072
        assert receipt['sha256'] not in {dict(p.files)['model'].sha256 for p in PACKAGES}
    assert not (EVIDENCE / 'minilm-model.txt').exists()
    assert not (EVIDENCE / 'nomic-model.txt').exists()
    with pytest.raises(ValueError, match='Unknown'):
        package_evidence('all-minilm:latest')


def test_no_selection_budgets_full_package_plus_staging_and_every_cost(fixture):
    result = run(fixture)
    total = sum(pin.size_bytes for pin in fixture.pins.values())
    assert result['space']['transfer_bytes'] == result['space']['final_bytes'] == total
    assert result['space']['required_free_bytes'] == total * 2 + 110
    assert result['space']['temporary_bytes'] == total + 11
    assert result['reuse'] == 'unverified'
    assert set(result['artifact_status'].values()) == {'not_selected'}
    assert not Path(fixture.args['destination']).exists()


def test_exact_package_reuse_keeps_all_overheads_and_no_readiness_claim(fixture):
    result = run(fixture, fixture.files)
    assert result['reuse'] == 'exact_package'
    assert result['space']['transfer_bytes'] == result['space']['final_bytes'] == 0
    assert result['space']['required_free_bytes'] == 110
    assert result['license']['notice'] == result['license']['conversion_provenance'] == 'unresolved'
    assert result['semantic_recipe'] == 'not_verified'
    assert result['runtime'] == 'not_inspected'
    assert not result['release_approved'] and not result['acquisition_enabled']


def test_partial_reuse_never_implies_complete_package_compatibility(fixture):
    result = run(fixture, ('manifest', 'model'))
    expected = sum(fixture.pins[role].size_bytes for role in ('config', 'license', 'params'))
    assert result['reuse'] == 'partial_blobs'
    assert result['space']['transfer_bytes'] == result['space']['final_bytes'] == expected


@pytest.mark.parametrize('role', ['manifest', 'config', 'model', 'license', 'params'])
def test_same_name_and_size_but_corrupt_file_receives_no_reuse_credit(fixture, role):
    Path(fixture.files[role]).write_bytes(b'x' * fixture.pins[role].size_bytes)
    result = run(fixture, fixture.files)
    assert result['artifact_status'][role] == 'hash_mismatch'
    assert result['reuse'] != 'exact_package'
    if role == 'manifest':
        assert result['space']['transfer_bytes'] == sum(p.size_bytes for p in fixture.pins.values())
        assert result['artifact_status']['model'] == 'manifest_unverified'
    else:
        assert result['space']['transfer_bytes'] == fixture.pins[role].size_bytes


def test_file_inspection_requires_disclosed_selection_and_manifest_before_io(fixture, monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail('No filesystem inspection authorized')
    monkeypatch.setattr(review, 'inspect_model_storage', forbidden)
    for selected, consent, code in [
        ((('model', fixture.files['model']),), False, 'invalid_file_selection'),
        ((('model', fixture.files['model']),), True, 'manifest_selection_required'),
        ((('other', 'unknown'),), True, 'invalid_file_selection'),
        ((('manifest', 'a'), ('manifest', 'b')), True, 'invalid_file_selection'),
    ]:
        with pytest.raises(review.PreflightFailure, match=code):
            run(fixture, selected_files=selected, inspect_selected_files=consent)


@pytest.mark.parametrize('root', ['app', 'data', 'retained', 'shared'])
@pytest.mark.parametrize('relative', ['same', 'child', 'ancestor'])
def test_destination_is_separate_from_all_declared_owned_and_shared_roots(fixture, root, relative):
    path = fixture.roots[root]
    if relative == 'child':
        path = path / 'new'
    elif relative == 'ancestor':
        path = path.parent
    with pytest.raises(review.PreflightFailure, match='invalid_model_storage'):
        run(fixture, destination=str(path))


def test_existing_model_directory_is_inspected_without_listing_or_writing(fixture, monkeypatch):
    destination = Path(fixture.args['destination'])
    destination.mkdir()
    def forbidden(*args, **kwargs):
        pytest.fail('Read-only review must not scan, mutate files or contact the network')
    import socket
    monkeypatch.setattr(socket.socket, 'connect', forbidden)
    for name in ('iterdir', 'glob', 'rglob', 'mkdir', 'unlink', 'write_bytes', 'write_text', 'rename'):
        monkeypatch.setattr(Path, name, forbidden)
    monkeypatch.setattr(review.shutil, 'copyfile', forbidden)
    original_open = review.os.open
    def read_only_open(path, flags, *args, **kwargs):
        assert not flags & (review.os.O_WRONLY | review.os.O_RDWR | review.os.O_CREAT |
                            review.os.O_TRUNC | review.os.O_APPEND)
        return original_open(path, flags, *args, **kwargs)
    monkeypatch.setattr(review.os, 'open', read_only_open)
    result = run(fixture, fixture.files)
    assert result['reuse'] == 'exact_package'
    assert result['storage']['writability'] == 'not_tested'


def test_reparse_ancestor_and_nonregular_file_fail_closed(fixture, monkeypatch):
    original = Path.lstat
    shared = fixture.roots['shared']
    def lstat(path, *args, **kwargs):
        info = original(path, *args, **kwargs)
        if path == shared:
            return SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=0x400)
        return info
    monkeypatch.setattr(Path, 'lstat', lstat)
    with pytest.raises(review.PreflightFailure, match='invalid_model_storage'):
        run(fixture, fixture.files)
    monkeypatch.setattr(Path, 'lstat', original)
    Path(fixture.files['model']).unlink()
    Path(fixture.files['model']).mkdir()
    assert run(fixture, fixture.files)['artifact_status']['model'] == 'file_unavailable'


def test_change_during_hash_is_detected_before_any_reuse_credit(fixture, monkeypatch):
    original = review.verify_artifact
    def verify(stream, pin, stop):
        result = original(stream, pin, stop)
        if pin == fixture.pins['model']:
            Path(fixture.files['model']).write_bytes(b'changed during read')
        return result
    monkeypatch.setattr(review, 'verify_artifact', verify)
    result = run(fixture, fixture.files)
    assert result['artifact_status']['model'] == 'file_changed'
    assert result['space']['transfer_bytes'] == fixture.pins['model'].size_bytes


@pytest.mark.parametrize('free,status', [(None, 'unknown'), (109, 'insufficient'), (110, 'sufficient')])
def test_space_observation_never_coerces_unknown_or_rounds_exact_boundary(fixture, monkeypatch, free, status):
    def disk_usage(path):
        if free is None:
            raise OSError('private synthetic path must not escape')
        return SimpleNamespace(free=free)
    monkeypatch.setattr(review.shutil, 'disk_usage', disk_usage)
    result = run(fixture, fixture.files)
    assert result['space']['status'] == status
    assert result['space']['free_bytes'] == free
    assert 'private synthetic' not in json.dumps(result)


def test_space_is_refreshed_after_hashing(fixture, monkeypatch):
    observations = iter([100000, 0])
    monkeypatch.setattr(review.shutil, 'disk_usage', lambda path: SimpleNamespace(free=next(observations)))
    assert run(fixture, fixture.files)['space']['status'] == 'insufficient'


@pytest.mark.parametrize('field', ['working_bytes', 'runtime_bytes', 'recovery_bytes', 'reserve_bytes'])
def test_unknown_cost_is_rejected_before_inspection(fixture, monkeypatch, field):
    monkeypatch.setattr(review, 'inspect_model_storage', lambda *a, **k: pytest.fail('Premature IO'))
    with pytest.raises(ValueError):
        run(fixture, **{field: None})


def test_outside_selected_file_duplicate_path_and_nested_missing_destination_are_rejected(fixture):
    with pytest.raises(review.PreflightFailure, match='invalid_file_selection'):
        run(fixture, selected_files=(('manifest', str(fixture.roots['data'] / 'private')),))
    with pytest.raises(review.PreflightFailure, match='invalid_file_selection'):
        run(fixture, selected_files=(('manifest', fixture.files['manifest']),
                                     ('model', fixture.files['manifest'])))
    with pytest.raises(review.PreflightFailure, match='invalid_model_storage'):
        run(fixture, destination=str(Path(fixture.args['destination']) / 'missing' / 'nested'))


def test_missing_and_oversized_files_do_not_verify_or_leak_path_errors(fixture):
    Path(fixture.files['model']).unlink()
    result = run(fixture, fixture.files)
    assert result['artifact_status']['model'] == 'file_unavailable'
    Path(fixture.files['model']).write_bytes(b'oversized' * 1000)
    assert run(fixture, fixture.files)['artifact_status']['model'] == 'size_mismatch'
    assert fixture.files['model'] not in json.dumps(result)


@pytest.mark.parametrize('when', ['before', 'during', 'after'])
def test_cancellation_discards_all_reuse_credits(fixture, monkeypatch, when):
    stopped = when == 'before'
    original = review._verify_file
    def verify(path, pin, stop):
        nonlocal stopped
        if when == 'during':
            stopped = True
        result = original(path, pin, stop)
        if when == 'after' and path == Path(fixture.files['params']):
            stopped = True
        return result
    monkeypatch.setattr(review, '_verify_file', verify)
    result = run(fixture, fixture.files, cancelled=lambda: stopped)
    assert result['status'] == 'cancelled'
    assert result['reuse'] == 'unverified'
    assert result['space']['transfer_bytes'] == sum(p.size_bytes for p in fixture.pins.values())


@pytest.mark.parametrize('role', ['manifest', 'model'])
def test_changes_to_early_files_during_later_hashes_invalidate_reuse(fixture, monkeypatch, role):
    original = review._verify_file
    def verify(path, pin, stop):
        result = original(path, pin, stop)
        if path == Path(fixture.files['params']):
            Path(fixture.files[role]).write_bytes(b'changed after verification')
        return result
    monkeypatch.setattr(review, '_verify_file', verify)
    result = run(fixture, fixture.files)
    assert result['artifact_status'][role] == 'file_changed'
    assert result['reuse'] != 'exact_package'
    if role == 'manifest':
        assert result['space']['transfer_bytes'] == sum(p.size_bytes for p in fixture.pins.values())


def test_hardlinked_selected_file_is_rejected_without_altering_shared_bytes(fixture):
    source = Path(fixture.files['model'])
    linked = source.with_name('hardlink')
    linked.hardlink_to(source)
    before = source.read_bytes()
    result = run(fixture, fixture.files)
    assert result['artifact_status']['model'] == 'file_unavailable'
    assert source.read_bytes() == linked.read_bytes() == before


def test_cooperative_deadline_does_not_return_partial_reuse(fixture, monkeypatch):
    clock = iter([0, 0, 0, 31])
    monkeypatch.setattr(review.time, 'monotonic', lambda: next(clock, 31))
    result = run(fixture, fixture.files)
    assert result['status'] == 'cancelled'
    assert result['reuse'] == 'unverified'


def test_inspection_size_limit_rejects_oversized_internal_package_before_storage(fixture, monkeypatch):
    package = replace(fixture.package, files=(('manifest', ArtifactPin('a' * 64, 512 * 1024 * 1024)),))
    monkeypatch.setattr(review, 'package_evidence', lambda _: package)
    monkeypatch.setattr(review, 'inspect_model_storage', lambda *a, **k: pytest.fail('Premature IO'))
    with pytest.raises(review.PreflightFailure, match='inspection_limit'):
        run(fixture, ('manifest',))


@pytest.mark.parametrize('model_id', [p.model_id for p in PACKAGES])
def test_developer_cli_reports_actual_pins_without_acquisition(fixture, monkeypatch, capsys, model_id):
    monkeypatch.setattr(review, 'package_evidence', package_evidence)
    script = Path(__file__).resolve().parents[3] / 'scripts/preflight-embedding.py'
    monkeypatch.setattr(sys, 'argv', [str(script), '--model', model_id,
        '--model-folder', fixture.args['destination'], '--app-folder', str(fixture.roots['app']),
        '--data-folder', str(fixture.roots['data']), '--working-bytes', '0',
        '--runtime-bytes', '0', '--recovery-bytes', '0', '--reserve-bytes', '0'])
    with pytest.raises(SystemExit) as exited:
        runpy.run_path(str(script), run_name='__main__')
    assert exited.value.code == 0
    result = json.loads(capsys.readouterr().out)
    package = package_evidence(model_id)
    assert result['space']['required_free_bytes'] == sum(p.size_bytes for _, p in package.files) * 2
    assert result['artifacts'] == [{'role': role, 'sha256': p.sha256, 'size_bytes': p.size_bytes}
                                    for role, p in package.files]
    assert result['status'] == 'review_only'
    assert not result['acquisition_enabled']


def test_developer_cli_failure_contains_only_fixed_error_code(fixture, monkeypatch, capsys):
    script = Path(__file__).resolve().parents[3] / 'scripts/preflight-embedding.py'
    private_marker = 'PRIVATE-SYNTHETIC-DESTINATION'
    monkeypatch.setattr(sys, 'argv', [str(script), '--model', PACKAGES[0].model_id,
        '--model-folder', private_marker, '--app-folder', str(fixture.roots['app']),
        '--data-folder', str(fixture.roots['data']), '--working-bytes', '0',
        '--runtime-bytes', '0', '--recovery-bytes', '0', '--reserve-bytes', '0'])
    with pytest.raises(SystemExit) as exited:
        runpy.run_path(str(script), run_name='__main__')
    assert exited.value.code == 2
    assert json.loads(capsys.readouterr().out) == {
        'status': 'review_failed', 'code': 'invalid_model_storage'}
