# 0009 — Optional search-provider credentials

Status: accepted for the first local setup slice, 2026-10-01.

## Scope and user behavior

Settings offers Tavily as the first optional discovery source. Users can open the official dashboard/key guide, paste a masked key, show/hide their draft, save/replace it, check local saved-key status, remove it through an inline confirmation, or set up later. Saving is explicit. Draft input clears after confirmed save/removal, leaving Settings, or workspace disconnection; saved key bytes are never returned to the UI. Setup later discards the draft and retains an existing saved key.

This slice does not select an active provider, verify a key against Tavily, or enable discovery. Discover's preview continues to report provider=null and dispatch=false. A saved key is not evidence of a valid account or permission to send a query. No request to Tavily occurs during status/save/remove. External setup links are user-triggered browser navigation.

## Secret boundary and retention

The engine uses a replaceable `SecretStore` interface: contains, save, delete. Windows uses the documented [Credential Manager API](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw) through standard-library ctypes, with generic credentials and same-user/same-computer persistence across logons. No dependency is added. There is no plaintext-file, SQLite, environment-variable, or hosted fallback. Unsupported platforms and unavailable vaults fail closed while local profile features remain available.

Each data directory has a stable, versioned JobScout vault namespace derived from a hash of its normalized absolute path. Native, preview and synthetic test stores remain separate. Paths and key bytes do not appear in the target name. Moving a data directory changes its namespace; automatic credential migration is not implemented. Replacing a key writes the same entry. Removing a missing entry is idempotent. Removal does not revoke the credential at Tavily or affect another workspace.

Credentials are retained independently of database files and application binaries. Current uninstall does not remove vault entries, including when app data is deleted. Remove a key in Settings before uninstalling, or manage the corresponding JobScout entry in Windows Credential Manager afterward. Future guided uninstall must offer deliberate app-owned credential cleanup without touching other workspaces. Normal app upgrades using the same data directory retain the reference; installer-level secret retention/migration remains unverified.

OS-backed storage does not protect against other software running as the same user. The native write buffer is cleared after use, but the UI/engine transport necessarily holds draft bytes in memory; no complete memory-erasure guarantee is made.

## Local API and recovery

Authenticated GET/PUT/DELETE `/api/v1/providers/tavily` return only provider, key_saved, connection_verified=false, dispatch_available=false and the store name. PUT accepts exactly one key field, bounded printable ASCII (1–512 characters), with 2048-byte/five-second JSON limits and duplicate-key rejection. Invalid bodies and vault failures return fixed non-echo codes. All setup responses are no-store. Calls run in a thread pool under a setup lock so vault work does not block the event loop and status reads wait for writes.

Browser preview exposes only the fixed local route with its custom request-header guard. Native uses a fixed Rust command and the existing authenticated, proxy-free, redirect-disabled local client. Native external opener permissions include only the exact official setup URLs. No arbitrary provider/endpoint/header is accepted.

The UI disables concurrent operations, masks input during requests, ignores stale results after disconnect/unmount and rechecks status on reconnect. If a mutation times out, the outcome is unknown: check local status before retrying. A failed status check disables writes until a fresh read succeeds. Unsaved draft remains available for retry unless the user leaves/defers setup or disconnects. There is no automatic mutation retry or connection check that might consume credits.

## Evidence and next boundary

Twenty-four synthetic provider tests cover authentication, exact body bounds, malformed/duplicate JSON, non-echo errors, no profile/network access, no database key retention, unavailable stores, namespace isolation and real Windows vault save/recreate/replace/delete. Frontend tests verify fixed routing, safe fetch options, response validation and non-echo recovery. Browser verified mask/show, save/replace, reload, invalid input, removal confirmation/keep and setup later. The synthetic preview credential was removed through the known vault adapter and local status confirmed empty.

Next: fixed HTTPS transport, redirect/proxy/header/response limits, explicit fixed-request connection-check disclosure, configured-provider query preview and captured synthetic outbound privacy tests. Then introduce bounded discovery. Native UI/packaged-vault interaction remains a separate check; native compile checks do not establish it.

## Connection-check continuation

[Decision 0010](0010-provider-connection-check.md) supersedes the earlier statement that no provider check exists. Local setup/status operations still send nothing. The interface now includes engine-only bounded read for one separately disclosed account usage request; raw keys/account details never return to the UI. Verification is transient for that check, not stored in setup status. Active-provider selection, configured query preview and search dispatch remain future work.
