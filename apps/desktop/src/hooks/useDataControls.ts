import { useEffect, useState, useSyncExternalStore } from 'react';
import { createDataControlsState } from '../lib/data-controls-state';
import { dataRequest } from '../lib/data-controls';

export function useDataControls(connected: boolean, clearSession: () => void) {
  const [store] = useState(() => createDataControlsState(dataRequest, clearSession));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { store.connect(connected); }, [connected, store]);
  return { ...state,
    reviewData: store.review, remove: store.remove, cancel: store.cancel };
}
