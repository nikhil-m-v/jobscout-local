"""Retained Windows process handles for the isolated frozen-engine crash check.

Only descendants of a freshly spawned, live process with the exact expected
executable can be captured. Termination uses that same handle, never a reused PID.
"""
import ctypes
from ctypes import wintypes
from pathlib import Path


def matching_children(rows, parent_pid, executable_name):
    return [pid for pid, owner, name in rows
            if owner == parent_pid and name.casefold() == executable_name.casefold()]


def validate_identity(actual_path, expected_path, created, parent_created=None):
    if Path(actual_path).resolve() != Path(expected_path).resolve():
        raise RuntimeError('Owned executable identity mismatch')
    if parent_created is not None and created < parent_created:
        raise RuntimeError('Owned process predates its parent')


class WindowsProcesses:
    def __init__(self):
        self.kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        k = self.kernel
        k.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        k.OpenProcess.restype = wintypes.HANDLE
        k.CloseHandle.argtypes = [wintypes.HANDLE]
        k.CloseHandle.restype = wintypes.BOOL
        k.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        k.WaitForSingleObject.restype = wintypes.DWORD
        k.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
        k.TerminateProcess.restype = wintypes.BOOL
        k.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD,
                                               wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
        k.QueryFullProcessImageNameW.restype = wintypes.BOOL
        k.GetProcessTimes.argtypes = [wintypes.HANDLE] + [ctypes.POINTER(wintypes.FILETIME)] * 4
        k.GetProcessTimes.restype = wintypes.BOOL
        k.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
        k.CreateToolhelp32Snapshot.restype = wintypes.HANDLE

    def rows(self):
        class Entry(ctypes.Structure):
            _fields_ = [('dwSize', wintypes.DWORD), ('cntUsage', wintypes.DWORD),
                        ('th32ProcessID', wintypes.DWORD), ('th32DefaultHeapID', ctypes.c_size_t),
                        ('th32ModuleID', wintypes.DWORD), ('cntThreads', wintypes.DWORD),
                        ('th32ParentProcessID', wintypes.DWORD), ('pcPriClassBase', wintypes.LONG),
                        ('dwFlags', wintypes.DWORD), ('szExeFile', wintypes.WCHAR * 260)]
        k = self.kernel
        k.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(Entry)]
        k.Process32FirstW.restype = wintypes.BOOL
        k.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(Entry)]
        k.Process32NextW.restype = wintypes.BOOL
        snapshot = k.CreateToolhelp32Snapshot(2, 0)  # TH32CS_SNAPPROCESS
        if snapshot == ctypes.c_void_p(-1).value:
            raise RuntimeError('Process snapshot unavailable')
        try:
            entry = Entry()
            entry.dwSize = ctypes.sizeof(entry)
            if not k.Process32FirstW(snapshot, ctypes.byref(entry)):
                raise RuntimeError('Process snapshot unavailable')
            result = []
            while True:
                result.append((entry.th32ProcessID, entry.th32ParentProcessID, entry.szExeFile))
                if not k.Process32NextW(snapshot, ctypes.byref(entry)):
                    if ctypes.get_last_error() != 18:  # ERROR_NO_MORE_FILES
                        raise RuntimeError('Process snapshot incomplete')
                    return result
        finally:
            k.CloseHandle(snapshot)

    def capture(self, pid, expected_path, parent=None):
        # Callers capture the Popen-owned launcher first. All later handles
        # require an alive retained parent plus exact executable and start order.
        if parent is not None and not parent.alive():
            raise RuntimeError('Owned parent has already exited')
        handle = self.kernel.OpenProcess(0x00100000 | 0x1000 | 1, False, pid)
        if not handle:
            raise RuntimeError('Owned process handle unavailable')
        try:
            path = ctypes.create_unicode_buffer(32768)
            size = wintypes.DWORD(len(path))
            if not self.kernel.QueryFullProcessImageNameW(handle, 0, path, ctypes.byref(size)):
                raise RuntimeError('Owned executable path unavailable')
            times = [wintypes.FILETIME() for _ in range(4)]
            if not self.kernel.GetProcessTimes(handle, *(ctypes.byref(t) for t in times)):
                raise RuntimeError('Owned process start time unavailable')
            created = times[0].dwLowDateTime | (times[0].dwHighDateTime << 32)
            validate_identity(path.value, expected_path, created,
                              parent.created if parent is not None else None)
            if parent is not None and (not parent.alive() or pid not in matching_children(
                    self.rows(), parent.pid, Path(expected_path).name)):
                raise RuntimeError('Owned process parent identity changed')
            return OwnedProcess(self.kernel, handle, pid, created)
        except BaseException:
            self.kernel.CloseHandle(handle)
            raise

    def children(self, parent, expected_path):
        result = []
        try:
            for pid in matching_children(self.rows(), parent.pid, Path(expected_path).name):
                result.append(self.capture(pid, expected_path, parent))
            return result
        except BaseException:
            for member in result:
                member.close()
            raise


class OwnedProcess:
    def __init__(self, kernel, handle, pid, created):
        self.kernel, self.handle, self.pid, self.created = kernel, handle, pid, created

    def alive(self):
        status = self.kernel.WaitForSingleObject(self.handle, 0)
        if status not in (0, 0x102):
            raise RuntimeError('Owned process wait failed')
        return status == 0x102

    def terminate(self):
        if self.alive() and not self.kernel.TerminateProcess(self.handle, 1):
            raise RuntimeError('Owned process termination failed')

    def close(self):
        if self.handle is not None:
            self.kernel.CloseHandle(self.handle)
            self.handle = None
