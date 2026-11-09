import hashlib
from io import BytesIO

import pytest

from jobscout_engine.embedding_preflight import (
    ArtifactPin, CHUNK_BYTES, MAX_BYTES, plan_space, verify_artifact,
)


def pin(data=b'synthetic model bytes'):
    return ArtifactPin(hashlib.sha256(data).hexdigest(), len(data))


def budget(artifacts=None, **kwargs):
    return plan_space(artifacts or (pin(),), temporary_bytes=100,
                      runtime_bytes=200, recovery_bytes=300, reserve_bytes=400,
                      **kwargs)


@pytest.mark.parametrize('digest', ['a' * 12, 'A' * 64, 'g' * 64, '', None])
def test_rejects_short_registry_ids_and_invalid_hashes(digest):
    with pytest.raises(ValueError):
        ArtifactPin(digest, 1)


@pytest.mark.parametrize('size', [0, -1, True, 1.5, MAX_BYTES + 1])
def test_artifact_sizes_are_exact_nonempty_bounded_integers(size):
    with pytest.raises(ValueError):
        ArtifactPin('a' * 64, size)


@pytest.mark.parametrize('data,result', [
    (b'abc', 'verified'), (b'ab', 'size_mismatch'),
    (b'abcd', 'size_mismatch'), (b'xyz', 'hash_mismatch'),
])
def test_exact_byte_identity_not_a_name_or_size_match(data, result):
    assert verify_artifact(BytesIO(data), pin(b'abc')) == result


def test_oversized_stream_is_not_consumed_or_closed():
    stream = BytesIO(b'x' * 10000)
    assert verify_artifact(stream, pin(b'x')) == 'size_mismatch'
    assert stream.tell() == 2
    assert not stream.closed


def test_large_file_is_chunked_and_cancelled_before_another_read():
    data = b'x' * (CHUNK_BYTES * 2)
    stream = BytesIO(data)
    assert verify_artifact(stream, pin(data), lambda: stream.tell() >= CHUNK_BYTES) == 'cancelled'
    assert stream.tell() == CHUNK_BYTES


def test_cancel_before_read_and_after_eof_never_claims_verification():
    stream = BytesIO(b'abc')
    assert verify_artifact(stream, pin(b'abc'), lambda: True) == 'cancelled'
    assert stream.tell() == 0
    calls = iter([False, False, True])
    assert verify_artifact(stream, pin(b'abc'), lambda: next(calls)) == 'cancelled'


def test_read_failure_propagates_without_false_verification():
    class Broken:
        def read(self, size):
            raise OSError('synthetic read failure')
    with pytest.raises(OSError):
        verify_artifact(Broken(), pin())


def test_space_includes_each_peak_cost_and_exact_boundary():
    required = pin().size_bytes + 1000
    result = budget(free_bytes=required)
    assert result.status == 'sufficient'
    assert result.required_free_bytes == required
    assert result.transfer_bytes == result.final_bytes == pin().size_bytes
    assert budget(free_bytes=required - 1).status == 'insufficient'
    assert budget(free_bytes=0).status == 'insufficient'
    assert budget(free_bytes=None).status == 'unknown'


def test_verified_reuse_does_not_remove_runtime_temporary_or_recovery_budget():
    other = pin(b'another artifact')
    result = budget((pin(), other), verified_existing=frozenset({pin()}), free_bytes=0)
    assert result.transfer_bytes == result.final_bytes == other.size_bytes
    assert result.required_free_bytes == other.size_bytes + 1000
    assert budget(verified_existing=frozenset({pin()}), free_bytes=1000).status == 'sufficient'


def test_unrelated_or_changed_reuse_is_rejected():
    with pytest.raises(ValueError):
        budget(verified_existing=frozenset({pin(b'wrong bytes')}), free_bytes=0)


@pytest.mark.parametrize('value', [-1, True, 0.5, MAX_BYTES + 1])
def test_free_space_is_not_coerced(value):
    with pytest.raises(ValueError):
        budget(free_bytes=value)


@pytest.mark.parametrize('field', ['temporary_bytes', 'runtime_bytes', 'recovery_bytes', 'reserve_bytes'])
@pytest.mark.parametrize('value', [None, -1, True, 1.5, MAX_BYTES + 1])
def test_unknown_or_invalid_overhead_fails_closed(field, value):
    costs = dict(temporary_bytes=0, runtime_bytes=0, recovery_bytes=0, reserve_bytes=0)
    costs[field] = value
    with pytest.raises(ValueError):
        plan_space((pin(),), free_bytes=1000, **costs)


def test_overflow_duplicate_and_conflicting_manifest_fail_closed():
    with pytest.raises(ValueError):
        budget((pin(), pin()), free_bytes=0)
    with pytest.raises(ValueError):
        budget((pin(), ArtifactPin(pin().sha256, 1)), free_bytes=0)
    with pytest.raises(ValueError):
        budget((ArtifactPin('a' * 64, MAX_BYTES),), free_bytes=0)
    with pytest.raises(ValueError):
        plan_space((), temporary_bytes=0, runtime_bytes=0, recovery_bytes=0,
                   reserve_bytes=0, free_bytes=0)
