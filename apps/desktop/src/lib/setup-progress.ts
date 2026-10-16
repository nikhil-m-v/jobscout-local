export const setupSteps = ['workspace', 'search', 'start'] as const;
export type SetupStep = typeof setupSteps[number];
export const setupProgressKey = 'jobscout.setup-step.v1';
export type SetupProgress = { step: SetupStep; remembered: boolean };

export function readSetupProgress(storage?: Pick<Storage, 'getItem'>): SetupProgress {
  try {
    const value = (storage ?? localStorage).getItem(setupProgressKey);
    return { step: setupSteps.find(step => step === value) ?? 'workspace', remembered: true };
  } catch { return { step: 'workspace', remembered: false }; }
}

export function saveSetupProgress(step: SetupStep, storage?: Pick<Storage, 'setItem'>): SetupProgress {
  try {
    (storage ?? localStorage).setItem(setupProgressKey, step);
    return { step, remembered: true };
  } catch { return { step, remembered: false }; }
}
