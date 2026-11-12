"""Read-only, explicit-file 24B review. No runtime contact, scan or writes.

Internal API, also used by scripts/preflight-embedding.py. Run on a worker, never
the UI thread. Cooperative cancellation/deadlines cannot interrupt a blocked OS
call. All observations expire: recheck files, paths and space before future use.
"""
from dataclasses import asdict
import os
from pathlib import Path
import shutil
import time
from typing import Callable

from jobscout_engine.embedding_contract import review_embedding_contract
from jobscout_engine.embedding_packages import package_evidence
from jobscout_engine.embedding_preflight import ArtifactPin, MAX_BYTES, plan_space, verify_artifact
from jobscout_engine.workspace_location import LocationFailure, local_path, plain_path

REUSE_DISCLOSURE = (
    'Inspect only the files you explicitly select in the declared model folders. '
    'Read directory metadata and hash at most five regular files, up to 512 MiB '
    'in total, in 1 MiB chunks. Nothing is changed, copied, deleted or sent online. '
    'No runtime is contacted. Exact package bytes do not prove an embedding '
    'recipe, runtime readiness, license clearance or permission to download. '
    'Shared files remain owned by their existing application.'
)


class PreflightFailure(Exception):
    """Fixed codes only; never expose private paths or raw OS errors."""


def _overlap(left: Path, right: Path) -> bool:
    return left.is_relative_to(right) or right.is_relative_to(left)


def _directory(value: str) -> Path:
    path = local_path(value)
    plain_path(path)
    # Canonicalize *after* rejecting reparse ancestors, so 8.3/drive aliases
    # cannot make overlapping Windows folders look separate lexically.
    return path.resolve(strict=True)


def inspect_model_storage(destination: str, *, protected_folders: tuple[str, ...],
                          shared_folders: tuple[str, ...]) -> dict:
    """Inspect an existing directory or a new child of an existing directory.

    Caller supplies application, active/retained career-data and shared runtime/
    model roots. There is no default derived from personal-data storage. Reject
    overlap in either direction; inspect ancestors, never enumerate children.
    """
    try:
        if not 2 <= len(protected_folders) <= 16 or len(shared_folders) > 16:
            raise ValueError()
        path = local_path(destination)
        protected = tuple(_directory(item) for item in protected_folders)
        shared = tuple(_directory(item) for item in shared_folders)
        parent = _directory(str(path.parent))
        # lstat also rejects dangling links; only a missing final component is OK.
        try:
            path.lstat()
        except FileNotFoundError:
            path = parent / path.name
            observed = parent
        else:
            path = _directory(str(path))
            observed = path
        if (any(_overlap(path, item) for item in (*protected, *shared)) or
                any(_overlap(root, item) for root in shared for item in protected)):
            raise ValueError()
    except (OSError, ValueError, TypeError, LocationFailure):
        raise PreflightFailure('invalid_model_storage') from None
    try:
        free = shutil.disk_usage(observed).free
        if type(free) is not int or not 0 <= free <= MAX_BYTES:
            free = None
    except (OSError, ValueError):
        free = None
    return {'folder': str(path), 'free_bytes': free, 'writability': 'not_tested'}


def _identity(info):
    # Windows path-stat and handle-stat can report different creation times for
    # newly written files (st_ctime is creation time there). Compare file identity,
    # exact length and modification time, then verify the actual bytes as well.
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)


def _verify_file(path: Path, pin: ArtifactPin, stop: Callable[[], bool]) -> tuple[str, tuple | None]:
    try:
        before = plain_path(path, directory=False)
        if before.st_size != pin.size_bytes:
            return 'size_mismatch', None
        # Ancestor checks reject junctions/reparse points. O_NOFOLLOW additionally
        # protects the final component on platforms supporting it.
        descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_BINARY', 0) |
                             getattr(os, 'O_NOFOLLOW', 0))
        with os.fdopen(descriptor, 'rb') as stream:
            if _identity(os.fstat(stream.fileno())) != _identity(before):
                return 'file_changed', None
            status = verify_artifact(stream, pin, stop)
            if (_identity(os.fstat(stream.fileno())) != _identity(before) or
                    _identity(plain_path(path, directory=False)) != _identity(before)):
                return 'file_changed', None
            return status, _identity(before) if status == 'verified' else None
    except (OSError, ValueError, LocationFailure):
        return 'file_unavailable', None


