"""Windows desktop ownership: retain a process handle, never poll reusable PIDs."""
import os
import threading


def watch_owner(pid: int, server) -> threading.Event:
    import ctypes
    from ctypes import wintypes

    if os.name != "nt" or pid <= 0:
        raise RuntimeError("Desktop ownership unavailable")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel.WaitForSingleObject.restype = wintypes.DWORD
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.CloseHandle.restype = wintypes.BOOL
    handle = kernel.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE only
    if not handle:
        raise RuntimeError("Desktop ownership unavailable")
    finished = threading.Event()

    def watch():
        try:
            while not finished.is_set():
                status = kernel.WaitForSingleObject(handle, 250)
                if status == 0x102:  # WAIT_TIMEOUT: desktop is still alive
                    continue
                # Owner exited (or waiting failed). Stop accepting work, cancel
                # active imports through lifespan shutdown, then let the frozen
                # launcher clean its temporary files. Bound a stalled shutdown.
                server.should_exit = True
                if not finished.wait(5):
                    os._exit(1)
                return
        finally:
            kernel.CloseHandle(handle)

    threading.Thread(target=watch, name="desktop-owner", daemon=True).start()
    return finished
