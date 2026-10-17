import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import { createCoreCheck, storageCheckMessages, type CoreSnapshot } from '../lib/setup-check';
import { runSetupCheck } from '../lib/setup-check-request';

export function CoreCheckResults({ snapshot }: { snapshot: CoreSnapshot }) {
  const [title, detail] = storageCheckMessages[snapshot.storage];
  const system = { windows: 'Windows', linux: 'Linux', macos: 'macOS', other: 'Other system' }[snapshot.system];
  return <>
    <div className="setup-check-outcome"><h4>{title}</h4><p>{detail}</p></div>
    <dl className="setup-device-facts">
      <div><dt>Engine environment</dt><dd>{system}{snapshot.process_bits ? ` · ${snapshot.process_bits}-bit process` : ' · Process size unavailable'}</dd></div>
      <div><dt>Logical processors</dt><dd>{snapshot.logical_processors ?? 'Unavailable'}</dd></div>
      <div><dt>Total physical memory</dt><dd>{snapshot.memory_bytes === null ? 'Unavailable' : snapshot.memory_bytes < 1024 ** 2 ? 'Less than 1 MiB reported' : `About ${(snapshot.memory_bytes / 1024 ** 3).toFixed(1)} GiB`}</dd></div>
    </dl>
    <p className="criteria-help">These are device facts, not a speed estimate or a compatibility certificate. No GPU or AI model is required by this guide.</p>
  </>;
}

export function SetupCheck() {
  const [check] = useState(() => createCoreCheck(runSetupCheck));
  const { status, snapshot } = useSyncExternalStore(check.subscribe, check.getSnapshot, check.getSnapshot);
  const startButton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => check.invalidate(), [check]);
  useEffect(() => { if (status === 'stopped') startButton.current?.focus(); }, [status]);
  function stop() { check.invalidate(true); }
  return <section className="setup-core-check" aria-labelledby="setup-core-title">
    <h3 id="setup-core-title">Check this computer</h3>
    <p className="resume-guidance" id="setup-core-disclosure">Optional: read basic device information and test storage by writing, reading back and removing one tiny temporary file in your personal-data folder. Career records are not opened or changed. Nothing is sent online.</p>
    <div className="criteria-actions">
      <button ref={startButton} className="button secondary" aria-describedby="setup-core-disclosure" disabled={status === 'checking'} onClick={() => void check.check()}><RefreshCw size={14} className={status === 'checking' ? 'spinning' : ''} />{status === 'checking' ? 'Checking this computer…' : status === 'idle' ? 'Run local check' : 'Run local check again'}</button>
      {status === 'checking' && <button className="text-action" onClick={stop}>Stop waiting</button>}
    </div>
    <div role="status" aria-atomic="true">
      {status === 'idle' && <p className="criteria-help">Not checked yet. You can skip this and start using JobScout.</p>}
      {status === 'checking' && <p className="criteria-help">Checking locally. You can continue; the temporary-file operation will finish its cleanup.</p>}
      {status === 'stopped' && <p className="criteria-help">Stopped waiting. The file check may still be finishing. Results were discarded; no new check runs automatically.</p>}
      {status === 'error' && <p className="criteria-help">Could not confirm the check. Make sure your local workspace is connected, then try again. The file operation may still finish; a timeout does not confirm its result.</p>}
      {snapshot && <CoreCheckResults snapshot={snapshot} />}
    </div>
    <p className="criteria-help">Results disappear when you leave this step. If JobScout closes unexpectedly during the test, a tiny file with fixed test text may remain.</p>
  </section>;
}
