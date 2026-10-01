import { useEffect, useState, useSyncExternalStore } from 'react';
import { createDiscoveryState } from '../lib/discovery-state';
import { requestDiscovery } from '../lib/discovery';
export function useDiscovery(connected: boolean) {
  const [store] = useState(() => createDiscoveryState(requestDiscovery));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { if (!connected) store.invalidate(); }, [connected, store]);
  useEffect(() => () => store.invalidate(), [store]);
  return { ...state, busy: connected && state.busy, result: connected ? state.result : null,
    invalidate: store.invalidate, send: store.send };
}
