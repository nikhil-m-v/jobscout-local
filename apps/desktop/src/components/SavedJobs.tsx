import { useRef, useState } from 'react';
import type { useSavedJobs } from '../hooks/useSavedJobs';
import { inspectCandidate } from '../lib/candidate-pool';
import { MAX_SAVED_JOBS } from '../lib/saved-jobs-state';
import { candidateRequirements, workRequirementLabels } from '../lib/work-requirements';

export function SavedJobsStatus({ saved }: { saved: ReturnType<typeof useSavedJobs> }) {
  return <div className="saved-jobs-status" aria-live="polite">
    {saved.busy && <p className="criteria-help" role="status">Updating saved jobs locally…</p>}
    {saved.notice && <p className="criteria-help" role="status">{saved.notice}</p>}
    {saved.error && <p className="inline-error" role="alert">{saved.error}</p>}
    {!saved.connected && <p className="criteria-help">Connect the local workspace in Settings to load or change saved jobs.</p>}
    {saved.connected && !saved.busy && !saved.ready && <button className="button secondary" type="button" onClick={() => void saved.reload()}>Reload saved jobs</button>}
  </div>;
}
export function SavedJobs({ saved }: { saved: ReturnType<typeof useSavedJobs> }) {
  const [removing, setRemoving] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string | null>(null);
  return <>
    <div className="page-heading search-intro"><div><h1 ref={heading} tabIndex={-1}>Saved jobs</h1><p className="muted">Candidates you chose to keep on this computer.</p></div></div>
    <section className="settings-panel" aria-label="Saved candidates">
      <p className="criteria-help">Saved copies are snapshots of returned text. Availability, suitability and the full posting have not been verified; listings can change or close. Saving sends nothing online.</p>
      <p className="criteria-help">Up to {MAX_SAVED_JOBS} candidates can be kept. Same-link saves keep the first copy; different links remain separate. Clearing search results or deleting your profile keeps saved jobs. Remove a saved item here to delete its local copy.</p>
      <SavedJobsStatus saved={saved} />
      <div className="criteria-actions"><p className="criteria-help">{saved.jobs.length} saved {saved.jobs.length === 1 ? 'candidate' : 'candidates'}{!saved.ready && ' (last loaded view)'}.</p><button className="button secondary" type="button" disabled={!saved.connected || saved.busy} onClick={() => void saved.reload()}>Refresh saved jobs</button></div>
      {saved.ready && saved.jobs.length === 0 && <p>Keep a candidate with Save candidate on Results. It will be here when you return.</p>}
      <ol className="discovery-results">{saved.jobs.map(job => {
        const source = inspectCandidate(job);
        const requirements = candidateRequirements(job);
        return <li key={job.id}><article><h2>{job.title}</h2>
          <p className="criteria-help">Source: {source.host} · Tavily{source.source && ` · Requested source: ${source.source}`}</p>
          {source.scope === 'outside' && <p className="criteria-help">Returned host is outside the requested source scope. Kept for review.</p>}
          <p className="criteria-help">Retrieved <time dateTime={job.retrieved_at}>{new Date(job.retrieved_at).toLocaleString()}</time>; saved <time dateTime={job.saved_at}>{new Date(job.saved_at).toLocaleString()}</time>. These are not listing dates.</p>
          <p className="provider-endpoint">{job.url}</p><p className="discovery-snippet">{job.snippet || 'No snippet provided.'}</p>
          {requirements.length > 0 && <details className="search-disclosure"><summary>Work requirements to review</summary><p className="criteria-help">Quoted from the saved text; check whether they apply to you. The full posting has not been verified.</p><ul>{requirements.map((entry, index) => <li key={index}>{workRequirementLabels[entry.kind]} in {entry.source}: <q>{entry.phrase}</q></li>)}</ul></details>}
          {removing === job.id ? <div className="saved-remove"><p>Remove this saved copy from this computer?</p><div className="criteria-actions"><button className="button secondary" type="button" autoFocus disabled={saved.busy} onClick={() => { returnFocus.current = job.id; setRemoving(null); }}>Keep candidate</button><button className="button secondary" type="button" disabled={!saved.ready || !saved.connected || saved.busy} onClick={() => { void saved.remove(job.id).then(removed => { if (removed) { setRemoving(null); heading.current?.focus(); } }); }}>Confirm removal</button></div></div> : <button ref={button => { if (button && returnFocus.current === job.id) { button.focus(); returnFocus.current = null; } }} className="button secondary" type="button" disabled={!saved.ready || !saved.connected || saved.busy} onClick={() => setRemoving(job.id)} aria-label={`Remove saved candidate: ${job.title}`}>Remove saved candidate</button>}
        </article></li>;
      })}</ol>
      <p className="criteria-help">URLs are selectable text. JobScout has not opened these sites or loaded their images. Visiting externally uses that website’s own data practices. Local data is not automatically encrypted; removal is not a promise of secure disk erasure.</p>
    </section>
  </>;
}