def review_embedding_preflight(model_id: str, *, destination: str,
                               protected_folders: tuple[str, ...],
                               shared_folders: tuple[str, ...],
                               selected_files: tuple[tuple[str, str], ...] = (),
                               inspect_selected_files: bool = False,
                               working_bytes: int, runtime_bytes: int,
                               recovery_bytes: int, reserve_bytes: int,
                               cancelled: Callable[[], bool] = lambda: False) -> dict:
    """Transient review, never an acquisition/installation authorization.

    At most one manifest and four blobs, selected by fixed role, not inferred
    from filenames/tags. Reuse is in place only; copying needs a new full budget.
    The exact manifest must verify before any blob earns a reuse credit. Full
    package identity also requires config/params/license, not just weight bytes.
    """
    package = package_evidence(model_id)
    pins = dict(package.files)
    if (len(selected_files) > 5 or len(dict(selected_files)) != len(selected_files) or
            any(role not in pins for role, _ in selected_files) or
            (selected_files and not inspect_selected_files)):
        raise PreflightFailure('invalid_file_selection')
    if selected_files and 'manifest' not in dict(selected_files):
        raise PreflightFailure('manifest_selection_required')
    # Validate budgets before inspecting any file; no unknown implicit overhead.
    initial = plan_space(tuple(pins.values()), temporary_bytes=working_bytes,
                         runtime_bytes=runtime_bytes, recovery_bytes=recovery_bytes,
                         reserve_bytes=reserve_bytes, free_bytes=None)
    plan_space(tuple(pins.values()), temporary_bytes=initial.transfer_bytes + working_bytes,
               runtime_bytes=runtime_bytes, recovery_bytes=recovery_bytes,
               reserve_bytes=reserve_bytes, free_bytes=None)
    if sum(pins[role].size_bytes + 1 for role, _ in selected_files) > 512 * 1024 * 1024:
        raise PreflightFailure('inspection_limit')
    storage = inspect_model_storage(destination, protected_folders=protected_folders,
                                    shared_folders=shared_folders)
    selected = {}
    try:
        roots = (local_path(storage['folder']), *(_directory(item) for item in shared_folders))
        for role, value in selected_files:
            path = local_path(value)
            path = _directory(str(path.parent)) / path.name
            if not any(path.is_relative_to(root) for root in roots):
                raise ValueError()
            selected[role] = path
        if len(set(selected.values())) != len(selected):
            raise ValueError()
    except (OSError, ValueError, TypeError, LocationFailure):
        raise PreflightFailure('invalid_file_selection') from None
    deadline = time.monotonic() + 30
    def stop():
        return cancelled() or time.monotonic() >= deadline
    statuses, observed = {}, {}
    for role, pin in package.files:  # manifest first, never parse untrusted JSON
        if stop():
            statuses[role] = 'cancelled'
        elif role not in selected:
            statuses[role] = 'not_selected'
        elif role != 'manifest' and statuses['manifest'] != 'verified':
            statuses[role] = 'manifest_unverified'
        else:
            statuses[role], observed[role] = _verify_file(selected[role], pin, stop)
    stopped = stop() or 'cancelled' in statuses.values()
    # Recheck every verified pathname after the batch as well: an early file can
    # change while a later file is being hashed. Future use still must reverify.
    if not stopped:
        for role in selected:
            if statuses.get(role) == 'verified':
                try:
                    if _identity(plain_path(selected[role], directory=False)) != observed[role]:
                        statuses[role] = 'file_changed'
                except (OSError, ValueError, LocationFailure):
                    statuses[role] = 'file_unavailable'
        if statuses['manifest'] != 'verified':
            for role in selected:
                if role != 'manifest' and statuses[role] == 'verified':
                    statuses[role] = 'manifest_unverified'
    stopped = stopped or stop()
    # All staging/final/runtime/recovery costs are conservatively on destination.
    # Shared files are read in place on their own volume and receive no writes.
    storage = inspect_model_storage(destination, protected_folders=protected_folders,
                                    shared_folders=shared_folders)
    stopped = stopped or stop()
    reusable = frozenset(pin for role, pin in package.files
                         if statuses[role] == 'verified') if not stopped else frozenset()
    transfer = sum(pin.size_bytes for pin in pins.values() if pin not in reusable)
    space = plan_space(tuple(pins.values()), verified_existing=reusable,
                       temporary_bytes=transfer + working_bytes,
                       runtime_bytes=runtime_bytes, recovery_bytes=recovery_bytes,
                       reserve_bytes=reserve_bytes, free_bytes=storage['free_bytes'])
    complete = all(status == 'verified' for status in statuses.values()) and not stopped
    return {
        'status': 'cancelled' if stopped else 'review_only',
        'model_id': package.model_id, 'variant': package.variant,
        'evidence_reviewed_on': '2026-11-11', 'upstream_revision': package.upstream_revision,
        'artifacts': [{'role': role, **asdict(pin)} for role, pin in package.files],
        'artifact_status': statuses,
        'reuse': 'exact_package' if complete else ('partial_blobs' if reusable else 'unverified'),
        'storage': storage, 'space': asdict(space),
        'license': {'identifier': 'Apache-2.0', 'text': 'retained_exact_bytes',
                    'notice': 'unresolved', 'conversion_provenance': 'unresolved'},
        'semantic_recipe': 'not_verified', 'runtime': 'not_inspected',
        'compatibility_review': review_embedding_contract(package),
        'acquisition_enabled': False, 'release_approved': False,
    }
