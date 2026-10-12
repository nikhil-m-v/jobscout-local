import { useEffect, useRef } from 'react';
import type { useDataControls } from '../hooks/useDataControls';

export function DataControls({ controls, workBusy }: { controls: ReturnType<typeof useDataControls>; workBusy: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null), reviewButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => { if (controls.phase === 'done' || controls.phase === 'unknown') heading.current?.focus(); }, [controls.phase]);
  const busy = controls.phase === 'loading' || controls.phase === 'deleting';
  return <section className="settings-panel" aria-labelledby="data-title">
    <div className="settings-title"><div><h2 id="data-title" ref={heading} tabIndex={-1}>Your local data</h2><p>Choose what you keep on this computer.</p></div></div>
    <p className="criteria-help">JobScout keeps the profile text you save, saved candidate snapshots, application stages and private notes in its local database. Current resume drafts, search results and local assessments are temporary. No query history, embeddings or model indexes are stored by the current version.</p>
    <p className="criteria-help">Delete local career data removes all saved profile text, candidates, stages and notes together. Confirmation also clears current drafts, results and reviewed queries, even if database deletion cannot be confirmed. Finish or cancel active work first.</p>
    <p className="criteria-help">Your original resume files, provider key and appearance choices are kept. Remove the key separately in Online discovery. Uninstall currently retains local data and keys; shared Ollama runtimes and models are kept. Local data is not automatically encrypted. Deletion cannot erase backups, provider records or guarantee secure disk erasure.</p>
    {controls.error && <p className="inline-error" role="alert">{controls.error}</p>}
    {controls.notice && <p className="criteria-help" role="status">{controls.notice}</p>}
    {busy && <p role="status">{controls.phase === 'loading' ? 'Reviewing local data…' : 'Deleting local career records…'}</p>}
    {!controls.connected && <p className="criteria-help">Connect the workspace to review or delete saved data.</p>}
    {workBusy && <p className="criteria-help">Finish or cancel current import, analysis or storage work before deleting data.</p>}
    {controls.phase === 'review' && controls.review ? <div className="saved-remove" role="group" aria-label="Confirm local data deletion">
      <p>{controls.review.profile_present ? '1 saved profile' : 'No saved profile'} · {controls.review.saved_jobs} saved {controls.review.saved_jobs === 1 ? 'candidate' : 'candidates'} · {controls.review.jobs_with_notes} with private notes.</p>
      <p>This cannot be undone in JobScout. Delete these saved records and clear current drafts and results?</p>
      <div className="criteria-actions"><button className="button secondary" type="button" autoFocus onClick={() => { returnFocus.current = true; controls.cancel(); }}>Keep my data</button><button className="button secondary" type="button" disabled={workBusy || !controls.connected} onClick={() => { void controls.remove(); }}>Confirm deletion</button></div>
    </div> : <button ref={button => { reviewButton.current = button; if (button && returnFocus.current) { button.focus(); returnFocus.current = false; } }} className="button secondary" type="button" disabled={!controls.connected || workBusy || busy} onClick={() => void controls.reviewData()}>{controls.phase === 'unknown' ? 'Review remaining local data' : 'Review local data to delete'}</button>}
    <p className="criteria-help">To remove one item instead, use Delete saved profile in Resume or Remove saved candidate in Saved jobs. Deleting a profile alone keeps saved jobs and notes; deleting a candidate includes its stage and notes.</p>
  </section>;
}
