"""Bounded local facts and an explicitly requested, owned temporary-file probe."""
import ctypes
import os
from pathlib import Path
import struct
import sys
import tempfile
import threading

MARKER = b'JobScout local storage check\n'
MAX_SAFE_INTEGER = 9007199254740991


def physical_memory() -> int | None:
    if sys.platform != 'win32':
        return None

    class MemoryStatus(ctypes.Structure):
        _fields_ = [('length', ctypes.c_uint32), ('load', ctypes.c_uint32),
                    *[(name, ctypes.c_uint64) for name in (
                        'total_physical', 'available_physical', 'total_page',
                        'available_page', 'total_virtual', 'available_virtual', 'extended')]]

    value = MemoryStatus()
    value.length = ctypes.sizeof(value)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(value)):
        return None
    return value.total_physical


def bounded_integer(read, minimum: int, maximum: int) -> int | None:
    try:
        value = read()
        return value if type(value) is int and minimum <= value <= maximum else None
    except (OSError, ValueError, AttributeError, OverflowError):
        return None


def device_facts() -> dict:
    return {
        'system': {'win32': 'windows', 'linux': 'linux', 'darwin': 'macos'}.get(sys.platform, 'other'),
        'process_bits': bounded_integer(lambda: struct.calcsize('P') * 8, 32, 64),
        'logical_processors': bounded_integer(os.cpu_count, 1, 65536),
        'memory_bytes': bounded_integer(physical_memory, 0, MAX_SAFE_INTEGER),
    }


class CoreCheck:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self._lock = threading.Lock()
        self._owned_path: Path | None = None

    def _cleanup(self) -> bool:
        if self._owned_path is None:
            return True
        try:
            self._owned_path.unlink(missing_ok=True)
        except OSError:
            return False
        self._owned_path = None
        return True

    def _probe(self) -> str:
        if not self._cleanup():
            return 'cleanup_needed'
        verified = False
        descriptor = None
        try:
            descriptor, name = tempfile.mkstemp(prefix='.jobscout-check-', dir=self.data_dir)
            self._owned_path = Path(name)
            stream = os.fdopen(descriptor, 'w+b')
            descriptor = None  # The stream owns the descriptor from here.
            with stream:
                stream.write(MARKER)
                stream.flush()
                os.fsync(stream.fileno())
                stream.seek(0)
                verified = stream.read(len(MARKER) + 1) == MARKER
        except (OSError, ValueError):
            verified = False
        finally:
            if descriptor is not None:
                try:
                    os.close(descriptor)
                except OSError:
                    verified = False
            clean = self._cleanup()
        return 'cleanup_needed' if not clean else 'verified' if verified else 'unavailable'

    def run(self) -> dict:
        facts = device_facts()
        if not self._lock.acquire(blocking=False):
            return {**facts, 'storage': 'busy'}
        try:
            return {**facts, 'storage': self._probe()}
        finally:
            self._lock.release()
