# Compact search card and query confirmation

Date: 2026-10-02. Supersedes decision 0012's separate UI review button, while preserving its exact engine confirmation and transport boundary.

Job options presents one face at a time: controlled dropdown preferences or the engine-generated public query. A brief interruptible flip transition respects reduced motion. Switching faces preserves criteria and the preview; editing criteria or opening Settings still invalidates stale preview/results. Resume text is never a source for provider queries.

Find jobs on the preferences face prepares a local preview and reveals the query face. It cannot dispatch. The query face displays the exact engine snapshot in a selectable read-only textbox, names Tavily and discloses provider-visible query, credential/account association, network metadata and credits before sending. Find jobs on this face is the explicit confirmation for one search. There is no additional review checkbox/button or Clear preview action. Returning to preferences lets users change choices or refresh unavailable provider metadata.

The query textbox is deliberately read-only: the current outbound contract accepts fixed public categories and deterministic query equality, not arbitrary text. Editable free-form provider queries would require a separately designed restrictive boundary, not simply changing the textarea. The UI forwards the exact displayed preview and criteria with confirmation true only in the query-face click handler; it blocks absent, unavailable, disconnected or busy previews. Engine validation and overlapping-search prevention remain unchanged. Retrying a failed search requires another explicit query-face Find jobs click; there are no automatic provider requests.

No new dependency, provider endpoint, storage or backend behavior. Synthetic renderer/callback tests verify page separation, read-only query text, both Find jobs actions, absence of the redundant controls, exact click confirmation and disabled-send paths. Browser/native interactive visual evidence remains a separate check.
