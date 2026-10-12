import { useRef, useState } from 'react';
import type { useSavedJobs } from '../hooks/useSavedJobs';
import { inspectCandidate } from '../lib/candidate-pool';
import { MAX_SAVED_JOBS, MAX_JOB_NOTES, jobStages, type JobTracking } from '../lib/saved-jobs-state';
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
      <p className="criteria-help">Record your progress with Saved, Applied or Interview and private notes. Changing a stage does not apply, contact an employer or send anything online.</p>
      <p className="criteria-help">Up to {MAX_SAVED_JOBS} candidates can be kept. Same-link saves keep the first copy; different links remain separate. Clearing search results or deleting your profile keeps saved jobs. Remove a saved item here to delete its local copy.</p>
      <SavedJobsStatus saved={saved} />
      <div className="criteria-actions"><p className="criteria-help">{saved.jobs.length} saved {saved.jobs.length === 1 ? 'candidate' : 'candidates'}{!saved.ready && ' (last loaded view)'}.</p><button className="button secondary" type="button" disabled={!saved.connected || saved.busy} onClick={() => void saved.reload()}>Refresh saved jobs</button></div>
      {saved.ready && saved.jobs.length === 0 && <p>Keep a candidate with Save candidate on Results. It will be here when you return.</p>}
      <ol className="discovery-results">{saved.jobs.map(job => {
        const source = inspectCandidate(job);
        const requirements = candidateRequirements(job);
        const draft = saved.drafts[job.id];
        const locked = !saved.ready || !saved.connected || saved.busy;
        const stale = draft && draft.revision !== job.revision;
        return <li key={job.id}><article><h2>{job.title}</h2>
          <p className="criteria-help">Stage: <strong>{jobStages[job.stage]}</strong> · Recorded by you</p>
          <p className="criteria-help">Source: {source.host} · Tavily{source.source && ` · Requested source: ${source.source}`}</p>
          {source.scope === 'outside' && <p className="criteria-help">Returned host is outside the requested source scope. Kept for review.</p>}
          <p className="criteria-help">Retrieved <time dateTime={job.retrieved_at}>{new Date(job.retrieved_at).toLocaleString()}</time>; saved <time dateTime={job.saved_at}>{new Date(job.saved_at).toLocaleString()}</time>. These are not listing dates.</p>
          <p className="provider-endpoint">{job.url}</p><p className="discovery-snippet">{job.snippet || 'No snippet provided.'}</p>
          {requirements.length > 0 && <details className="search-disclosure"><summary>Work requirements to review</summary><p className="criteria-help">Quoted from the saved text; check whether they apply to you. The full posting has not been verified.</p><ul>{requirements.map((entry, index) => <li key={index}>{workRequirementLabels[entry.kind]} in {entry.source}: <q>{entry.phrase}</q></li>)}</ul></details>}
          {draft ? <form className="job-tracking-editor" aria-label={`Edit tracking: ${job.title}`} onSubmit={event => { event.preventDefault(); if (!locked && !stale) void saved.update({ id: job.id, ...draft }).then(updated => { if (updated) { saved.clearDraft(job.id); heading.current?.focus(); } }); }}>
            <label htmlFor={`stage-${job.id}`}>Application stage</label>
            <select id={`stage-${job.id}`} disabled={saved.busy} value={draft.stage} onChange={event => saved.setDraft(job.id, { ...draft, stage: event.target.value as JobTracking['stage'] })}>{Object.entries(jobStages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <label htmlFor={`notes-${job.id}`}>Private notes</label>
            <textarea id={`notes-${job.id}`} autoFocus disabled={saved.busy} value={draft.notes} maxLength={MAX_JOB_NOTES} rows={5} aria-describedby={`notes-help-${job.id}`} onChange={event => saved.setDraft(job.id, { ...draft, notes: event.target.value })} />
            <p id={`notes-help-${job.id}`} className="criteria-help">{draft.notes.length} / {MAX_JOB_NOTES} characters. Save changes to keep them after restarting. Drafts stay while you navigate, but disappear when you close or reload the app.</p>
            {stale && <p className="inline-error" role="alert">The stored copy changed. Review it below, then discard this draft before editing again.</p>}
            {stale && <p className="discovery-snippet">Latest stage: {jobStages[job.stage]}. Latest notes: {job.notes || 'No notes yet.'}</p>}
            <div className="criteria-actions"><button className="button primary" type="submit" disabled={locked || !!stale}>Save changes</button><button className="button secondary" type="button" disabled={saved.busy} onClick={() => { saved.clearDraft(job.id); heading.current?.focus(); }}>{stale ? 'Discard draft and use latest' : 'Discard draft'}</button></div>
          </form> : <div className="job-tracking"><p className="discovery-snippet">{job.notes || 'No private notes yet.'}</p><button className="button secondary" type="button" disabled={locked} onClick={() => saved.setDraft(job.id, { stage: job.stage, notes: job.notes, revision: job.revision })} aria-label={`Edit stage and notes: ${job.title}`}>Edit stage and notes</button></div>}
          {removing === job.id ? <div className="saved-remove"><p>Remove this saved copy, its stage, notes and any draft from this computer?</p><div className="criteria-actions"><button className="button secondary" type="button" autoFocus disabled={saved.busy} onClick={() => { returnFocus.current = job.id; setRemoving(null); }}>Keep candidate</button><button className="button secondary" type="button" disabled={locked} onClick={() => { void saved.remove(job.id).then(removed => { if (removed) { setRemoving(null); heading.current?.focus(); } }); }}>Confirm removal</button></div></div> : <button ref={button => { if (button && returnFocus.current === job.id) { button.focus(); returnFocus.current = null; } }} className="button secondary" type="button" disabled={locked} onClick={() => setRemoving(job.id)} aria-label={`Remove saved candidate: ${job.title}`}>Remove saved candidate</button>}
        </article></li>;
      })}</ol>
      <p className="criteria-help">URLs are selectable text. JobScout has not opened these sites or loaded their images. Visiting externally uses that website’s own data practices. Local data is not automatically encrypted; removal is not a promise of secure disk erasure.</p>
    </section>
  </>;
}
