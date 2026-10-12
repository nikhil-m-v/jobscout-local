import { invoke, isTauri } from '@tauri-apps/api/core';
import type { JobsRequest, TrackingUpdate } from './saved-jobs-state';

export const savedJobsRequest: JobsRequest = async (action, value) => {
  const update = action === 'update' ? value as TrackingUpdate : undefined;
  const id = action === 'delete' ? value as string : update?.id;
  const tracking = update ? { stage: update.stage, notes: update.notes, revision: update.revision, confirmed: true } : undefined;
  if (isTauri()) return invoke('saved_jobs', { action, candidate: action === 'save' ? value : undefined, id, tracking });
  const suffix = id ? `/${encodeURIComponent(id)}` : '';
  const response = await fetch(`/engine/jobs${suffix}`, {
    method: action === 'load' ? 'GET' : action === 'save' ? 'PUT' : action === 'update' ? 'PATCH' : 'DELETE',
    headers: { 'X-JobScout-Import': '1', ...(action === 'save' || action === 'update' ? { 'Content-Type': 'application/json' } : {}) },
    body: action === 'save' ? JSON.stringify({ candidate: value, confirmed: true }) : tracking ? JSON.stringify(tracking) : undefined,
    cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15_000),
  });
  return response.json();
};
