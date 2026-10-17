import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCoreCheck, validateCoreSnapshot } from '../src/lib/setup-check.ts';
import { runSetupCheck } from '../src/lib/setup-check-request.ts';

const good = { system: 'windows', process_bits: 64, logical_processors: 8, memory_bytes: 16 * 1024 ** 3, storage: 'verified' };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('core check validates exact bounded facts and refuses raw diagnostics', () => {
  assert.deepEqual(validateCoreSnapshot(good), good);
  for (const storage of ['verified', 'unavailable', 'cleanup_needed', 'busy']) {
    assert.equal(validateCoreSnapshot({ ...good, storage, memory_bytes: null, logical_processors: null, process_bits: null }).storage, storage);
  }
  for (const value of [null, [], {}, { ...good, hostname: 'PRIVATE' }, { ...good, system: 'PRIVATE' },
    { ...good, storage: 'ready' }, ...[0, 16, '64', true].map(process_bits => ({ ...good, process_bits })),
    ...[0, -1, 65537, 1.5, true, '8', Infinity].map(logical_processors => ({ ...good, logical_processors })),
    ...[-1, 1.5, true, '8', Infinity, Number.MAX_SAFE_INTEGER + 1].map(memory_bytes => ({ ...good, memory_bytes }))]) {
    assert.throws(() => validateCoreSnapshot(value), { message: 'Local check unavailable.' });
  }
});

test('browser check uses empty fixed POST, no-store, no credentials and abort', async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let captured;
  try {
    globalThis.fetch = async (url, options) => { captured = { url, options }; return { ok: true, json: async () => good }; };
    assert.deepEqual(await runSetupCheck(controller.signal), good);
    assert.equal(captured.url, '/engine/setup/check');
    assert.equal(captured.options.method, 'POST');
    assert.equal(captured.options.body, undefined);
    assert.deepEqual(captured.options.headers, { 'X-JobScout-Import': '1' });
    for (const [key, value] of Object.entries({ cache: 'no-store', credentials: 'omit', redirect: 'error' })) assert.equal(captured.options[key], value);
    controller.abort();
    assert.ok(captured.options.signal.aborted);
    globalThis.fetch = async () => ({ ok: false, json: () => assert.fail('must not read private error') });
    await assert.rejects(runSetupCheck(new AbortController().signal), { message: 'Local check unavailable.' });
  } finally { globalThis.fetch = original; }
});

test('explicit checks suppress duplicate clicks, clear stale results and recover from errors', async () => {
  let next = deferred(), calls = 0;
  const check = createCoreCheck(() => { calls++; return next.promise; });
  assert.equal(calls, 0);
  const run = check.check();
  await check.check();
  assert.equal(calls, 1);
  assert.deepEqual(check.getSnapshot(), { status: 'checking', snapshot: null });
  next.resolve(good); await run;
  assert.equal(check.getSnapshot().status, 'done');
  next = deferred(); const retry = check.check();
  assert.equal(check.getSnapshot().snapshot, null);
  next.reject(Error('PRIVATE')); await retry;
  assert.deepEqual(check.getSnapshot(), { status: 'error', snapshot: null });
  next = deferred(); const recovery = check.check();
  next.resolve({ ...good, storage: 'cleanup_needed' }); await recovery;
  assert.equal(check.getSnapshot().snapshot.storage, 'cleanup_needed');
});

test('stop or leave aborts transport and rejects old completion even during a new check', async () => {
  for (const stopped of [false, true]) for (const fails of [false, true]) {
    const old = deferred(), fresh = deferred(); let signal, calls = 0;
    const check = createCoreCheck(value => { signal = value; return ++calls === 1 ? old.promise : fresh.promise; });
    const pending = check.check();
    check.invalidate(stopped);
    assert.ok(signal.aborted);
    assert.deepEqual(check.getSnapshot(), { status: stopped ? 'stopped' : 'idle', snapshot: null });
    const current = check.check();
    if (fails) old.reject(Error('PRIVATE')); else old.resolve(good);
    await pending;
    assert.deepEqual(check.getSnapshot(), { status: 'checking', snapshot: null });
    fresh.resolve({ ...good, storage: 'busy' }); await current;
    assert.equal(check.getSnapshot().snapshot.storage, 'busy');
    check.invalidate();
    assert.equal(check.getSnapshot().snapshot, null);
  }
});

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/SetupCheck.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);
const render = snapshot => renderToStaticMarkup(React.createElement(exports.CoreCheckResults, { snapshot }));

test('rendered facts and recovery guidance do not certify readiness or future saves', () => {
  const markup = render(good);
  for (const text of ['Windows', '64-bit process', '16.0 GiB', 'Logical processors', 'not a speed estimate', 'does not test a database save']) assert.ok(markup.includes(text), text);
  for (const [storage, text] of [['unavailable', 'free space and write access'], ['cleanup_needed', 'removing that file before'], ['busy', 'does not interrupt file cleanup']]) assert.ok(render({ ...good, storage }).includes(text));
  assert.ok(render({ ...good, memory_bytes: null }).includes('Unavailable'));
  assert.ok(render({ ...good, memory_bytes: 0 }).includes('Less than 1 MiB'));
  const idle = renderToStaticMarkup(React.createElement(exports.SetupCheck));
  for (const text of ['Not checked yet', 'Nothing is sent online', 'writing, reading back and removing', 'Run local check', 'closes unexpectedly']) assert.ok(idle.includes(text), text);
  assert.ok(!idle.includes('Temporary-file check passed'));
});
