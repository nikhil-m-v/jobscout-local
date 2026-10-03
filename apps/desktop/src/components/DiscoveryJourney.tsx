import { ResumePicker } from './ResumePicker';
import { SearchCriteria, SearchResults } from './SearchCriteria';
import { SearchProviderSettings } from './SearchProviderSettings';
import type { useResumeImport } from '../hooks/useResumeImport';
import type { useSavedProfile } from '../hooks/useSavedProfile';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useSearchPreview } from '../hooks/useSearchPreview';
import type { PublicSearchCriteria } from '../lib/public-search-criteria';
import { roles, skills } from '../lib/public-search-criteria';
import type { useAssistance } from '../hooks/useAssistance';

export type DiscoveryStep = 'resume' | 'options' | 'results';
export function DiscoveryJourney({ step, navigate, optionsAvailable, resultsAvailable, continueWithoutResume, onResumeReviewed, assisted = false, assistance, resultAnalysis, retryResultAnalysis, resume, saved, criteria, searchPreview, discovery, onChange }: {
  step: DiscoveryStep; navigate: (step: DiscoveryStep) => void;
  optionsAvailable: boolean; resultsAvailable: boolean; continueWithoutResume: () => void;
  resume: ReturnType<typeof useResumeImport>; saved: ReturnType<typeof useSavedProfile>;
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  discovery: ReturnType<typeof useDiscovery>; onChange: (criteria: PublicSearchCriteria) => void;
  onResumeReviewed?: () => void; assisted?: boolean; assistance?: ReturnType<typeof useAssistance>; resultAnalysis?: ReturnType<typeof useAssistance>; retryResultAnalysis?: () => void;
}) {
  return <>
    <nav className="discovery-steps" aria-label="Job search steps">
      {([['resume', 'Resume', true], ['options', assisted ? 'Review query' : 'Job options', optionsAvailable], ['results', 'Results', resultsAvailable]] as const).map(([id, label, available], index) =>
        <button type="button" key={id} className={`discovery-step ${step === id ? 'active' : ''}`} disabled={!available} aria-current={step === id ? 'step' : undefined} onClick={available ? () => navigate(id) : undefined}>
          <span className="step-number">{index + 1}</span><span>{label}</span>
        </button>)}
    </nav>
    {step === 'resume' ? <>
      <ResumePicker resume={resume} saved={saved} onSearchWithoutResume={continueWithoutResume} onResumeReviewed={onResumeReviewed ?? (() => navigate('options'))} />
      {optionsAvailable && <div className="journey-actions"><button className="button primary" type="button" onClick={() => navigate('options')}>{assisted ? 'Return to suggested query' : 'Continue to job options'}</button></div>}
    </> : step === 'options' ? <>
      {assisted && <section className="settings-panel" aria-label="Local resume suggestions">
        <h2>Suggested from your reviewed resume</h2>
        {assistance?.busy && <p role="status">Identifying public categories locally…</p>}
        {assistance?.result && <><p className="criteria-help">Role mentions: {assistance.result.roles.map(id => roles[id]).join(', ') || 'No supported role found — choose one below.'}</p><p className="criteria-help">Skill mentions: {assistance.result.skills.map(id => skills[id]).join(', ') || 'No supported skills found.'}</p><p className="criteria-help">These are word-based suggestions, not verified qualifications. The first role mention and up to five skill categories prepare your query. Correct the categories if needed. Names, employers and career history stay local.</p></>}
        {assistance?.error && <p className="inline-error" role="alert">{assistance.error}</p>}
        {assistance?.busy && <button className="button secondary" type="button" onClick={assistance.invalidate}>Cancel local analysis</button>}
        {!assistance?.busy && !assistance?.result && <button className="button secondary" type="button" onClick={onResumeReviewed}>Retry local analysis</button>}
        <button className="button secondary" type="button" onClick={continueWithoutResume}>Use manual preferences instead</button>
      </section>}
      {(!assisted || assistance?.result) && <SearchCriteria key={assisted ? 'assisted' : 'manual'} initialSide={assisted && assistance?.result?.criteria ? 'query' : 'preferences'} requireRoleChoice={assisted && assistance?.result?.criteria === null} assisted={assisted} criteria={criteria} searchPreview={searchPreview} discovery={discovery} onChange={onChange} />}
      {searchPreview.preview?.provider !== 'tavily' && <details className="inline-setup"><summary>Set up online search</summary><SearchProviderSettings connected={searchPreview.connected} /></details>}
    </> : <SearchResults discovery={discovery} analysis={resultAnalysis} assisted={assisted} onRetryAnalysis={retryResultAnalysis} />}
  </>;
}
