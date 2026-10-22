import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/wallet/watch.js'), 'utf8');
const helpersMatch = source.match(/  const WATCH_DELAY_MS = 3000,[\s\S]*?function watchOfflineMessage\(name, lastI, got, at\) \{[\s\S]*?\n  \}/);
const watchMatch = source.match(/  async function watch\(key, name\) \{[\s\S]*?\r?\n  \}\r?\n  async function replay/);
if (!helpersMatch || !watchMatch) throw new Error('Could not find delayed Watch helpers in src/wallet/watch.js');
assert.match(source, /id="wwModeBadge"[^>]*><i><\/i><span id="wwModeLabel">DELAYED<\/span>/, 'the Watch screen starts with an accurate delayed-mode badge');
const watchSource = watchMatch[0].replace(/\r?\n  async function replay$/, '');

const helpers = new Function(`${helpersMatch[0]}; return { addWatchFrame, pruneWatchFrames, alignWatchBuffer, takeWatchFrame, watchOfflineMessage };`)();
const buffer = [];
for (let i = 0; i < 140; i++) helpers.addWatchFrame(buffer, { at: i });
assert.equal(buffer.length, 128, 'the delayed state buffer has a fixed maximum');
assert.equal(buffer[0].at, 12, 'overflow drops the oldest states first');
helpers.pruneWatchFrames(buffer, 8012);
assert.equal(buffer[0].at, 12, 'states at the eight-second boundary remain available');
helpers.pruneWatchFrames(buffer, 8013);
assert.equal(buffer[0].at, 13, 'states older than eight seconds are pruned');
assert.equal(helpers.takeWatchFrame(buffer, 13).at, 13, 'only states at or before the playback target are released');
assert.equal(helpers.takeWatchFrame(buffer, 13), null, 'future states stay buffered');
const aligned = Array.from({ length: 50 }, (_, i) => ({ at: 1000 + i * 80 }));
helpers.alignWatchBuffer(aligned, 2970);
assert.equal(aligned[0].at, 2920, 'switching back to delay skips old live-mode backlog');
assert.equal(helpers.takeWatchFrame(aligned, 2970).at, 2920, 'the delayed view resumes near its target time');
assert.equal(helpers.watchOfflineMessage('Sam', 1, 1000, 16000), '', 'a fresh stream is not marked offline');
assert.equal(helpers.watchOfflineMessage('Sam', 1, 1000, 16001), 'Sam has stepped away. Waiting…', 'stale streams show the existing offline state');
assert.equal(helpers.watchOfflineMessage('Sam', -1, 1000, 16001), "Connecting to Sam's phone…", 'a stream that never arrived remains in the connecting state');

const stopped = new Error('stop harness');
function createHarness({ stopAfter, updates = true, toggleAfter = 0 }) {
  let clock = 1000, reads = 0, pauses = 0;
  const toggleAt = new Set(Array.isArray(toggleAfter) ? toggleAfter : [toggleAfter]);
  const states = [], messages = [], attrs = {};
  let badgeOn = false;
  const modeButton = {
    textContent: '',
    setAttribute(name, value) { attrs[name] = value; },
  };
  const modeLabel = { textContent: '' };
  const modeBadge = {
    classList: {
      toggle(name, force) { if (name === 'on') badgeOn = force; },
      remove(name) { if (name === 'on') badgeOn = false; },
    },
  };
  const elements = { wwSend: {}, wwMode: modeButton, wwModeBadge: modeBadge, wwModeLabel: modeLabel };
  const db = {
    async put() {},
    async get(path) {
      if (path.endsWith('/d')) {
        reads++;
        return {
          i: updates ? reads : 1, b: 1, d: JSON.stringify({ step: updates ? reads : 1, gamble: { phase: 'reveal', pick: 'red', colour: 'black', won: false, amount: 0, count: 1 } }),
          v: { e: 'Test', t: 'frame ' + reads, b: '' }, cap: '', s: 10, bal: 100, play: true,
        };
      }
      return { id: 1, st: JSON.stringify({ N: 512, scene: 'test', step: 0 }) };
    },
  };
  const pause = async ms => {
    clock += ms;
    pauses++;
    if (toggleAt.has(pauses)) modeButton.onclick();
    if (pauses >= stopAfter) throw stopped;
  };
  const mirrorScreen = () => ({
    push(state, info) { states.push({ at: clock, step: state.step, gamble: state.gamble, info }); },
    say(message) { messages.push(message); },
  });
  const runtime = new Function('db', 'now', 'pause', '$w', 'W', 'me4', 'closeSheet', 'toast', 'mirrorScreen', 'stakeLbl', 'eur', 'parse', `let busy = false, viewing = null, gambleBusy = false; const collectGamble = () => {};\n${helpersMatch[0]}\n${watchSource}\nreturn { watch, get viewing() { return viewing; } };`)(
    db, () => clock, pause, id => elements[id], {}, () => 'watcher', () => {}, () => {},
    mirrorScreen, value => String(value), value => String(value), value => { try { return JSON.parse(value); } catch { return {}; } },
  );
  return { runtime, states, messages, modeButton, modeLabel, attrs, get badgeOn() { return badgeOn; }, get clock() { return clock; } };
}

