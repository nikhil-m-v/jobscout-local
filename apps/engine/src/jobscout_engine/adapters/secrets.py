"""Small OS-backed secret boundary. Never fall back to files or environment variables."""
import ctypes
from ctypes import wintypes
import hashlib
import os
from pathlib import Path
from typing import Protocol


class SecretStoreUnavailable(Exception):
    def __init__(self):
        super().__init__("secret_store_unavailable")


class SecretStore(Protocol):
    def contains(self) -> bool: ...
    def read(self) -> str | None: ...
    def save(self, key: str) -> None: ...
    def delete(self) -> None: ...


class UnavailableSecretStore:
    def read(self) -> str | None:
        raise SecretStoreUnavailable()

    def contains(self) -> bool:
        raise SecretStoreUnavailable()

    def save(self, key: str) -> None:
        raise SecretStoreUnavailable()

    def delete(self) -> None:
        raise SecretStoreUnavailable()


class _Credential(ctypes.Structure):
    _fields_ = [
        ("Flags", wintypes.DWORD), ("Type", wintypes.DWORD),
        ("TargetName", wintypes.LPWSTR), ("Comment", wintypes.LPWSTR),
        ("LastWritten", wintypes.FILETIME), ("CredentialBlobSize", wintypes.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)), ("Persist", wintypes.DWORD),
        ("AttributeCount", wintypes.DWORD), ("Attributes", ctypes.c_void_p),
        ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR),
    ]


class WindowsSecretStore:
    def __init__(self, data_dir: Path):
        # Isolate preview/test/native stores without writing paths to the vault.
        namespace = hashlib.sha256(os.path.normcase(str(data_dir.resolve())).encode("utf-8")).hexdigest()
        self._target = f"JobScout/{namespace}/tavily/v1"
        try:
            self._api = ctypes.WinDLL("Advapi32.dll", use_last_error=True)
            pointer = ctypes.POINTER(_Credential)
            self._api.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(pointer)]
            self._api.CredReadW.restype = wintypes.BOOL
            self._api.CredWriteW.argtypes = [pointer, wintypes.DWORD]
            self._api.CredWriteW.restype = wintypes.BOOL
            self._api.CredDeleteW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
            self._api.CredDeleteW.restype = wintypes.BOOL
            self._api.CredFree.argtypes = [ctypes.c_void_p]
            self._api.CredFree.restype = None
        except (AttributeError, OSError):
            raise SecretStoreUnavailable() from None

    def contains(self) -> bool:
        pointer = ctypes.POINTER(_Credential)()
        if not self._api.CredReadW(self._target, 1, 0, ctypes.byref(pointer)):
            if ctypes.get_last_error() == 1168:  # ERROR_NOT_FOUND
                return False
            raise SecretStoreUnavailable()
        # No readback of key bytes into Python or the UI.
        self._api.CredFree(pointer)
        return True

    def save(self, key: str) -> None:
        blob = key.encode("ascii")
        buffer = (ctypes.c_ubyte * len(blob)).from_buffer_copy(blob)
        credential = _Credential()
        credential.Type = 1  # CRED_TYPE_GENERIC
        credential.TargetName = self._target
        credential.CredentialBlobSize = len(blob)
        credential.CredentialBlob = buffer
        credential.Persist = 2  # Same user/computer across logons; no roaming.
        credential.UserName = "JobScout"
        try:
            if not self._api.CredWriteW(ctypes.byref(credential), 0):
                raise SecretStoreUnavailable()
        finally:
            ctypes.memset(buffer, 0, len(buffer))

    def read(self) -> str | None:
        # Engine-internal retrieval only; no route returns key bytes.
        pointer = ctypes.POINTER(_Credential)()
        if not self._api.CredReadW(self._target, 1, 0, ctypes.byref(pointer)):
            if ctypes.get_last_error() == 1168:
                return None
            raise SecretStoreUnavailable()
        try:
            size = pointer.contents.CredentialBlobSize
            if not 1 <= size <= 512:
                raise SecretStoreUnavailable()
            value = ctypes.string_at(pointer.contents.CredentialBlob, size).decode("ascii")
            if any(not 33 <= ord(char) <= 126 for char in value):
                raise SecretStoreUnavailable()
            return value
        except UnicodeError:
            raise SecretStoreUnavailable() from None
        finally:
            # Clear this allocated copy, not the vault record.
            ctypes.memset(pointer.contents.CredentialBlob, 0, pointer.contents.CredentialBlobSize)
            self._api.CredFree(pointer)

    def delete(self) -> None:
        if not self._api.CredDeleteW(self._target, 1, 0) and ctypes.get_last_error() != 1168:
            raise SecretStoreUnavailable()


def create_secret_store(data_dir: Path) -> SecretStore:
    if os.name == "nt":
        try:
            return WindowsSecretStore(data_dir)
        except SecretStoreUnavailable:
            pass
    return UnavailableSecretStore()
