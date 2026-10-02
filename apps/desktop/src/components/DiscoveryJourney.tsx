import { ResumePicker } from './ResumePicker';
import { SearchCriteria, SearchResults } from './SearchCriteria';
import { SearchProviderSettings } from './SearchProviderSettings';
import type { useResumeImport } from '../hooks/useResumeImport';
import type { useSavedProfile } from '../hooks/useSavedProfile';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useSearchPreview } from '../hooks/useSearchPreview';
import type { PublicSearchCriteria } from '../lib/public-search-criteria';

export type DiscoveryStep = 'resume' | 'options' | 'results';
export function DiscoveryJourney({ step, navigate, optionsAvailable, resultsAvailable, continueWithoutResume, resume, saved, criteria, searchPreview, discovery, onChange }: {
  step: DiscoveryStep; navigate: (step: DiscoveryStep) => void;
  optionsAvailable: boolean; resultsAvailable: boolean; continueWithoutResume: () => void;
  resume: ReturnType<typeof useResumeImport>; saved: ReturnType<typeof useSavedProfile>;
  criteria: PublicSearchCriteria; searchPreview: ReturnType<typeof useSearchPreview>;
  discovery: ReturnType<typeof useDiscovery>; onChange: (criteria: PublicSearchCriteria) => void;
}) {
  return <>
    <nav className="discovery-steps" aria-label="Job search steps">
      {([['resume', 'Resume', true], ['options', 'Job options', optionsAvailable], ['results', 'Results', resultsAvailable]] as const).map(([id, label, available], index) =>
        <button type="button" key={id} className={`discovery-step ${step === id ? 'active' : ''}`} disabled={!available} aria-current={step === id ? 'step' : undefined} onClick={() => navigate(id)} title={!available ? id === 'options' ? 'Choose a resume or continue without one first' : 'Complete a search first' : label}>
          <span className="step-number">{index + 1}</span><span>{label}</span>
        </button>)}
    </nav>
    {step === 'resume' ? <>
      <section className="settings-panel journey-intro"><h2>Start your search.</h2><p className="criteria-help">Bring a resume or search without one. Current searches use your reviewed public choices; resume matching comes later.</p>
        <div className="criteria-actions"><button className="button primary" type="button" disabled={!optionsAvailable} onClick={() => navigate('options')}>Continue to job options</button><button className="button secondary" type="button" onClick={continueWithoutResume}>Search without a resume</button></div>
      </section>
      <ResumePicker resume={resume} saved={saved} />
      <div className="criteria-actions"><button className="button primary" type="button" disabled={!optionsAvailable} onClick={() => navigate('options')}>Continue to job options</button></div>
    </> : step === 'options' ? <><SearchCriteria criteria={criteria} searchPreview={searchPreview} discovery={discovery} onChange={onChange} />{searchPreview.preview?.provider !== 'tavily' && <details className="inline-setup"><summary>Set up online search</summary><SearchProviderSettings connected={searchPreview.connected} /></details>}</> : <SearchResults discovery={discovery} />}
  </>;
}
