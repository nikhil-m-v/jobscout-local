import { useEffect, useState, useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import { createStorageCheck, describeSpace } from '../lib/setup-storage';
import { readSetupStorage } from '../lib/setup-storage-request';

export function SetupStorage() {
  const [check] = useState(() => createStorageCheck(readSetupStorage));
  const { snapshot, status } = useSyncExternalStore(check.subscribe, check.getSnapshot, check.getSnapshot);
  useEffect(() => () => check.invalidate(), [check]);
  return <section className="setup-storage" aria-labelledby="setup-storage-title">
    <div className="status-row"><div><h3 id="setup-storage-title">Your personal-data folder</h3><p>Check the current folder and free drive space. This stays on your computer.</p></div>
      <button className="button secondary" disabled={status === 'checking'} onClick={() => void check.check()}><RefreshCw size={14} className={status === 'checking' ? 'spinning' : ''} />{status === 'checking' ? 'Checking storage…' : status === 'idle' ? 'Check storage' : 'Check storage again'}</button></div>
    <div role="status" aria-atomic="true">
      {status === 'idle' && <p className="criteria-help">Not checked yet. The folder name may include your computer account name.</p>}
      {status === 'checking' && <p className="criteria-help">Reading local storage information. You can continue while this runs.</p>}
      {status === 'error' && <p className="criteria-help">Storage check unavailable. Try again when your local workspace is connected.</p>}
      {snapshot && <dl className="setup-storage-details"><div><dt>Current folder</dt><dd>{snapshot.folder ?? 'Folder location unavailable.'}</dd></div><div><dt>Space at last check</dt><dd>{describeSpace(snapshot.free_bytes)}</dd></div></dl>}
    </div>
    <p className="criteria-help">Free space can change. This check does not test write access or guarantee that a save will succeed. It does not move or delete files.</p>
  </section>;
}
