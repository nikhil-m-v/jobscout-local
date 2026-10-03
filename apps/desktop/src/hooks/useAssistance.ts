import { useEffect, useState, useSyncExternalStore } from 'react';
import { createAssistanceState } from '../lib/assistance';
export function useAssistance(connected: boolean) {
  const [store] = useState(() => createAssistanceState());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { if (!connected) store.invalidate(); }, [connected, store]);
  useEffect(() => () => store.invalidate(), [store]);
  return { ...state, analyze: store.analyze, invalidate: store.invalidate };
}
