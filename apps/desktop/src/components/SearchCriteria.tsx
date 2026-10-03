import { useEffect, useRef, useState } from 'react';
import { arrangements, MAX_PUBLIC_SKILLS, regions, roles, seniorities, skills, validatePublicSearchCriteria, type PublicSearchCriteria } from '../lib/public-search-criteria';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useSearchPreview } from '../hooks/useSearchPreview';
import type { useAssistance } from '../hooks/useAssistance';
import { filterCandidates, initialResultFilters, type ResultFilters } from '../lib/result-filters';

type SearchProps = {
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  discovery: ReturnType<typeof useDiscovery>;
  onChange: (criteria: PublicSearchCriteria) => void;
};

export function SearchQuery({ criteria, searchPreview, discovery }: Omit<SearchProps, 'onChange'>) {
  const { preview, busy, connected, error } = searchPreview;
  const canSend = connected && !busy && !discovery.busy && preview?.provider === 'tavily' && preview.dispatch_available;
  function findJobs() {
    // This click confirms the exact displayed engine query; preparation never sends.
    if (!canSend) return;
    void discovery.send(criteria, preview, true);
    searchPreview.consumeReview();
  }
  return <>
    <div className="settings-title"><div><h2 id="query-preview-title">Engine-generated query</h2><p>Your public preferences, ready to search.</p></div></div>
    <label className="review-label query-label" htmlFor="public-query">Search query</label>
    <textarea id="public-query" className="query-text query-editor" rows={4} readOnly value={preview?.query ?? ''} placeholder={busy ? 'Preparing your query locally…' : 'Return to Job preferences to prepare a query.'} aria-describedby="query-guidance" spellCheck={false} />
    <p id="query-guidance" className="criteria-help">Change the dropdowns on the other side to update this query. Your resume stays on this computer.</p>
    {preview?.provider === 'tavily' ? <p className="criteria-help">Find jobs sends this query to Tavily using your saved API key and may consume Tavily credits. Tavily can see the query, IP/network details and API-account association.</p> : !busy && <p className="criteria-help" role="status">Set up online search below, then return to Job preferences and choose Find jobs to refresh the query.</p>}
    <div className="criteria-actions"><button className="button primary" type="button" disabled={!canSend} onClick={findJobs}>{discovery.busy ? 'Searching Tavily…' : 'Find jobs'}</button>{discovery.busy && <button className="button secondary" type="button" onClick={discovery.invalidate}>Stop waiting</button>}{busy && <button className="button secondary" type="button" onClick={searchPreview.cancel}>Cancel preview</button>}</div>
    {(busy || discovery.busy) && <p className="criteria-help" role="status">{busy ? 'Preparing locally. Nothing is sent online.' : 'Waiting for Tavily. Stop waiting cannot recall a sent request or its credits.'}</p>}
    {!connected && <p className="criteria-help" role="status">Connect the local workspace in Settings to search.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {discovery.error && <p className="inline-error" role="alert">{discovery.error}</p>}
    <details className="search-disclosure"><summary>Search & privacy details</summary><p className="criteria-help">The endpoint is <span className="provider-endpoint">https://api.tavily.com/search</span>. One click sends one basic search for up to ten candidates. Resume text, profile details, embeddings and private notes stay local. Results stay in this session. Stop waiting discards late replies, but a sent request may still consume credits.</p></details>
  </>;
}

export function SearchCriteria({ criteria, searchPreview, discovery, onChange, initialSide = 'preferences', assisted = false, requireRoleChoice = false }: SearchProps & { initialSide?: 'preferences' | 'query'; assisted?: boolean; requireRoleChoice?: boolean }) {
  const [side, setSide] = useState<'preferences' | 'query'>(initialSide);
  const [roleChosen, setRoleChosen] = useState(!requireRoleChoice);
  const panel = useRef<HTMLDivElement>(null);
  const previousSide = useRef(side);
  useEffect(() => {
    if (previousSide.current !== side) panel.current?.focus({ preventScroll: true });
    previousSide.current = side;
  }, [side]);
  function showQuery() {
    if (!roleChosen) return;
    setSide('query');
    if (!discovery.busy && (!searchPreview.preview || searchPreview.preview.provider === null)) searchPreview.generate(validatePublicSearchCriteria(criteria));
  }
  return <section id="job-options" className="settings-panel search-card" aria-label="Job options">
    <div className="search-card-switch" role="group" aria-label="Job options view"><button type="button" aria-pressed={side === 'preferences'} onClick={() => setSide('preferences')}>{assisted ? 'Edit public categories' : 'Job preferences'}</button><button type="button" aria-pressed={side === 'query'} disabled={searchPreview.busy || !roleChosen} onClick={showQuery}>Engine query</button></div>
    <div key={side} ref={panel} className="search-card-face" tabIndex={-1}>
      {side === 'query' ? <SearchQuery criteria={criteria} searchPreview={searchPreview} discovery={discovery} /> : <>
        <div className="settings-title"><div><h2 id="criteria-title">{assisted ? 'Correct your public search categories' : 'What jobs are you looking for?'}</h2><p>{assisted ? 'Review suggested categories before sending. Refine returned candidates with filters on Results.' : 'Choose public job preferences and optional skills for your search.'}</p></div></div>
        <form onSubmit={event => { event.preventDefault(); showQuery(); }}>
          <div className="criteria-grid">
            {([['role', 'Role', roles], ['region', 'Search region (optional)', regions], ['seniority', 'Seniority', seniorities], ['arrangement', 'Work arrangement', arrangements]] as const).map(([key, label, catalog]) => <label className="criteria-field" key={key}>{label}<select value={key === 'role' && !roleChosen ? '' : criteria[key]} onChange={event => { if (key === 'role') setRoleChosen(true); onChange(validatePublicSearchCriteria({ ...criteria, [key]: event.target.value })); }}>{key === 'role' && requireRoleChoice && <option value="" disabled>Choose a supported role</option>}{Object.entries(catalog).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>)}
          </div>
          <details className="optional-skills"><summary>Add skills (optional)</summary><fieldset className="criteria-skills"><legend>Public skills</legend><p id="skills-help" className="criteria-help">Choose up to {MAX_PUBLIC_SKILLS}.</p><div className="criteria-skill-grid">{Object.entries(skills).map(([id, label]) => {
            const skill = id as keyof typeof skills;
            const checked = criteria.skills.includes(skill);
            return <label key={id}><input type="checkbox" checked={checked} disabled={!checked && criteria.skills.length >= MAX_PUBLIC_SKILLS} aria-describedby="skills-help" onChange={() => onChange(validatePublicSearchCriteria({ ...criteria, skills: checked ? criteria.skills.filter(item => item !== skill) : [...criteria.skills, skill] }))} />{label}</label>;
          })}</div></fieldset></details>
          <div className="criteria-actions"><button className="button primary" type="submit" disabled={!roleChosen || !searchPreview.connected || searchPreview.busy || discovery.busy}>Find jobs</button></div>
          <p className="criteria-help">Flip to your query before sending anything online. Region is a search preference, never an inferred address.</p>
          {!searchPreview.connected && <p className="criteria-help" role="status">Connect the local workspace in Settings. Your choices are kept.</p>}
        </form>
      </>}
    </div>
  </section>;
}

export function SearchResults({ discovery, analysis, assisted = false, onRetryAnalysis }: { discovery: ReturnType<typeof useDiscovery>; analysis?: ReturnType<typeof useAssistance>; assisted?: boolean; onRetryAnalysis?: () => void }) {
  const [filters, setFilters] = useState<ResultFilters>(initialResultFilters);
  useEffect(() => setFilters(initialResultFilters), [discovery.result]);
  const local = analysis?.result;
  const visible = filterCandidates(discovery.result?.candidates ?? [], local?.matches ?? [], assisted, filters);
  return <>
    <p className="criteria-help">Return to Job options to adjust your choices and search again.</p>
    {discovery.result ? <section className="settings-panel" aria-labelledby="discovery-results-title">
      <div className="settings-title"><div><h2 id="discovery-results-title">Search candidates</h2><p role="status">{discovery.result.candidates.length} unique {discovery.result.candidates.length === 1 ? 'candidate' : 'candidates'} from Tavily.{discovery.result.duplicates_removed > 0 && ` ${discovery.result.duplicates_removed} duplicate ${discovery.result.duplicates_removed === 1 ? 'link' : 'links'} removed.`}</p></div></div>
      <p className="criteria-help">Retrieved <time dateTime={discovery.result.retrieved_at}>{new Date(discovery.result.retrieved_at).toLocaleString()}</time>. This is the search retrieval time, not the listing date.</p>
      <p className="query-text">{discovery.result.query}</p>
      <p className="criteria-help">These are web search candidates, not verified vacancies or ranked matches. Preferences are search hints; availability and freshness have not been checked. Results stay in this session.</p>
      {analysis?.busy && <p className="criteria-help" role="status">Checking snippet categories locally. Candidates remain available.</p>}
      {analysis?.error && <><p className="inline-error" role="alert">{analysis.error} Original provider order is shown.</p>{onRetryAnalysis && <button className="button secondary" type="button" onClick={onRetryAnalysis}>Retry local analysis</button>}</>}
      {local && <>
        <details className="optional-skills"><summary>Filter results locally</summary>
          <div className="criteria-grid">{([['role', 'Role mentioned', { any: 'Any role', ...roles }], ['region', 'Region mentioned', regions], ['arrangement', 'Work arrangement mentioned', arrangements], ['seniority', 'Seniority mentioned', seniorities], ['skill', 'Skill mentioned', { any: 'Any skill', ...skills }]] as const).map(([key, label, catalog]) => <label className="criteria-field" key={key}>{label}<select value={filters[key]} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>{Object.entries(catalog).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>)}</div>
          <label className="criteria-help"><input type="checkbox" checked={filters.keepUnknown} onChange={event => setFilters({ ...filters, keepUnknown: event.target.checked })} /> Include candidates with missing category details</label>
          <p className="criteria-help">Filters use title and snippet mentions, not verified job requirements or locations. They send nothing online and only refine this returned pool. Missing details are kept by default.</p>
          <button className="button secondary" type="button" onClick={() => setFilters(initialResultFilters)}>Reset filters</button>
        </details>
        <p className="criteria-help" role="status">Showing {visible.length} of {discovery.result.candidates.length} candidates.{assisted ? ' Ordered by the number of skill categories mentioned in both your reviewed resume and each candidate. Equal counts retain provider order; this is not a fit score.' : ' Provider order is preserved.'}</p>
      </>}
      {discovery.result.candidates.length === 0 ? <p>No candidates returned. Adjust your public criteria, prepare a new preview, then review and send again.</p> : visible.length === 0 ? <p role="status">No candidates match these local filters. Reset filters or review a new search.</p> : <ol className="discovery-results">{visible.map(({ candidate: item, shared }) => <li key={item.url}><article><h3>{item.title}</h3><p className="criteria-help">Source: {new URL(item.url).hostname}</p>{assisted && local && <p className="criteria-help">Shared skill mentions: {shared.map(id => skills[id]).join(', ') || 'None detected in this snippet.'}</p>}<p className="provider-endpoint">{item.url}</p><p className="discovery-snippet">{item.snippet || 'No snippet provided.'}</p></article></li>)}</ol>}
      <p className="criteria-help">Known tracking parameters and duplicate links are removed locally. Different links may still refer to the same job. URLs are selectable text. JobScout has not opened these websites or loaded their images. Visiting a result externally uses that website’s own data practices.</p>
      <button className="button secondary" type="button" onClick={discovery.invalidate}>Clear results</button>
    </section> : <section className="settings-panel"><h2>Search again when ready.</h2><p className="criteria-help">Your previous results were cleared. Return to Job options, prepare a query, review it and send a new search.</p></section>}
  </>;
}
