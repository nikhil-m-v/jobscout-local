# 0043 — Stop active work before engine shutdown

Date: 2026-10-21. Scope: milestone 23D, Windows desktop ownership and local engine shutdown.

## Problem

The desktop's Windows process handle already tells the engine when its owner exits, including abrupt termination. Previously that watcher requested Uvicorn shutdown, but import and broader-search cancellation happened only in the application's lifespan finalizer. Uvicorn first allowed active HTTP requests to drain. During that interval a broader search could finish one response and send another reviewed variant after the desktop had closed.

## Decision

Use one engine server shutdown hook to notify the application on its event loop **before** draining HTTP requests. The notification is idempotent. It stops active import, broader-discovery and single-search/connection waits and rejects newly arriving authenticated work with a fixed, content-free response. Requests already waiting for credentials must recheck shutdown before dispatching a provider request. Already accepted storage writes can finish within the existing graceful-shutdown bound. Keep that bound and the retained Windows owner-process handle.

The Windows watcher must not mutate asyncio events from its worker thread. Both desktop-owner loss and ordinary server shutdown use the same event-loop hook. The lifespan finalizer keeps cancellation as a defensive fallback and releases the workspace lease.

## User impact and limits

Closing JobScout stops unsent broader-search variants sooner and lets active parsing clean up before the process exits. A provider request already sent cannot be recalled or guaranteed unbilled. Closing does not save an unsaved draft, authorize a retry, create durable search history, change saved records or delete retained recovery copies.

No new dependency, setting, provider permission, model requirement, schema or migration is introduced. Existing installations get this behavior only when rebuilt and upgraded. On restart the existing saved-data and session-review rules apply; work is never automatically resumed or sent again.

## Verification boundary

Synthetic tests must distinguish cancellation before HTTP draining from cancellation only in the lifespan finalizer, cover credential-read races, and check active import and broader-search shutdown. A separate frozen-engine smoke check uses newly created synthetic storage and owned process handles. Source-engine and frozen-engine checks do not establish installed desktop/WebView, installer wizard, fresh-user, upgrade, accessibility, resource-budget or live-provider acceptance. See [23D evidence and reproduction](../23-lifecycle.md).
