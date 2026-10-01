import { useEffect, useState, useSyncExternalStore } from 'react';
import { createSearchPreviewState } from '../lib/search-preview-state';
import { requestSearchPreview } from '../lib/search-preview';
import type { PublicSearchCriteria } from '../lib/public-search-criteria';

export function useSearchPreview(connected: boolean) {
  const [store] = useState(() => createSearchPreviewState(requestSearchPreview));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { if (!connected) store.invalidate(); }, [connected, store]);
  useEffect(() => () => store.invalidate(), [store]);
  return { ...state, connected, preview: connected ? state.preview : null,
    reviewed: connected && state.reviewed, busy: connected && state.busy,
    invalidate: store.invalidate, cancel: store.invalidate,
    consumeReview: store.consumeReview,
    review: () => { if (connected) store.review(); },
    generate: (criteria: PublicSearchCriteria) => { if (connected) void store.generate(criteria); },
  };
}