const delayed = createHarness({ stopAfter: 45 });
await assert.rejects(delayed.runtime.watch('player', 'Sam'), error => error === stopped);
assert.ok(delayed.states.length > 0, `delayed state is sent through the same mirror renderer: ${delayed.messages.join(' | ')}`);
assert.ok(delayed.states[0].at >= 1000 + 3000, 'the default Watch mode holds the first state for three seconds');
assert.equal(delayed.states[0].step, 1, 'the first rendered state is the oldest eligible buffered snapshot');
assert.deepEqual(delayed.states[0].gamble, { phase: 'reveal', pick: 'red', colour: 'black', won: false, amount: 0, count: 1 }, 'card, pick and reveal travel through the delayed Watch stream');
assert.ok(delayed.states.at(-1).step <= 8, 'playback stays close to its three-second-old source state');
assert.equal(delayed.modeButton.textContent, 'Go live', 'the delayed mode keeps an immediate-live option without displaying the delay');
assert.equal(delayed.attrs['aria-pressed'], 'false');
assert.equal(delayed.modeLabel.textContent, 'DELAYED');
assert.equal(delayed.badgeOn, false);
assert.ok(delayed.messages.every(message => !message.includes('3-second')), 'buffering does not expose the delay to viewers');

const live = createHarness({ stopAfter: 4, toggleAfter: 1 });
await assert.rejects(live.runtime.watch('player', 'Sam'), error => error === stopped);
assert.ok(live.states[0].at < 1000 + 3000, 'switching to Live immediately renders the latest state');
assert.equal(live.modeButton.textContent, 'Use delay');
assert.equal(live.attrs['aria-pressed'], 'true');
assert.equal(live.modeLabel.textContent, 'LIVE');
assert.equal(live.badgeOn, true);

const switched = createHarness({ stopAfter: 43, toggleAfter: [1, 40] });
await assert.rejects(switched.runtime.watch('player', 'Sam'), error => error === stopped);
assert.equal(switched.states.find(frame => frame.at >= 4200).step, 3, 'returning from Live resumes close to the delayed target instead of replaying the old backlog');
assert.equal(switched.modeLabel.textContent, 'DELAYED');
assert.equal(switched.badgeOn, false);

const offline = createHarness({ stopAfter: 205, updates: false });
await assert.rejects(offline.runtime.watch('player', 'Sam'), error => error === stopped);
assert.deepEqual(offline.states.map(frame => frame.step), [1], 'stale buffered frames are not replayed indefinitely');
assert.equal(offline.messages.at(-1), 'Sam has stepped away. Waiting…', 'an offline stream is reported after its buffer drains');

console.log('Delayed Watch keeps a bounded eight-second buffer, renders state after three seconds, preserves instant Live mode, and reports stale streams after buffered frames drain.');
