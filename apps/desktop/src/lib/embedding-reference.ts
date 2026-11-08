import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { embeddingReferenceUrl, type EmbeddingModelId, type EmbeddingReference } from './embedding-catalog';

export async function openEmbeddingReference(id: EmbeddingModelId, reference: EmbeddingReference): Promise<void> {
  const url = embeddingReferenceUrl(id, reference);
  if (isTauri()) await openUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
