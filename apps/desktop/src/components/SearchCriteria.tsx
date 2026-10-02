import { useEffect, useRef } from 'react';
import { arrangements, MAX_PUBLIC_SKILLS, regions, roles, seniorities, skills, validatePublicSearchCriteria, type PublicSearchCriteria } from '../lib/public-search-criteria';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useSearchPreview } from '../hooks/useSearchPreview';

export function SearchCriteria({ criteria, searchPreview, discovery, onChange }: {
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  discovery: ReturnType<typeof useDiscovery>;
  onChange: (criteria: PublicSearchCriteria) => void;
}) {
  const { preview, busy, reviewed, connected, error } = searchPreview;

  const queryPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (preview) { queryPanel.current?.scrollIntoView({ block: 'start' }); queryPanel.current?.focus({ preventScroll: true }); } }, [preview]);

  return <>
    <section className="settings-panel" aria-labelledby="criteria-title">
      <div className="settings-title"><div><h2 id="criteria-title">What jobs are you looking for?</h2><p>Choose a role and where you want to work. Resume matching is not available yet; these preferences guide the search.</p></div></div>
      <form onSubmit={event => { event.preventDefault(); searchPreview.generate(validatePublicSearchCriteria(criteria)); }}>
        <div className="criteria-grid">
          {([['role', 'Role', roles], ['region', 'Search region (optional)', regions], ['seniority', 'Seniority', seniorities], ['arrangement', 'Work arrangement', arrangements]] as const).map(([key, label, catalog]) => <label className="criteria-field" key={key}>{label}<select value={criteria[key]} onChange={event => onChange(validatePublicSearchCriteria({ ...criteria, [key]: event.target.value }))}>{Object.entries(catalog).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>)}
        </div>
        <p className="criteria-help">Region describes where you want to search, never an address inferred from your profile. The initial catalog is limited; more categories can be added later.</p>
        <details className="optional-skills"><summary>Add skills (optional)</summary><fieldset className="criteria-skills"><legend>Public skills (optional)</legend><p id="skills-help" className="criteria-help">Choose up to {MAX_PUBLIC_SKILLS}. Leave empty for a broader search.</p><div className="criteria-skill-grid">{Object.entries(skills).map(([id, label]) => {
          const skill = id as keyof typeof skills;
          const checked = criteria.skills.includes(skill);
          return <label key={id}><input type="checkbox" checked={checked} disabled={!checked && criteria.skills.length >= MAX_PUBLIC_SKILLS} aria-describedby="skills-help" onChange={() => onChange(validatePublicSearchCriteria({ ...criteria, skills: checked ? criteria.skills.filter(item => item !== skill) : [...criteria.skills, skill] }))} />{label}</label>;
        })}</div></fieldset></details>
        <div className="criteria-actions"><button className="button primary" type="submit" disabled={!connected || busy || Boolean(preview)}>{busy ? 'Preparing preview…' : preview ? 'Preview ready' : 'Continue'}</button>{busy && <button className="button secondary" type="button" onClick={searchPreview.cancel}>Cancel preview</button>}</div>
        {!connected && <p className="criteria-help" role="status">Connect the local workspace to prepare a preview. You can keep choosing criteria.</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </form>
    </section>
    <section className="settings-panel" aria-labelledby="criteria-review-title"><div className="settings-title"><div><h2 id="criteria-review-title">Review and find jobs</h2><p>Only the public query below goes to the search provider.</p></div></div>
      <div ref={queryPanel} tabIndex={-1} className="query-preview" aria-labelledby="query-preview-title" aria-busy={busy}>
        <h3 id="query-preview-title">Engine-generated query</h3>
        {preview ? <><p className="query-text">{preview.query}</p><p className="criteria-help">{preview.provider === 'tavily' ? 'Tavily key saved · Ready for an explicit search' : 'Set up online search below, then clear this preview and continue again'}</p>{preview.provider === 'tavily' && <div className="privacy-note"><p>Sending a Tavily search sends this query to <span className="provider-endpoint">https://api.tavily.com/search</span> using your saved API key. Tavily could see the query, your IP/network details, and the associated API account.</p><p>Your resume stays on this computer. Searching may use Tavily credits.</p></div>}<button className="button secondary" type="button" disabled={reviewed || discovery.busy} onClick={searchPreview.review}>{reviewed ? 'Query reviewed' : 'These search terms look right'}</button><button className="button secondary" type="button" onClick={() => { searchPreview.invalidate(); discovery.invalidate(); }}>Clear preview</button></> : <p className="criteria-help">{busy ? 'Preparing the query on this computer…' : 'Prepare a preview to see the query. Changing criteria clears the previous preview.'}</p>}
        <p className="criteria-help" role="status">{reviewed ? 'Reviewed for this session. Changing criteria or opening Settings clears the query and requires a new review.' : preview ? 'Read the query, then confirm you have reviewed it. Nothing will be sent online.' : 'No query has been reviewed.'}</p>
      </div>
      {preview?.provider === 'tavily' && <div className="criteria-actions">
        <button className="button primary" type="button" disabled={!connected || !reviewed || !preview.dispatch_available || discovery.busy} onClick={() => { void discovery.send(criteria, preview, reviewed); searchPreview.consumeReview(); }}>{discovery.busy ? 'Searching Tavily…' : 'Find jobs'}</button>
        {discovery.busy && <button className="button secondary" type="button" onClick={discovery.invalidate}>Stop waiting</button>}
      </div>}
      <p className="privacy-note">Sending makes one basic search for up to ten candidates and may consume Tavily credits. Providers can see search terms, IP/network details, and API-account association. Stop waiting discards late results; a sent request may still finish and consume credits. Review again before each retry.</p>
      {discovery.busy && <p className="criteria-help" role="status">Waiting for Tavily. You can keep editing; changing criteria discards this search.</p>}
      {discovery.error && <p className="inline-error" role="alert">{discovery.error}</p>}
      <p className="criteria-help">Your preferences and results stay for this session. Closing the app clears them.</p>
    </section>
  </>;
}

export function SearchResults({ discovery }: { discovery: ReturnType<typeof useDiscovery> }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR SEARCH</p><h1>Results, ready to explore.</h1><p className="muted">Return to Job options to adjust your choices and search again.</p></div></div>
    {discovery.result ? <section className="settings-panel" aria-labelledby="discovery-results-title">
      <div className="settings-title"><div><h2 id="discovery-results-title">Search candidates</h2><p role="status">{discovery.result.candidates.length} results from Tavily for this query.</p></div></div>
      <p className="query-text">{discovery.result.query}</p>
      <p className="criteria-help">These are web search candidates, not verified vacancies or ranked matches. Preferences are search hints; availability and freshness have not been checked. Results stay in this session.</p>
      {discovery.result.candidates.length === 0 ? <p>No candidates returned. Adjust your public criteria, prepare a new preview, then review and send again.</p> : <ol className="discovery-results">{discovery.result.candidates.map(item => <li key={item.url}><article><h3>{item.title}</h3><p className="provider-endpoint">{item.url}</p><p className="discovery-snippet">{item.snippet || 'No snippet provided.'}</p></article></li>)}</ol>}
      <p className="criteria-help">URLs are selectable text. JobScout has not opened these websites or loaded their images. Visiting a result externally uses that website’s own data practices.</p>
      <button className="button secondary" type="button" onClick={discovery.invalidate}>Clear results</button>
    </section> : <section className="settings-panel"><h2>Search again when ready.</h2><p className="criteria-help">Your previous results were cleared. Return to Job options, prepare a query, review it and send a new search.</p></section>}
  </>;
}
