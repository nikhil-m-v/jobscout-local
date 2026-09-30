import { invoke, isTauri } from '@tauri-apps/api/core';
import { MAX_REVIEW_CHARACTERS } from './resume-import';

export interface SavedProfile { text: string; saved_at: string }
export async function profileRequest(action: 'load' | 'save' | 'delete', text?: string): Promise<SavedProfile | null> {
  try {
    const data: unknown = isTauri() ? await invoke('profile_record', { action, text, reviewed: action === 'save' }) :
      await fetch('/engine/profile', {
        method: action === 'load' ? 'GET' : action === 'save' ? 'PUT' : 'DELETE',
        headers: { 'X-JobScout-Import': '1', ...(action === 'save' ? { 'Content-Type': 'application/json' } : {}) },
        body: action === 'save' ? JSON.stringify({ text, reviewed: true }) : undefined,
        cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15_000),
      }).then(response => response.json());
    if (!data || typeof data !== 'object') throw new Error();
    const result = data as Record<string, unknown>;
    if ('error' in result) throw new Error();
    if (action === 'delete') {
      if (result.deleted !== true) throw new Error();
      return null;
    }
    if (result.profile === null && action === 'load') return null;
    const profile = result.profile as SavedProfile | undefined;
    if (!profile || typeof profile.text !== 'string' || profile.text.length > MAX_REVIEW_CHARACTERS ||
        typeof profile.saved_at !== 'string' || !Number.isFinite(Date.parse(profile.saved_at))) throw new Error();
    return profile;
  } catch {
    // Never display raw transport errors or returned private content.
    throw new Error(action === 'load' ? 'Saved profile could not be loaded. Check the workspace, then try again.' :
      action === 'save' ? 'Saving could not be confirmed. Your draft is kept. Check the workspace and reload the saved profile before retrying.' :
      'Deletion could not be confirmed. Check the workspace and reload the saved profile before retrying.');
  }
}
