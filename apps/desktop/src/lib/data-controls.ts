import { invoke, isTauri } from '@tauri-apps/api/core';
import type { DataRequest } from './data-controls-state';

export const dataRequest: DataRequest = async (action, token) => {
  if (isTauri()) return invoke('career_data', { action, reviewToken: token });
  return fetch('/engine/data', {
    method: action === 'review' ? 'GET' : 'DELETE',
    headers: { 'X-JobScout-Import': '1', ...(action === 'delete' ? { 'Content-Type': 'application/json' } : {}) },
    body: action === 'delete' ? JSON.stringify({ review_token: token, confirmed: true }) : undefined,
    cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15_000),
  }).then(response => response.json());
};
