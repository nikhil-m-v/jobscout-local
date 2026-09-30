import { arrangements, MAX_PUBLIC_SKILLS, regions, roles, seniorities, skills, validatePublicSearchCriteria, type PublicSearchCriteria } from '../lib/public-search-criteria';
import type { useSearchPreview } from '../hooks/useSearchPreview';

export function SearchCriteria({ criteria, searchPreview, onChange }: {
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  onChange: (criteria: PublicSearchCriteria) => void;
}) {
  const { preview, busy, reviewed, connected, error } = searchPreview;
  return <>
    <div className="page-heading"><div><p className="eyebrow">PUBLIC SEARCH CRITERIA</p><h1>What is your next role?</h1><p className="muted">Choose broad job preferences. Your personal story stays local.</p></div></div>
    <section className="settings-panel" aria-labelledby="criteria-title">
      <div className="settings-title"><div><h2 id="criteria-title">Start with the essentials.</h2><p>These choices are independent of your resume. Nothing is sent online.</p></div></div>
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
        {preview ? <><p className="query-text">{preview.query}</p><p className="criteria-help">Provider: none configured · Online search unavailable</p><button className="button secondary" type="button" disabled={reviewed} onClick={searchPreview.review}>{reviewed ? 'Query reviewed' : 'I have reviewed this query'}</button></> : <p className="criteria-help">{busy ? 'Preparing the query on this computer…' : 'Prepare a preview to see the query. Changing criteria clears the previous preview.'}</p>}
        <p className="criteria-help" role="status">{reviewed ? 'Reviewed for this session. Changing any choice clears the query and requires a new review.' : preview ? 'Read the query, then confirm you have reviewed it. Nothing will be sent online.' : 'No query has been reviewed.'}</p>
      </div>
      <p className="privacy-note">Online search is not available yet. This preview is built locally. Before sending a future search, JobScout will show the provider and ask you to confirm. Providers can see search terms, IP/network details, and API-account association.</p>
      <p className="criteria-help">Choices stay in this session, including when you switch pages. Closing or reloading the app clears them. Reviewing here does not authorize a future network request.</p>
    </section>
  </>;
}
