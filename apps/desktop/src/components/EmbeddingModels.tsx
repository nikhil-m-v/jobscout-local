import { useState } from 'react';
import { embeddingCatalog, type EmbeddingModelId, type EmbeddingReference } from '../lib/embedding-catalog';
import { openEmbeddingReference } from '../lib/embedding-reference';

export function EmbeddingModels({ inSetup = false }: { inSetup?: boolean }) {
  const [linkError, setLinkError] = useState(false);
  const Heading = inSetup ? 'h3' : 'h2';
  const ModelHeading = inSetup ? 'h4' : 'h3';
  const titleId = `embedding-title-${inSetup ? 'setup' : 'settings'}`;
  const open = (id: EmbeddingModelId, reference: EmbeddingReference) => {
    setLinkError(false);
    void openEmbeddingReference(id, reference).catch(() => setLinkError(true));
  };
  return <section className={`${inSetup ? 'setup-storage' : 'settings-panel'} embedding-catalog`} aria-labelledby={titleId}>
    <Heading id={titleId}>Optional semantic matching</Heading>
    <p className="muted">Explore models for comparing the meaning of resume and job-text sections on your computer.</p>
    <p className="criteria-help">Preview only. Semantic matching, model selection and downloads are not available yet. No model is selected. You can import, review and save text, or search with reviewed job options, without a model.</p>
    <details>
      <summary>Review embedding models</summary>
      <p className="criteria-help">Reading this built-in catalog sends nothing online and does not inspect installed models. Reference buttons open your browser on Ollama’s website, which can see connection metadata. No resume or career records are attached.</p>
      <div className="embedding-model-grid">{embeddingCatalog.models.map(model => <article className="embedding-model-card" key={model.id}>
        <p className="eyebrow">{model.group}</p>
        <ModelHeading>{model.name}</ModelHeading>
        <p className="embedding-model-variant">{model.variant}</p>
        <p>{model.description}</p>
        <dl className="embedding-model-facts">
          <div><dt>Model download</dt><dd>About {model.approximateDownloadMB} MB</dd></div>
          <div><dt>Language</dt><dd>{model.language}</dd></div>
          <div><dt>License</dt><dd>{model.license}</dd></div>
        </dl>
        <p className="criteria-help">{model.context}</p>
        <div className="criteria-actions"><button type="button" className="text-action" onClick={() => open(model.id, 'model')} aria-label={`Model details for ${model.name} (opens browser)`}>Model details ↗</button><button type="button" className="text-action" onClick={() => open(model.id, 'license')} aria-label={`${model.license} license for ${model.name} (opens browser)`}>License ↗</button></div>
      </article>)}</div>
      <p className="criteria-help">Sizes are publisher estimates reviewed on {embeddingCatalog.reviewedOn}; they exclude Ollama, temporary files and runtime overhead. Tags and sizes may change. A later download must verify the exact package and total disk space first.</p>
      <p className="criteria-help">Download size is not a RAM requirement. CPU compatibility, memory use, speed and job-matching quality have not been measured in JobScout. A larger context window does not establish a better match.</p>
      {linkError && <p className="inline-error" role="alert">The reference could not be opened. You can continue without leaving JobScout.</p>}
    </details>
  </section>;
}
