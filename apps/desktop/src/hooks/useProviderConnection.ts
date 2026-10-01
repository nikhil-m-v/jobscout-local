import { useEffect, useState, useSyncExternalStore } from 'react';
import { createProviderConnectionState } from '../lib/provider-connection-state';
import { requestProviderConnection } from '../lib/provider-connection';

export function useProviderConnection(connected: boolean) {
  const [store] = useState(() => createProviderConnectionState(requestProviderConnection));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { if (!connected) store.invalidate(); }, [connected, store]);
  useEffect(() => () => store.invalidate(), [store]);
  return { ...state, check: store.check, invalidate: store.invalidate };
}
