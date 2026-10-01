import { arrangements, MAX_PUBLIC_SKILLS, regions, roles, seniorities, skills, validatePublicSearchCriteria, type PublicSearchCriteria } from '../lib/public-search-criteria';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useSearchPreview } from '../hooks/useSearchPreview';

export function SearchCriteria({ criteria, searchPreview, discovery, onChange }: {
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  discovery: ReturnType<typeof useDiscovery>;
  onChange: (criteria: PublicSearchCriteria) => void;
}) {
  const { preview, busy, reviewed, connected, error } = searchPreview;
  return <>
    <div className="page-heading"><div><p className="eyebrow">PUBLIC SEARCH CRITERIA</p><h1>What is your next role?</h1><p className="muted">Choose broad job preferences. Your personal story stays local.</p></div></div>
    <section className="settings-panel" aria-labelledby="criteria-title">
      <div className="settings-title"><div><h2 id="criteria-title">Start with the essentials.</h2><p>These choices are independent of your resume. Preparing a preview sends nothing online.</p></div></div>
      <form onSubmit={event => { event.preventDefault(); searchPreview.generate(validatePublicSearchCriteria(criteria)); }}>
        <div className="criteria-grid">
          {([['role', 'Role', roles], ['region', 'Search region (optional)', regions], ['seniority', 'Seniority', seniorities], ['arrangement', 'Work arrangement', arrangements]] as const).map(([key, label, catalog]) => <label className="criteria-field" key={key}>{label}<select value={criteria[key]} onChange={event => onChange(validatePublicSearchCriteria({ ...criteria, [key]: event.target.value }))}>{Object.entries(catalog).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>)}
        </div>
        <p className="criteria-help">Region describes where you want to search, never an address inferred from your profile. The initial catalog is limited; more categories can be added later.</p>
        <fieldset className="criteria-skills"><legend>Public skills (optional)</legend><p id="skills-help" className="criteria-help">Choose up to {MAX_PUBLIC_SKILLS}. Leave empty for a broader search.</p><div className="criteria-skill-grid">{Object.entries(skills).map(([id, label]) => {
          const skill = id as keyof typeof skills;
          const checked = criteria.skills.includes(skill);
          return <label key={id}><input type="checkbox" checked={checked} disabled={!checked && criteria.skills.length >= MAX_PUBLIC_SKILLS} aria-describedby="skills-help" onChange={() => onChange(validatePublicSearchCriteria({ ...criteria, skills: checked ? criteria.skills.filter(item => item !== skill) : [...criteria.skills, skill] }))} />{label}</label>;
        })}</div></fieldset>
        <div className="criteria-actions"><button className="button primary" type="submit" disabled={!connected || busy || Boolean(preview)}>{busy ? 'Preparing preview…' : preview ? 'Preview ready' : 'Prepare query preview'}</button>{busy && <button className="button secondary" type="button" onClick={searchPreview.cancel}>Cancel preview</button>}</div>
        {!connected && <p className="criteria-help" role="status">Connect the local workspace to prepare a preview. You can keep choosing criteria.</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </form>
    </section>
    <section className="settings-panel" aria-labelledby="criteria-review-title"><div className="settings-title"><div><h2 id="criteria-review-title">Your public choices</h2><p>Review the categories you have selected.</p></div></div>
      <dl className="privacy-details"><div><dt>Role</dt><dd>{roles[criteria.role]}</dd></div><div><dt>Region</dt><dd>{regions[criteria.region]}</dd></div><div><dt>Seniority</dt><dd>{seniorities[criteria.seniority]}</dd></div><div><dt>Arrangement</dt><dd>{arrangements[criteria.arrangement]}</dd></div><div><dt>Skills</dt><dd>{criteria.skills.length ? criteria.skills.map(skill => skills[skill]).join(', ') : 'No skill filter'}</dd></div></dl>
      <div className="query-preview" aria-labelledby="query-preview-title" aria-busy={busy}>
        <h3 id="query-preview-title">Engine-generated query</h3>
        {preview ? <><p className="query-text">{preview.query}</p><p className="criteria-help">{preview.provider === 'tavily' ? 'Tavily key saved · Ready for an explicit search' : 'No provider available in this preview · Online search unavailable'}</p>{preview.provider === 'tavily' && <div className="privacy-note"><p>Sending a Tavily search sends this query to <span className="provider-endpoint">https://api.tavily.com/search</span> using your saved API key. Tavily could see the query, your IP/network details, and the associated API account.</p><p>Your resume, profile, embeddings, match explanations, and application notes stay on this computer. A saved key does not establish a working connection or authorize a search.</p></div>}<button className="button secondary" type="button" disabled={reviewed || discovery.busy} onClick={searchPreview.review}>{reviewed ? 'Query reviewed' : 'I have reviewed this query'}</button><button className="button secondary" type="button" onClick={() => { searchPreview.invalidate(); discovery.invalidate(); }}>Clear preview</button></> : <p className="criteria-help">{busy ? 'Preparing the query on this computer…' : 'Prepare a preview to see the query. Changing criteria clears the previous preview.'}</p>}
        <p className="criteria-help" role="status">{reviewed ? 'Reviewed for this session. Changing criteria or opening Settings clears the query and requires a new review.' : preview ? 'Read the query, then confirm you have reviewed it. Nothing will be sent online.' : 'No query has been reviewed.'}</p>
      </div>
      {preview?.provider === 'tavily' && <div className="criteria-actions">
        <button className="button primary" type="button" disabled={!connected || !reviewed || !preview.dispatch_available || discovery.busy} onClick={() => { void discovery.send(criteria, preview, reviewed); searchPreview.consumeReview(); }}>{discovery.busy ? 'Searching Tavily…' : 'Send this query to Tavily'}</button>
        {discovery.busy && <button className="button secondary" type="button" onClick={discovery.invalidate}>Stop waiting</button>}
      </div>}
      <p className="privacy-note">Sending makes one basic search for up to ten candidates and may consume Tavily credits. Providers can see search terms, IP/network details, and API-account association. Stop waiting discards late results; a sent request may still finish and consume credits. Review again before each retry.</p>
      {discovery.busy && <p className="criteria-help" role="status">Waiting for Tavily. You can keep editing; changing criteria discards this search.</p>}
      {discovery.error && <p className="inline-error" role="alert">{discovery.error}</p>}
      <p className="criteria-help">Choices stay in this session, including when you switch pages. Opening Settings clears the preview and its review. Closing or reloading the app clears them. Reviewing alone sends nothing. The Send action authorizes one search.</p>
    </section>
    {discovery.result && <section className="settings-panel" aria-labelledby="discovery-results-title">
      <div className="settings-title"><div><h2 id="discovery-results-title">Search candidates</h2><p role="status">{discovery.result.candidates.length} results from Tavily for this query.</p></div></div>
      <p className="criteria-help">These are web search candidates, not verified vacancies or ranked matches. Preferences are search hints; availability and freshness have not been checked. Results stay in this session.</p>
      {discovery.result.candidates.length === 0 ? <p>No candidates returned. Adjust your public criteria, prepare a new preview, then review and send again.</p> : <ol className="discovery-results">{discovery.result.candidates.map(item => <li key={item.url}><article><h3>{item.title}</h3><p className="provider-endpoint">{item.url}</p><p className="discovery-snippet">{item.snippet || 'No snippet provided.'}</p></article></li>)}</ol>}
      <p className="criteria-help">URLs are selectable text. JobScout has not opened these websites or loaded their images. Visiting a result externally uses that website’s own data practices.</p>
      <button className="button secondary" type="button" onClick={discovery.invalidate}>Clear results</button>
    </section>}
  </>;
}
