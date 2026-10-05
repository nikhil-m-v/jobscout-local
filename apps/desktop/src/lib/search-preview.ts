import { invoke, isTauri } from '@tauri-apps/api/core';
import { validatePublicSearchCriteria, type PublicSearchCriteria } from './public-search-criteria';
import { validateSearchPreview, type SearchPreview } from './search-preview-state';

export async function requestSearchPreview(criteria: PublicSearchCriteria, signal: AbortSignal): Promise<SearchPreview> {
  const snapshot = validatePublicSearchCriteria(criteria);
  const data: unknown = isTauri() ? await invoke('search_plan', { criteria: snapshot }) :
    await fetch('/engine/search/plan', {
      method: 'POST', headers: { 'X-JobScout-Import': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot), cache: 'no-store', credentials: 'omit', redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    }).then(response => { if (!response.ok) throw new Error(); return response.json(); });
  return validateSearchPreview(data);
}
