"""Local routing and reviewed SQLite copies; never moves or deletes user files."""
from contextlib import closing
import ctypes
import hashlib
import json
import os
from pathlib import Path, PureWindowsPath
import secrets
import shutil
import sqlite3
import stat
import tempfile
import time

from jobscout_engine.domain.search import reject_duplicate_keys
from jobscout_engine.storage import Database

CONFIG = 'workspace-location.json'
REQUIRED = '.workspace-routing-required'
OWNER = '.workspace-copy-owner'
MAX_CONFIG = 65536
MAX_MOVES = 12
MAX_DATABASE = 256 * 1024 * 1024


class LocationFailure(Exception):
    def __init__(self, code='location_unavailable'):
        super().__init__(code)
        self.code = code


def local_path(value: str) -> Path:
    if (type(value) is not str or not 1 <= len(value) <= 2048 or
            any(ord(c) < 32 for c in value) or value != value.strip()):
        raise LocationFailure('invalid_location')
    path = Path(value)
    if not path.is_absolute() or '..' in path.parts:
        raise LocationFailure('invalid_location')
    if os.name == 'nt':
        # Fixed local disks only. UNC, device namespaces, ADS and reserved names
        # are not destinations, even when Windows would normalize them.
        if (value.startswith(('\\\\', '//')) or ':' in value[2:] or
                any(part.endswith((' ', '.')) or any(c in part for c in '<>"|?*')
                    or PureWindowsPath(part).is_reserved() for part in path.parts[1:])):
            raise LocationFailure('invalid_location')
        if ctypes.windll.kernel32.GetDriveTypeW(str(path.anchor)) != 3:
            raise LocationFailure('invalid_location')
    return path


def plain_path(path: Path, *, directory: bool = True) -> os.stat_result:
    # Check every existing ancestor: resolve() alone would hide junctions.
    for item in [*reversed(path.parents), path]:
        info = item.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise LocationFailure('invalid_location')
    if directory and not path.is_dir():
        raise LocationFailure('invalid_location')
    if not directory and (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1):
        raise LocationFailure('invalid_location')
    return info


class WorkspaceLease:
    """Lifetime lease, keyed by the stable launch directory, not the new path."""
    def __init__(self, root: Path):
        self.root, self.handle, self.stream = root, None, None

    def acquire(self):
        self.root.mkdir(parents=True, exist_ok=True)
        if os.name == 'nt':
            from ctypes import wintypes
            api = ctypes.WinDLL('kernel32', use_last_error=True)
            api.CreateMutexW.argtypes = [ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR]
            api.CreateMutexW.restype = wintypes.HANDLE
            api.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
            api.ReleaseMutex.argtypes = [wintypes.HANDLE]
            api.CloseHandle.argtypes = [wintypes.HANDLE]
            identity = hashlib.sha256(os.path.normcase(str(self.root.resolve())).encode()).hexdigest()
            handle = api.CreateMutexW(None, False, 'Local\\JobScout-workspace-' + identity)
            if not handle:
                raise LocationFailure('workspace_in_use')
            if api.WaitForSingleObject(handle, 0) not in (0, 0x80):
                api.CloseHandle(handle)
                raise LocationFailure('workspace_in_use')
            self.handle, self.api = handle, api
        else:
            import fcntl
            stream = (self.root / '.workspace.lock').open('a+b')
            try:
                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                stream.close()
                raise LocationFailure('workspace_in_use') from None
            self.stream = stream

    def release(self):
        if self.handle is not None:
            self.api.ReleaseMutex(self.handle)
            self.api.CloseHandle(self.handle)
            self.handle = None
        if self.stream is not None:
            self.stream.close()
            self.stream = None


