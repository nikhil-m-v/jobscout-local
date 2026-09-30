# 0004 — Windows desktop engine ownership

Date: 2026-10-01. Status: implemented.

## Problem

The PyInstaller single-file sidecar has a launcher and a server child. Killing just the launcher on desktop exit left a server running and its executable locked. Installer removal could return success while retaining that engine file.

## Decision

The Windows shell passes its process ID through `--owner-pid`. The server opens a non-inherited Windows process handle with SYNCHRONIZE permission and watches that handle in a daemon thread. A retained handle identifies the original desktop process even if Windows later reuses its PID. Failure to establish ownership fails startup.

Owner exit requests Uvicorn shutdown, allowing the import lifespan cleanup and frozen launcher's temporary-file cleanup to run. Graceful request shutdown is limited to three seconds; a stalled owner-triggered shutdown forces the server to exit after five seconds. Existing disposable parser parent monitoring remains in place. The shell does not kill the Windows launcher on normal exit. Non-Windows shutdown continues using the shell's existing kill behavior.

No process-name termination, new package, network request, profile migration, elevated end-user permission or configuration step is required. Browser preview and standalone benchmarks omit the optional owner argument and retain their existing lifecycle. Packaged Windows forks must continue passing the owning process ID. Errors expose no profile or credential content.

## Evidence and limits

All 45 engine tests pass, including a Windows subprocess test that terminates the owner and observes clean engine exit. Native frontend/Rust compilation and NSIS generation pass. The fixed installed app connected, exited normally with no app-owned processes remaining, and uninstalled through the normal silent path with no files/registration remaining and no manual process cleanup. Retained profile database was unchanged.

Active-import desktop exit, forced fallback timeout, abrupt packaged-desktop termination, optional app-data deletion, reboot cleanup and true version upgrades remain separate checks. This is lifecycle management, not a security sandbox or secure disk-erasure guarantee.
