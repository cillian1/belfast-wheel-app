import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/game/phelan-voice.js'), 'utf8');
const muteSource = readFileSync(resolve(root, 'src/game/show-me.js'), 'utf8');

function createHarness(seed, { stake = 1000, autoComplete = true, muted = false } = {}) {
  const intervals = new Map(), timeouts = new Map(), spoken = [];
  let timerId = 0, songStarts = 0, songStops = 0, cancelled = 0;
  const speech = {
    speaking: false, pending: false,
    cancel() { cancelled++; this.speaking = false; this.pending = false; },
    speak(utterance) {
      spoken.push(utterance.text);
      if (autoComplete) { utterance.onstart?.(); utterance.onend?.(); }
      else { this.speaking = true; this.pending = true; }
    },
  };
  const run = { stake, live: true };
  const window = { W: { run }, speechSynthesis: speech, addEventListener() {} };
  const Music = {
    muted,
    countrySong() { if (this.muted) return false; songStarts++; return true; },
    stopCountrySong() { songStops++; },
    duck() {},
  };
  const context = vm.createContext({
    Date: { now: () => 0 }, Math, performance: { now: () => 0 }, window, W: window.W, Music, scene: 'nested',
    sayVoice: null, pickVoice() {}, sayNow() { return true; }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    $: selector => selector === '.stage' ? { classList: { contains: () => false } } : { textContent: '' },
    setVerdict(o) { return o; },
    ghostReact() {},
    setInterval(callback, ms) { const id = ++timerId; intervals.set(id, { callback, ms }); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback, ms) { const id = ++timerId; timeouts.set(id, { callback, ms }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
  });
  vm.runInContext(source, context);
  vm.runInContext(`phelanSeed = ${seed};`, context);
  return {
    context, run, spoken, intervals, timeouts, speech,
    get songStarts() { return songStarts; },
    get songStops() { return songStops; },
    get cancelled() { return cancelled; },
    finish(o) {
      vm.runInContext('phelanStop()', context);
      vm.runInContext(`setVerdict(${JSON.stringify(o)})`, context);
      run.live = false;
      [...intervals.values()].forEach(timer => timer.callback());
    },
    fireTimeout(ms) {
      const entry = [...timeouts.entries()].find(([, timer]) => timer.ms === ms);
      if (!entry) return false;
      timeouts.delete(entry[0]); entry[1].callback(); return true;
    },
  };
}

const hit = createHarness(7);
vm.runInContext("ghostReact('wince')", hit.context);
hit.finish({ eyebrow: 'Final answer', title: 'A bad spin', steps: [] });
assert.ok(hit.fireTimeout(1500), 'seed 7 should select the one-in-fifteen jingle');
assert.equal(hit.songStarts, 1);
assert.equal(hit.spoken.length, 5);
assert.match(hit.spoken[0], /main wheel/);
assert.match(hit.spoken[1], /€10 and brought home €0/);
assert.match(hit.spoken[2], /€10 went west/);
assert.match(hit.spoken[3], /one slice off a hot prize/i);

const goodRun = createHarness(7);
goodRun.finish({ eyebrow: 'Final answer · €20', title: 'A win', steps: [] });
assert.equal(goodRun.fireTimeout(1500), false, 'a run paying at least its stake must not sing');
assert.equal(goodRun.songStarts, 0);

const miss = createHarness(0);
miss.finish({ eyebrow: 'Final answer', title: 'A bad spin', steps: [] });
assert.equal(miss.fireTimeout(1500), false, 'a bad run outside the seeded chance must not sing');

const mutedBefore = createHarness(7);
mutedBefore.finish({ eyebrow: 'Final answer', title: 'A bad spin', steps: [] });
vm.runInContext('phelanStop()', mutedBefore.context);
assert.equal(mutedBefore.fireTimeout(1500), false, 'Mute must cancel a queued jingle');
assert.equal(mutedBefore.songStarts, 0);

const mutedDuring = createHarness(7, { autoComplete: false });
mutedDuring.finish({ eyebrow: 'Final answer', title: 'A bad spin', steps: [] });
mutedDuring.fireTimeout(1500);
assert.equal(mutedDuring.songStarts, 1);
vm.runInContext('phelanStop()', mutedDuring.context);
assert.equal(mutedDuring.cancelled, 1);
assert.ok(mutedDuring.songStops > 0, 'Mute must stop the backing track');
assert.match(muteSource, /if \(Music\.toggleMute\(\)\) phelanStop\(\)/, 'the Mute button stops Phelan voice');

console.log('Seeded bad-run jingle, odds, verdict details, and Mute checks passed.');
