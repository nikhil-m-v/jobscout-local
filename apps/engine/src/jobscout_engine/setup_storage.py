"""Transient metadata for the configured personal-data directory only."""
from pathlib import Path
import shutil


def inspect_storage(data_dir: Path) -> dict:
    folder = None
    free_bytes = None
    try:
        # absolute() does not scan children or resolve symlinks to other folders.
        candidate = str(data_dir.absolute())
        if 0 < len(candidate) <= 32767 and not any(ord(c) < 32 for c in candidate):
            folder = candidate
        if data_dir.is_dir():
            available = shutil.disk_usage(data_dir).free
            if type(available) is int and 0 <= available <= 9007199254740991:
                free_bytes = available
    except (OSError, ValueError):
        # Never return raw OS errors, which can contain private paths.
        pass
    return {"folder": folder, "free_bytes": free_bytes}
