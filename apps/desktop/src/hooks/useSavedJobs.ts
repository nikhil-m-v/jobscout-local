import { useEffect, useState, useSyncExternalStore } from 'react';
import { createSavedJobsState } from '../lib/saved-jobs-state';
import { savedJobsRequest } from '../lib/saved-jobs';

export function useSavedJobs(connected: boolean) {
  const [store] = useState(() => createSavedJobsState(savedJobsRequest));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { store.connect(connected); }, [connected, store]);
  return { ...state, reload: store.reload, save: store.save, remove: store.remove };
}
