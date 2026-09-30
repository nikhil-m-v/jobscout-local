import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCriteria, validatePublicSearchCriteria } from '../src/lib/public-search-criteria.ts';

test('accepts controlled choices and returns an immutable independent snapshot', () => {
  const input = { ...initialCriteria, skills: ['sql', 'python'] };
  const result = validatePublicSearchCriteria(input);
  input.skills.push('java');
  assert.deepEqual(result.skills, ['python', 'sql']);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.skills));
});
test('rejects private context, extra fields, missing fields and unconstrained text', () => {
  for (const input of [null, [], 'text', { ...initialCriteria, profile: 'SYNTHETIC_PRIVATE_MARKER' }, { ...initialCriteria, role: 'SYNTHETIC_PRIVATE_MARKER' }, { ...initialCriteria, region: 'https://example.test' }, { ...initialCriteria, seniority: 'constructor' }, { ...initialCriteria, arrangement: '__proto__' }, { role: 'software-engineer' }]) {
    assert.throws(() => validatePublicSearchCriteria(input));
  }
});
test('rejects unknown, duplicate, excessive and malformed skill selections', () => {
  for (const skills of [['SYNTHETIC_PRIVATE_MARKER'], ['sql', 'sql'], ['python', 'javascript', 'typescript', 'sql', 'java', 'react'], 'python', [null], ['toString']]) {
    assert.throws(() => validatePublicSearchCriteria({ ...initialCriteria, skills }));
  }
});
