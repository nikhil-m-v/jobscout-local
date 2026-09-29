import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_RESUME_BYTES, validateResumeSelection } from '../src/lib/resume-selection.ts';

test('accepts PDF and DOCX metadata, including missing OS MIME information', () => {
  for (const [name, type] of [
    ['sample.PDF', 'application/pdf'],
    ['sample.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['sample.pdf', ''], ['sample.docx', 'application/octet-stream'],
  ]) {
    const result = validateResumeSelection({ name, type, size: MAX_RESUME_BYTES });
    assert.equal(result.ok, true);
    assert.equal(result.selection.size, MAX_RESUME_BYTES);
  }
});

test('rejects unsupported extensions and conflicting MIME information', () => {
  for (const [name, type] of [['sample.doc', ''], ['sample.pdf.exe', ''], ['sample', 'application/pdf'], ['sample.pdf', 'text/html']]) {
    assert.equal(validateResumeSelection({ name, type, size: 100 }).ok, false);
  }
});

test('rejects empty, oversized, and invalid sizes', () => {
  for (const size of [0, -1, MAX_RESUME_BYTES + 1, NaN, Infinity, 1.5]) {
    assert.equal(validateResumeSelection({ name: 'sample.pdf', type: '', size }).ok, false);
  }
});

test('retains only review metadata, with no contents or local path', () => {
  const result = validateResumeSelection({ name: 'sample.pdf', size: 100, type: '', path: 'synthetic', contents: 'synthetic' });
  assert.deepEqual(result, { ok: true, selection: { name: 'sample.pdf', size: 100, format: 'pdf' } });
});
