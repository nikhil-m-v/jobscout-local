import { invoke, isTauri } from '@tauri-apps/api/core';
import { validateLocation, type LocationAction } from './setup-location.ts';

export async function locationRequest(action: LocationAction, body: Record<string, unknown> | undefined, signal: AbortSignal) {
  const value: unknown = isTauri() ? await invoke('setup_location', { action, body }) : await fetch(
    `/engine/setup/location${action === 'status' ? '' : `/${action}`}`, {
      method: action === 'status' ? 'GET' : 'POST',
      headers: { 'X-JobScout-Import': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit', redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(action === 'apply' ? 45000 : 8000)]),
    }).then(response => response.json());
  return validateLocation(value, action === 'review');
}