class WorkspaceLocation:
    def __init__(self, root: Path, session_token: str):
        self.root = root.absolute()
        self.active = self.root
        self.retained: list[str] = []
        self.secret = session_token
        self.pending = None

    def load(self):
        config = self.root / CONFIG
        if (self.root / OWNER).exists() or (self.root / OWNER).is_symlink():
            raise LocationFailure('location_configuration_unavailable')
        if not config.exists() and not config.is_symlink():
            if (self.root / REQUIRED).exists() or (self.root / REQUIRED).is_symlink():
                raise LocationFailure('location_configuration_unavailable')
            self._commit(self.root, [])
            self._require_routing()
            return
        try:
            plain_path(config, directory=False)
            with config.open('rb') as stream:
                raw = stream.read(MAX_CONFIG + 1)
            if len(raw) > MAX_CONFIG:
                raise ValueError()
            value = json.loads(raw, object_pairs_hook=reject_duplicate_keys)
            if (type(value) is not dict or set(value) != {'version', 'active', 'retained'} or
                    type(value['version']) is not int or value['version'] != 1 or
                    type(value['retained']) is not list or not 0 <= len(value['retained']) <= MAX_MOVES):
                raise ValueError()
            active = local_path(value['active'])
            retained = [str(local_path(item)) for item in value['retained']]
            if (len(set(retained)) != len(retained) or str(active) in retained or
                    (retained and retained[0] != str(self.root)) or (not retained and active != self.root)):
                raise ValueError()
            plain_path(active)
            if retained:
                plain_path(active / 'jobscout.db', directory=False)
                plain_path(active / OWNER, directory=False)
                with (active / OWNER).open('rb') as stream:
                    if stream.read(8193) != str(self.root).encode():
                        raise ValueError()
                if not Database(active).is_ready():
                    raise ValueError()
            self.active, self.retained = active, retained
            self._require_routing()
        except (OSError, ValueError, TypeError, RecursionError, LocationFailure):
            raise LocationFailure('location_configuration_unavailable') from None

    def _require_routing(self):
        marker = self.root / REQUIRED
        if marker.exists():
            plain_path(marker, directory=False)
            return
        with marker.open('xb') as stream:
            stream.write(b'Routing configuration required. Do not remove.\n')
            stream.flush()
            os.fsync(stream.fileno())

    def status(self):
        return {'folder': str(self.active), 'retained_folders': list(self.retained)}

    def _destination(self, value):
        path = local_path(value)
        parent_info = plain_path(path.parent)
        if path.exists() or path.is_symlink():
            raise LocationFailure('location_exists')
        for current in [self.root, self.active, *map(Path, self.retained)]:
            if path.is_relative_to(current) or current.is_relative_to(path):
                raise LocationFailure('invalid_location')
        source_info = plain_path(self.active / 'jobscout.db', directory=False)
        size = source_info.st_size
        free = shutil.disk_usage(path.parent).free
        if not 0 < size <= MAX_DATABASE or free < size * 2 + 16 * 1024 * 1024:
            raise LocationFailure('location_space')
        return path, size, free, (parent_info.st_dev, parent_info.st_ino), (source_info.st_dev, source_info.st_ino)

    def review(self, value):
        self.pending = None
        if len(self.retained) >= MAX_MOVES:
            raise LocationFailure('location_limit')
        path, size, free, parent_id, source_id = self._destination(value)
        fingerprint = Database(self.active).review_data(self.secret)['review_token']
        token = secrets.token_hex(32)
        self.pending = (token, time.monotonic() + 300, path, parent_id, source_id, fingerprint)
        return {**self.status(), 'destination': str(path), 'database_bytes': size,
                'free_bytes': free, 'review_token': token}

    def _copy(self, destination: Path, fingerprint: str):
        source = self.active / 'jobscout.db'
        output = destination / 'jobscout.db'
        # mkdir was exclusive. Open the DB exclusively as well, then SQLite
        # copies a consistent snapshot rather than raw journal/WAL files.
        with output.open('xb'):
            pass
        deadline = time.monotonic() + 30
        def progress(*_):
            if time.monotonic() > deadline:
                raise LocationFailure('location_copy_failed')
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
            with closing(sqlite3.connect(output)) as copied:
                original.backup(copied, pages=128, progress=progress, sleep=0.01)
                if copied.execute('PRAGMA integrity_check').fetchone() != ('ok',):
                    raise LocationFailure('location_copy_failed')
        if Database(destination).review_data(self.secret)['review_token'] != fingerprint:
            raise LocationFailure('location_review_changed')
        with output.open('r+b') as stream:
            os.fsync(stream.fileno())

    def _commit(self, destination: Path, retained: list[str]):
        payload = json.dumps({'version': 1, 'active': str(destination), 'retained': retained}).encode()
        if len(payload) > MAX_CONFIG:
            raise LocationFailure('location_limit')
        descriptor, name = tempfile.mkstemp(prefix='.location-', dir=self.root)
        temporary = Path(name)
        try:
            with os.fdopen(descriptor, 'wb') as stream:
                stream.write(payload)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.root / CONFIG)
        finally:
            # Only our exact nonpersonal routing temp, never database copies.
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass  # A failed temp cleanup must not undo a committed switch.

    def apply(self, token):
        pending, self.pending = self.pending, None
        if (pending is None or not secrets.compare_digest(token, pending[0]) or
                time.monotonic() > pending[1]):
            raise LocationFailure('location_review_changed')
        _, _, path, parent_id, source_id, fingerprint = pending
        destination, _, _, current_parent, current_source = self._destination(str(path))
        if (current_parent != parent_id or current_source != source_id or
                Database(self.active).review_data(self.secret)['review_token'] != fingerprint):
            raise LocationFailure('location_review_changed')
        # Failures intentionally retain any partially written copy. There is no
        # recursive cleanup or unsafe deletion after an interruption/path race.
        destination.mkdir()
        with (destination / OWNER).open('xb') as stream:
            stream.write(str(self.root).encode())
            stream.flush()
            os.fsync(stream.fileno())
        self._copy(destination, fingerprint)
        plain_path(destination / 'jobscout.db', directory=False)
        retained = [*self.retained, str(self.active)]
        self._commit(destination, retained)
        self.active, self.retained = destination, retained
        return self.status()
