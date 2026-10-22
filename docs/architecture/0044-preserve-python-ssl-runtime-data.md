# 0044 — Preserve Python SSL runtime data in frozen builds

Date: 2026-10-22. Scope: milestone 23E packaging and installed readiness.

## Problem

An installed acceptance build had a running engine and usable profile route, but its workspace-health route returned HTTP 500. The build Python runtime patches `ssl.py` to load `codex-rejected-cas.pem` beside the module. PyInstaller collected the module and OpenSSL binaries without that additional data file. Constructing HTTPX's SSL context then raised FileNotFoundError, even for the optional Ollama status request on loopback. The desktop treated this failed health response as an unavailable workspace and disabled local import.

Mocked model-health tests and the earlier frozen smoke, which omitted the real health route, did not detect this packaging gap. This is a property of that build runtime, not a new application certificate policy.

## Decision

Inspect the actual build interpreter's SSL module before freezing. If it references this additional policy file, require a nonempty file beside that module and include it at the frozen runtime root using PyInstaller's explicit data mapping. Stock Python builds add no environment-specific file. Missing required data fails packaging. Preserve the build runtime's existing TLS behavior; do not disable verification, change trusted roots, install certificates or change Windows security settings.

The synthetic frozen lifecycle smoke now requires a successful real workspace-health response with ready database status, before exercising parsing and shutdown. That route performs the existing optional Ollama status probe on loopback. It performs no inference, model download, remote-provider request or credential read. Unavailable optional AI remains compatible with the model-free core.

## Consequences

No application dependency, schema, provider permission, user setting or version changes. The installer includes the required 906-byte runtime file only when the build interpreter references it. Runtime and incorporated-component provenance/license review remains part of the existing release gate; collecting the file is not legal clearance. Existing packages need rebuilding to include the correction.

Synthetic discovery tests cover stock runtimes, missing/empty required data and explicit mapping. Successful frozen health and installed first-use checks remain required; archive presence alone cannot prove a usable SSL runtime. Hosted runs using a different Python distribution do not establish acceptance for the local build runtime.
