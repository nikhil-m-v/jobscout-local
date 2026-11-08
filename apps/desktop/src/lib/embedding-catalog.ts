// Offline review metadata, not an acquisition manifest or an active model choice.
export const embeddingCatalog = {
  revision: '2026-11-08.1', reviewedOn: '2026-11-08', defaultModel: null,
  models: [
    {
      id: 'minilm-l6-v2', name: 'MiniLM L6 v2', variant: 'all-minilm:l6-v2',
      group: 'Smaller download', language: 'English', dimensions: 384,
      approximateDownloadMB: 46, license: 'Apache-2.0',
      description: 'A compact sentence and short-paragraph encoder. Longer text needs to be split into short sections.',
      context: '256-token configured window in the reviewed Ollama package.',
      modelUrl: 'https://ollama.com/library/all-minilm:l6-v2',
      licenseUrl: 'https://ollama.com/library/all-minilm:l6-v2/blobs/c71d239df917',
    },
    {
      id: 'nomic-embed-v1-5', name: 'Nomic Embed Text v1.5', variant: 'nomic-embed-text:v1.5',
      group: 'Longer context', language: 'English', dimensions: 768,
      approximateDownloadMB: 274, license: 'Apache-2.0',
      description: 'An encoder for longer text sections, with a larger download. Longer context does not guarantee better job matching.',
      context: '8,192-token configured window in the reviewed Ollama package.',
      modelUrl: 'https://ollama.com/library/nomic-embed-text:v1.5',
      licenseUrl: 'https://ollama.com/library/nomic-embed-text:v1.5/blobs/c71d239df917',
    },
  ],
} as const;

export type EmbeddingModelId = typeof embeddingCatalog.models[number]['id'];
export type EmbeddingReference = 'model' | 'license';

// Resolve only checked-in references, never a caller-supplied URL or model name.
export function embeddingReferenceUrl(id: EmbeddingModelId, reference: EmbeddingReference): string {
  const model = embeddingCatalog.models.find(entry => entry.id === id);
  if (!model || !['model', 'license'].includes(reference)) throw new Error('Unknown embedding reference.');
  return reference === 'model' ? model.modelUrl : model.licenseUrl;
}
