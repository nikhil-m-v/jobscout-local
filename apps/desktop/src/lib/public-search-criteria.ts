// Public categories only. Keep this module independent of profile/import/model code.
export const roles = {
  'software-engineer': 'Software engineer', 'data-analyst': 'Data analyst',
  'data-engineer': 'Data engineer', 'product-manager': 'Product manager',
  'product-designer': 'Product designer', 'quality-engineer': 'Quality engineer',
  'it-support': 'IT support', 'project-manager': 'Project manager',
} as const;
export const regions = { any: 'No region preference', india: 'India', 'united-states': 'United States', 'united-kingdom': 'United Kingdom', canada: 'Canada', australia: 'Australia', 'europe': 'Europe' } as const;
export const seniorities = { any: 'Any seniority', internship: 'Internship', entry: 'Entry level', mid: 'Mid level', senior: 'Senior', lead: 'Lead' } as const;
export const arrangements = { any: 'Any arrangement', remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const;
export const skills = { python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', sql: 'SQL', java: 'Java', dotnet: '.NET', react: 'React', cloud: 'Cloud platforms', analytics: 'Data analytics', design: 'Product design', testing: 'Software testing', 'project-management': 'Project management' } as const;
export type PublicSearchCriteria = Readonly<{
  role: keyof typeof roles;
  region: keyof typeof regions;
  seniority: keyof typeof seniorities;
  arrangement: keyof typeof arrangements;
  skills: readonly (keyof typeof skills)[];
}>;
export const MAX_PUBLIC_SKILLS = 5;
export const initialCriteria: PublicSearchCriteria = { role: 'software-engineer', region: 'any', seniority: 'any', arrangement: 'any', skills: [] };

// Runtime validation is necessary even when callers have TypeScript types.
// This local contract is not the future provider outbound boundary.
export function validatePublicSearchCriteria(value: unknown): PublicSearchCriteria {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose criteria from the available categories.');
  const data = value as Record<string, unknown>;
  const keys = ['role', 'region', 'seniority', 'arrangement', 'skills'];
  if (Object.keys(data).length !== keys.length || Object.keys(data).some(key => !keys.includes(key))) throw new Error('Only public search categories are allowed.');
  for (const [key, catalog] of [['role', roles], ['region', regions], ['seniority', seniorities], ['arrangement', arrangements]] as const) {
    if (typeof data[key] !== 'string' || !Object.hasOwn(catalog, data[key] as string)) throw new Error('Choose criteria from the available categories.');
  }
  if (!Array.isArray(data.skills) || data.skills.length > MAX_PUBLIC_SKILLS || new Set(data.skills).size !== data.skills.length || data.skills.some(skill => typeof skill !== 'string' || !Object.hasOwn(skills, skill))) throw new Error('Choose up to five different public skills.');
  return Object.freeze({ role: data.role, region: data.region, seniority: data.seniority, arrangement: data.arrangement, skills: Object.freeze([...data.skills].sort()) }) as PublicSearchCriteria;
}
