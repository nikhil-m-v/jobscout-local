import { invoke, isTauri } from '@tauri-apps/api/core';
import type { JobsRequest } from './saved-jobs-state';

export const savedJobsRequest: JobsRequest = async (action, value) => {
  if (isTauri()) return invoke('saved_jobs', { action, candidate: action === 'save' ? value : undefined, id: action === 'delete' ? value : undefined });
  const suffix = action === 'delete' ? `/${encodeURIComponent(value as string)}` : '';
  const response = await fetch(`/engine/jobs${suffix}`, {
    method: action === 'load' ? 'GET' : action === 'save' ? 'PUT' : 'DELETE',
    headers: { 'X-JobScout-Import': '1', ...(action === 'save' ? { 'Content-Type': 'application/json' } : {}) },
    body: action === 'save' ? JSON.stringify({ candidate: value, confirmed: true }) : undefined,
    cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15_000),
  });
  return response.json();
};
