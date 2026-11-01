import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngineConnection, EngineStoppedError, stoppedWorkspaceMessage } from '../src/lib/engine-connection-state.ts';
import { readEngineHealth } from '../src/lib/engine.ts';

const health = { status: 'ready', version: '0.1.0', database: 'ready', local_ai: { provider: 'ollama', status: 'unavailable', installed_models: 0 } };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('startup retries transient failures, coalesces checks and retains the existing polling cadence', async () => {
  let time = 0, calls = 0, pending = deferred();
  const store = createEngineConnection(() => { calls++; return pending.promise; }, () => time);
  const first = store.start();
  await store.refresh();
  assert.equal(calls, 1);
  pending.reject(Error('PRIVATE diagnostics'));
  await first;
  assert.equal(store.getSnapshot().health, null);
  assert.doesNotMatch(store.getSnapshot().error, /PRIVATE/);
  pending = deferred(); time = 2499; store.poll();
  assert.equal(calls, 1);
  time = 2500; store.poll();
  pending.resolve(health); await pending.promise; await Promise.resolve();
  assert.deepEqual(store.getSnapshot(), { health, checking: false, error: null, stopped: false });
  time = 17499; store.poll(); assert.equal(calls, 2);
  time = 17500; store.poll(); assert.equal(calls, 3);
  await Promise.resolve();
  store.dispose();
});

test('sidecar termination immediately clears connected status and a late health reply cannot restore it', async () => {
  for (const failure of [false, true]) {
    let pending = deferred(), calls = 0;
    const store = createEngineConnection(() => { calls++; return pending.promise; });
    const first = store.start(); pending.resolve(health); await first;
    assert.equal(store.getSnapshot().health, health);
    pending = deferred(); const check = store.refresh();
    store.stopped();
    assert.deepEqual(store.getSnapshot(), { health: null, checking: false, error: stoppedWorkspaceMessage, stopped: true });
    if (failure) pending.reject(Error('PRIVATE')); else pending.resolve(health);
    await check;
    await store.refresh(); store.poll();
    assert.equal(calls, 2);
    assert.equal(store.getSnapshot().stopped, true);
    assert.equal(store.getSnapshot().health, null);
    assert.match(store.getSnapshot().error, /Close and reopen JobScout/);
    store.dispose();
  }
});

test('a termination before the frontend listener is registered is also terminal through health', async () => {
  let calls = 0;
  const store = createEngineConnection(async () => { calls++; throw new EngineStoppedError(); });
  await store.start();
  await store.refresh(); store.poll();
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().error, stoppedWorkspaceMessage);
  assert.equal(store.getSnapshot().checking, false);
  assert.equal(store.getSnapshot().stopped, true);
  store.dispose();
});

test('unmount ignores old success or failure, and a fresh effect can read health immediately', async () => {
  for (const failure of [false, true]) {
    const first = deferred(), second = deferred(); let calls = 0;
    const store = createEngineConnection(() => ++calls === 1 ? first.promise : second.promise);
    const old = store.start(); store.dispose();
    const fresh = store.start();
    if (failure) first.reject(Error('PRIVATE')); else first.resolve(health);
    await old;
    assert.equal(store.getSnapshot().health, null);
    assert.equal(store.getSnapshot().checking, true);
    second.resolve(health); await fresh;
    assert.equal(store.getSnapshot().health, health);
    store.dispose(); store.stopped();
    assert.equal(store.getSnapshot().stopped, false);
  }
});

test('native health uses only the fixed terminal error as a stop signal', async () => {
  const priorWindow = globalThis.window, priorTauri = globalThis.isTauri;
  try {
    globalThis.isTauri = true;
    let response;
    globalThis.window = { __TAURI_INTERNALS__: { invoke: async (command, args) => {
      assert.equal(command, 'engine_health'); assert.deepEqual(args, {});
      if (response instanceof Error || typeof response === 'string') throw response;
      return response;
    } } };
    response = 'Workspace stopped';
    await assert.rejects(readEngineHealth(), EngineStoppedError);
    response = 'Workspace is starting';
    await assert.rejects(readEngineHealth(), value => value === response);
    response = health;
    assert.deepEqual(await readEngineHealth(), health);
  } finally {
    if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow;
    if (priorTauri === undefined) delete globalThis.isTauri; else globalThis.isTauri = priorTauri;
  }
});
