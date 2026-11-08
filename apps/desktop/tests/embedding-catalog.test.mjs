import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { embeddingCatalog, embeddingReferenceUrl } from '../src/lib/embedding-catalog.ts';

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/EmbeddingModels.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);

test('catalog review does not select a model and distinguishes versioned packages from active setup', () => {
  assert.equal(embeddingCatalog.defaultModel, null);
  assert.equal(new Set(embeddingCatalog.models.map(model => model.id)).size, embeddingCatalog.models.length);
  for (const model of embeddingCatalog.models) {
    assert.ok(model.variant.includes(':') && !model.variant.endsWith(':latest'));
    assert.ok(model.approximateDownloadMB > 0 && model.dimensions > 0);
    assert.equal(model.license, 'Apache-2.0');
  }
});

test('external reference resolver rejects arbitrary IDs, URL input and unknown actions', () => {
  for (const id of ['__proto__', 'https://example.com', 'minilm-l6-v2?resume=PRIVATE', null, {}]) {
    assert.throws(() => embeddingReferenceUrl(id, 'model'));
  }
  for (const action of ['download', 'pull', '__proto__', null]) {
    assert.throws(() => embeddingReferenceUrl('minilm-l6-v2', action));
  }
});

test('every catalog reference has an exact native permission with no new wildcard or download endpoint', () => {
  const capability = JSON.parse(readFileSync(new URL('../src-tauri/capabilities/default.json', import.meta.url)));
  const allowed = capability.permissions.find(entry => entry.identifier === 'opener:allow-open-url').allow.map(entry => entry.url);
  const catalogReferences = embeddingCatalog.models.flatMap(model => ['model', 'license'].map(kind => embeddingReferenceUrl(model.id, kind)));
  const modelPermissions = allowed.filter(url => url.includes('/library/'));
  assert.deepEqual(modelPermissions.sort(), catalogReferences.sort());
  for (const url of catalogReferences) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://ollama.com');
    assert.equal(parsed.search, '');
    assert.equal(parsed.hash, '');
    assert.ok(!url.includes('*'));
  }
});

test('catalog is closed by default, usable offline, honest about limits and exposes only explicit reference buttons', () => {
  for (const inSetup of [true, false]) {
    const markup = renderToStaticMarkup(React.createElement(exports.EmbeddingModels, { inSetup }));
    assert.ok(markup.includes('Preview only.') && markup.includes('No model is selected.'));
    assert.ok(markup.includes('downloads are not available yet'));
    assert.ok(markup.includes('Reading this built-in catalog sends nothing online'));
    assert.ok(markup.includes('Download size is not a RAM requirement'));
    assert.ok(markup.includes('have not been measured in JobScout'));
    assert.ok(!/<details[^>]*\bopen\b/.test(markup));
    assert.ok(!/<(?:img|iframe|form|input|select)\b/.test(markup));
    assert.equal((markup.match(/<button /g) ?? []).length, 4);
    assert.equal((markup.match(/\(opens browser\)/g) ?? []).length, 4);
    assert.match(markup, inSetup ? /<h3 id="embedding-title-setup"/ : /<h2 id="embedding-title-settings"/);
  }
});
