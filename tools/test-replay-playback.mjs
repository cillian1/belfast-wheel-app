import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/wallet/watch.js'), 'utf8');
const helperMatch = source.match(/  function decodeReplayFrames\(text\) \{[\s\S]*?\n  \}/);
const replayMatch = source.match(/  async function replay\(id, card, path = 'hld'\) \{[\s\S]*?\n  \}/);
if (!helperMatch || !replayMatch) throw new Error('Could not find replay playback functions in src/wallet/watch.js');

function createHarness(payload, options = {}) {
  const events = [], states = [], messages = [], requested = [], timeouts = [];
  let clock = 1000;
  const db = {
    async get(path) {
      requested.push(path);
      return options.hangRead ? new Promise(() => {}) : payload;
    },
  };
  const unpack = async value => options.hangUnpack ? new Promise(() => {}) : value;
  const performance = { now: () => clock };
  const pause = async ms => { events.push(['pause', ms]); clock += ms; };
  const setTimer = (callback, ms) => {
    timeouts.push(ms);
    if (options.fireTimeout) queueMicrotask(callback);
    return timeouts.length;
  };
  const mirrorScreen = () => ({
    push(state) {
      if (options.failPush) throw new Error('render failed');
      states.push(state);
      events.push(['push', state.v && state.v.t]);
    },
    say(message) { messages.push(message); },
  });
  const closeSheet = () => {};
  const toast = () => {};
  const runtime = new Function('db', 'unpack', 'performance', 'pause', 'mirrorScreen', 'closeSheet', 'toast', 'console', 'setTimeout', 'clearTimeout', `
    let busy = false, viewing = null;
    ${helperMatch[0]}
    ${replayMatch[0]}
    return { replay, get viewing() { return viewing; } };
  `)(db, unpack, performance, pause, mirrorScreen, closeSheet, toast, { error() {} }, setTimer, () => {});
  return { runtime, events, states, messages, requested, timeouts };
}

const frame = (title, cap = title) => JSON.stringify({
  N: 512,
  scene: 'nested',
  v: { e: 'Replay', t: title, b: '' },
  cap,
});

const savedFrames = JSON.stringify([
  [250, frame('First frame')],
  [320, frame('Second frame')],
]);
const playback = createHarness(savedFrames);
await playback.runtime.replay('sample', {}, 'rpd');
assert.deepEqual(playback.requested, ['rpd/sample']);
assert.deepEqual(playback.events, [
  ['push', 'First frame'],
  ['pause', 70],
  ['push', 'Second frame'],
]);
assert.equal(playback.states[0].cap, 'First frame');
assert.equal(playback.states[1].cap, 'Second frame');
assert.deepEqual(playback.messages, [''], 'successful playback should clear its loading message');

const epochFrames = JSON.stringify([
  [1700000000000, frame('First frame')],
  [1700000000350, frame('Second frame')],
]);
const epoch = new Function(`${helperMatch[0]}; return decodeReplayFrames;`)();
assert.deepEqual(epoch(epochFrames).map(([at]) => at), [0, 350], 'playback uses elapsed milliseconds from the first frame');

const malformed = createHarness(JSON.stringify([[0, frame('First frame')], [50, '{bad json']]));
await malformed.runtime.replay('broken', {}, 'rpd');
assert.equal(malformed.states.length, 0);
assert.deepEqual(malformed.messages, ['This replay could not be loaded. It may be incomplete.']);

const failedDraw = createHarness(savedFrames, { failPush: true });
await failedDraw.runtime.replay('sample', {}, 'rpd');
assert.equal(failedDraw.states.length, 0);
assert.deepEqual(failedDraw.messages, ['This replay stopped unexpectedly. Close it and try another replay.']);

for (const options of [{ hangRead: true }, { hangUnpack: true }]) {
  const stalledLoad = createHarness(savedFrames, { ...options, fireTimeout: true });
  await stalledLoad.runtime.replay('sample', {}, 'rpd');
  assert.deepEqual(stalledLoad.timeouts, [15000]);
  assert.deepEqual(stalledLoad.messages, ['This replay is taking too long to load. Check your connection and try again.']);
}

console.log('Replay playback starts immediately, preserves elapsed-millisecond timing, and reports malformed frames, render errors, and 15-second read/unpack timeouts visibly.');
