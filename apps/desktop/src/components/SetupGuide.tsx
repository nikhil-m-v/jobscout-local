import { useState } from 'react';
import { LockKeyhole, Monitor, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import type { EngineHealth } from '../lib/engine';
import { setupSteps, type SetupProgress, type SetupStep } from '../lib/setup-progress';
import { SearchProviderSettings } from './SearchProviderSettings';

type Props = {
  progress: SetupProgress;
  changeStep: (step: SetupStep) => void;
  health: EngineHealth | null;
  checking: boolean;
  refresh: () => void;
  leave: () => void;
};
const labels = { workspace: 'Your workspace', search: 'Online search', start: 'First use' };

export function SetupGuide({ progress, changeStep, health, checking, refresh, leave }: Props) {
  const { step, remembered } = progress;
  const [showProvider, setShowProvider] = useState(false);
  const move = (next: SetupStep) => { setShowProvider(false); changeStep(next); };
  return <div className="setup-guide">
    <div className="page-heading"><div><p className="eyebrow">GET STARTED</p><h1>A little setup. Your own pace.</h1><p className="muted">Keep your personal story on this computer. No AI model download is needed.</p></div></div>
    <ol className="flow-steps" aria-label="Setup progress">{setupSteps.map((item, index) => <li key={item} aria-current={step === item ? 'step' : undefined}><span>{index + 1}</span>{labels[item]}</li>)}</ol>
    <section className="settings-panel" aria-labelledby="setup-step-title">
      {step === 'workspace' && <>
        <div className="settings-title"><span className="icon-tile green"><ShieldCheck size={20} /></span><div><h2 id="setup-step-title">A private place to start.</h2><p>Understand what stays here before adding a resume.</p></div></div>
        <dl className="privacy-details">
          <div><dt>Application files</dt><dd>The installer manages the app and its bundled engine.</dd></div>
          <div><dt>Your career records</dt><dd>Saved profile text, saved jobs, application stages and notes live in this workspace’s local database. Original resume files stay where you keep them.</dd></div>
          <div><dt>Your choices</dt><dd>Review text before saving it. Settings → Your local data lets you review counts and delete app-owned career records. Local storage is not automatically encrypted; deletion does not guarantee secure disk erasure.</dd></div>
        </dl>
        <p className="criteria-help">This guide uses the existing storage location. Choosing or moving a personal-data folder is planned. Optional models belong to a later release.</p>
      </>}
      {step === 'search' && <>
        <div className="settings-title"><span className="icon-tile peach"><Search size={20} /></span><div><h2 id="setup-step-title">Online search, when you want it.</h2><p>You can import, review and save resume text without configuring a provider.</p></div></div>
        <p className="resume-guidance">Tavily receives only the generic job criteria you review and explicitly send. Your resume, profile and private notes stay on this computer. Searches may use provider credits; Tavily can see your IP address and API-account association.</p>
        <p className="criteria-help">Saving a key locally does not send a search or authorize one. The optional connection check has its own review and send action. Provider links open external websites with their own data practices.</p>
        <button className="button secondary" aria-expanded={showProvider} aria-controls="setup-provider" onClick={() => setShowProvider(value => !value)}>{showProvider ? 'Close key setup' : 'Set up Tavily'}</button>
      </>}
      {step === 'start' && <>
        <div className="settings-title"><span className="icon-tile green"><Monitor size={20} /></span><div><h2 id="setup-step-title">Your next step is yours.</h2><p>Start with a resume, or choose job options manually.</p></div></div>
        <div className="status-row"><div><h3>Local workspace</h3><p role="status">{checking ? 'Checking your local workspace…' : health?.database === 'ready' ? 'Connected. Local storage is responding.' : health ? 'Local storage needs attention before saving records.' : 'Workspace unavailable. Check again before importing or saving.'}</p></div><button className="button secondary" disabled={checking} onClick={refresh}><RefreshCw size={14} className={checking ? 'spinning' : ''} />{checking ? 'Checking…' : 'Check again'}</button></div>
        <p className="resume-guidance">Online search needs a saved Tavily key and a fresh review of the exact query. This guide does not check Tavily automatically or verify job availability.</p>
        <p className="criteria-help">A saved key or a successful connection check does not establish search readiness. Search quality is still being evaluated. You can return to this guide from Settings.</p>
      </>}
      {step === 'search' && <div id="setup-provider">{showProvider && <SearchProviderSettings connected={Boolean(health)} />}</div>}
      <div className="setup-actions">
        <div className="criteria-actions">{step !== 'workspace' && <button className="button secondary" onClick={() => move(step === 'start' ? 'search' : 'workspace')}>Back</button>}<button className="button primary" onClick={() => step === 'start' ? leave() : move(step === 'workspace' ? 'search' : 'start')}>{step === 'workspace' ? 'Continue' : step === 'search' ? 'Continue to first use' : 'Go to job search'}</button></div>
        <button className="text-action" onClick={leave}>Finish later</button>
      </div>
      <p className="criteria-help setup-progress-note"><LockKeyhole size={13} />{remembered ? 'Your place in this guide is remembered on this computer. You can change every choice later.' : 'Progress is kept for this session. Your browser could not remember it for next time.'}</p>
    </section>
  </div>;
}
