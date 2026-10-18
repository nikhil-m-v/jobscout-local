import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createLocationChange, type LocationReview, type LocationStatus } from '../lib/setup-location';
import { locationRequest } from '../lib/setup-location-request';
import { describeSpace } from '../lib/setup-storage';

export function LocationDetails({ current, review }: { current: LocationStatus; review?: LocationReview | null }) {
  return <>
    <dl className="setup-storage-details"><div><dt>Active folder</dt><dd>{current.folder}</dd></div>
      {review && <><div><dt>New folder</dt><dd>{review.destination}</dd></div><div><dt>Database to copy</dt><dd>{review.database_bytes < 1024 ** 2 ? 'Less than 1 MiB' : `${(review.database_bytes / 1024 ** 2).toFixed(1)} MiB`}</dd></div><div><dt>Free drive space</dt><dd>{describeSpace(review.free_bytes)}</dd></div></>}
    </dl>
    {current.retained_folders.length > 0 && <details className="location-retained"><summary>Previous folders retained ({current.retained_folders.length})</summary><ul>{current.retained_folders.map(folder => <li key={folder}>{folder}</li>)}</ul><p className="criteria-help">These copies may contain older profile text, jobs and notes. Later saves and deletion affect only the active folder. These copies are not automatically updated or erased.</p></details>}
  </>;
}

export function SetupLocation({ workBusy = false, changed = () => {} }: { workBusy?: boolean; changed?: () => void }) {
  const [store] = useState(() => createLocationChange(locationRequest));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const heading = useRef<HTMLHeadingElement>(null), field = useRef<HTMLInputElement>(null), open = useRef<HTMLButtonElement>(null);
  const previous = useRef(state.phase);
  useEffect(() => () => store.invalidate(), [store]);
  useEffect(() => {
    if (previous.current !== state.phase) {
      if (state.phase === 'edit' && ['loading', 'reviewing'].includes(previous.current)) field.current?.focus();
      if (['review', 'done', 'unknown', 'error'].includes(state.phase)) heading.current?.focus();
      if (state.phase === 'done') changed();
      previous.current = state.phase;
    }
  }, [state.phase, changed]);
  const busy = ['loading', 'reviewing', 'applying'].includes(state.phase);
  return <section className="setup-storage setup-location" aria-labelledby="location-title">
    <h3 id="location-title" ref={heading} tabIndex={-1}>Choose where your records live</h3>
    <p className="criteria-help">Copy your saved profile, jobs, stages and notes to a new local folder. Your provider key stays in Windows Credential Manager. Nothing is sent online.</p>
    {state.phase === 'closed' ? <button ref={open} className="button secondary" onClick={() => void store.status()}>Change personal-data folder</button> : <>
      {state.error && <p className="inline-error" role="alert">{state.error}</p>}
      {busy && <p role="status">{state.phase === 'applying' ? 'Copying and verifying your records. Leaving this screen does not cancel the change. Other workspace actions are temporarily unavailable.' : state.phase === 'reviewing' ? 'Checking the new folder and available space…' : 'Reading the current folder…'}</p>}
      {state.current && <LocationDetails current={state.current} review={state.review} />}
      {state.phase === 'done' && <p role="status">Your records now use the new folder. The original remains as a recovery copy. Future saves and deletion use only the active folder.</p>}
      {['edit', 'review', 'reviewing'].includes(state.phase) && <>
        <label className="location-label" htmlFor="new-data-folder">New personal-data folder</label>
        <input ref={field} id="new-data-folder" className="location-input" value={state.destination} maxLength={2048} disabled={busy} autoComplete="off" spellCheck={false} aria-describedby="location-guidance" onChange={event => store.edit(event.target.value)} />
        <p id="location-guidance" className="criteria-help">Paste a full path with a new folder name inside an existing local folder. Choose a folder you keep out of cloud sync. Existing folders, network drives and folder links are not supported. Review checks space; copying tests access.</p>
      </>}
      {state.phase === 'review' && <p className="resume-guidance">The original folder will keep a private recovery copy. Deleting career data later will not erase that copy. Application files, original resumes, keys and models stay in place. If copying is interrupted, the destination may also retain a partial private copy.</p>}
      {state.phase === 'unknown' && <><p className="criteria-help">The change may have completed. Check the current folder before doing more work. A partial or complete private copy may remain at this destination:</p><p className="location-path">{state.destination}</p></>}
      {workBusy && <p className="criteria-help">Finish or cancel current import, search or storage work before changing folders.</p>}
      <div className="criteria-actions">
        {state.phase === 'edit' && <button className="button secondary" disabled={workBusy || !state.destination.trim()} onClick={() => void store.review()}>Review folder change</button>}
        {state.phase === 'review' && <button className="button primary" disabled={workBusy} onClick={() => void store.apply()}>Copy and use this folder</button>}
        {['unknown', 'error', 'done'].includes(state.phase) && <button className="button secondary" onClick={() => void store.status()}>Check current folder</button>}
        <button className="text-action" onClick={() => { store.invalidate(); queueMicrotask(() => open.current?.focus()); }}>{busy ? 'Stop waiting' : 'Close folder settings'}</button>
      </div>
    </>}
  </section>;
}
