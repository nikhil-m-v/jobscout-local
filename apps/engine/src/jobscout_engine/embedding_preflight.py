"""Offline byte/space checks for 24B, not model approval or acquisition consent.

No production artifact pins are enabled yet. Callers own file selection, worker
scheduling and destination inspection. No paths, runtime, network or career data
are accessed here. Reuse means byte identity only, not embedding compatibility.
"""
from dataclasses import dataclass
import hashlib
import re
from typing import BinaryIO, Callable

MAX_BYTES = 9007199254740991  # Exact integers across the desktop JSON boundary.
CHUNK_BYTES = 1024 * 1024


def _bytes(value: int) -> int:
    if type(value) is not int or not 0 <= value <= MAX_BYTES:
        raise ValueError('Invalid byte count.')
    return value


@dataclass(frozen=True)
class ArtifactPin:
    sha256: str
    size_bytes: int

    def __post_init__(self):
        if not isinstance(self.sha256, str) or not re.fullmatch('[0-9a-f]{64}', self.sha256):
            raise ValueError('A full lowercase SHA-256 is required.')
        if _bytes(self.size_bytes) == 0:
            raise ValueError('An artifact must not be empty.')


def verify_artifact(stream: BinaryIO, pin: ArtifactPin,
                    cancelled: Callable[[], bool] = lambda: False) -> str:
    """Hash from the current stream position, with bounded reads and cancellation.

    Reads at most the expected size plus one byte. The caller must supply a
    newly opened binary stream for an explicitly selected regular file and keep
    it stable; this result is a snapshot, never permission for later unchecked
    use. Exceptions from storage propagate to the caller for safe presentation.
    """
    digest = hashlib.sha256()
    remaining = pin.size_bytes
    while True:
        if cancelled():
            return 'cancelled'
        block = stream.read(min(CHUNK_BYTES, remaining + 1))
        if not isinstance(block, bytes):
            raise ValueError('A binary stream is required.')
        if len(block) > remaining:
            return 'size_mismatch'
        if not block:
            if remaining:
                return 'size_mismatch'
            if cancelled():
                return 'cancelled'
            return 'verified' if digest.hexdigest() == pin.sha256 else 'hash_mismatch'
        digest.update(block)
        remaining -= len(block)


@dataclass(frozen=True)
class SpacePlan:
    transfer_bytes: int
    final_bytes: int
    temporary_bytes: int
    runtime_bytes: int
    recovery_bytes: int
    reserve_bytes: int
    required_free_bytes: int
    free_bytes: int | None
    status: str


def plan_space(artifacts: tuple[ArtifactPin, ...], *,
               verified_existing: frozenset[ArtifactPin] = frozenset(),
               temporary_bytes: int, runtime_bytes: int, recovery_bytes: int,
               reserve_bytes: int, free_bytes: int | None) -> SpacePlan:
    """Conservative incremental budget for one destination volume.

    All four overheads are mandatory: unknown runtime/extraction/staging costs
    must be resolved before calling, never silently treated as zero. Temporary
    includes transfer staging; final is an additional retained copy. Recovery is
    additional future storage, not existing files already reflected in free space.
    Pins are unique stored blobs; exact verified files reused in place avoid both
    transfer and final-copy costs. Copying shared files instead requires budgeting
    them as new artifacts. Existing files are never modified or deleted.

    A space result does not validate paths, writability, fixed-drive ownership,
    licenses, runtime capabilities, recipe compatibility or future free space.
    """
    if not artifacts or len(artifacts) > 256 or len(set(artifacts)) != len(artifacts):
        raise ValueError('Supply 1 to 256 unique artifact pins.')
    if not verified_existing.issubset(set(artifacts)):
        raise ValueError('Reuse must match an exact planned artifact pin.')
    # A digest with conflicting lengths is never a valid artifact manifest.
    if len({pin.sha256 for pin in artifacts}) != len(artifacts):
        raise ValueError('Conflicting artifact sizes.')
    overhead = tuple(_bytes(value) for value in (
        temporary_bytes, runtime_bytes, recovery_bytes, reserve_bytes))
    if free_bytes is not None:
        _bytes(free_bytes)
    final = _bytes(sum(pin.size_bytes for pin in artifacts if pin not in verified_existing))
    required = _bytes(final + sum(overhead))
    status = 'unknown' if free_bytes is None else (
        'sufficient' if free_bytes >= required else 'insufficient')
    return SpacePlan(final, final, *overhead, required, free_bytes, status)
