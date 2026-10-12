import { useEffect, useState, useSyncExternalStore } from 'react';
import { createSavedJobsState, type JobTracking } from '../lib/saved-jobs-state';
import { savedJobsRequest } from '../lib/saved-jobs';

export function useSavedJobs(connected: boolean) {
  const [store] = useState(() => createSavedJobsState(savedJobsRequest));
  // Keep unfinished edits while navigating; drafts never enter browser storage.
  const [drafts, setDrafts] = useState<Record<string, JobTracking>>({});
  const clearDraft = (id: string) => setDrafts(current => { const next = { ...current }; delete next[id]; return next; });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { store.connect(connected); }, [connected, store]);
  return { ...state, reload: store.reload, save: store.save, update: store.update,
    remove: async (id: string) => { const removed = await store.remove(id); if (removed) clearDraft(id); return removed; },
    drafts, setDraft: (id: string, draft: JobTracking) => setDrafts(current => ({ ...current, [id]: draft })), clearDraft };
}
