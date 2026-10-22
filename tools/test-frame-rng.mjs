import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(resolve(root, 'src/game/core.js'), 'utf8');
const room = readFileSync(resolve(root, 'src/game/room.js'), 'utf8');
const pyramid = readFileSync(resolve(root, 'src/game/pyramid.js'), 'utf8');
const motion = readFileSync(resolve(root, 'src/game/motion.js'), 'utf8');
const factoryMatch = core.match(/function makeCosmeticRandom\(seed\) \{[\s\S]*?\n\}/);
const roomFrameMatch = room.match(/function drawRoomFrame\(now\) \{[\s\S]*?\n\}/);
const sandStepMatch = pyramid.match(/function sandStep\(dt, rate\) \{[\s\S]*?\n\}/);
const spinMatch = motion.match(/async function spinLayerRun\(k, dur, dir\) \{[\s\S]*?\n\}/);
const targetMatch = motion.match(/function target\(n\) \{[\s\S]*?\n\}/);
const waitMatch = motion.match(/const pendingWaits = new Set\(\);\nconst wait = ms => new Promise\(r => \{[\s\S]*?\n\}\);/);
const skipMatch = motion.match(/document\.addEventListener\('pointerdown', e => \{[\s\S]*?\}, true\);/);
if (!factoryMatch || !roomFrameMatch || !sandStepMatch || !spinMatch || !targetMatch || !waitMatch || !skipMatch) throw new Error('Could not find the RNG, frame effect, wheel-spin, or wait functions');

const makeCosmeticRandom = new Function(`${factoryMatch[0]}; return makeCosmeticRandom;`)();
assert.doesNotMatch(roomFrameMatch[0], /Math\.random\(/, 'fireplace frames must not advance the gameplay RNG');
assert.match(roomFrameMatch[0], /cosmeticRandom\(/, 'fireplace frames should use the cosmetic RNG');
assert.doesNotMatch(sandStepMatch[0], /Math\.random\(/, 'ambient sand frames must not advance the gameplay RNG');

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
async function outcomes(fps) {
  const gameMath = Object.create(Math);
  gameMath.random = seededRandom(0x12345678);
  const cosmeticRandom = makeCosmeticRandom(0x87654321);
  const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  const drawRoomFrame = new Function('Math', 'RW', 'RH', 'RDp', 'roomBg', 'fireBox', 'EMBERS', 'rctx', 'Perf', 'cosmeticRandom', 'TAU', 'mod', `${roomFrameMatch[0]}; return drawRoomFrame;`)(
    gameMath, 360, 800, 1, {}, { x: 100, y: 300, w: 180, base: 780 }, Array.from({ length: 26 }, (_, i) => ({ x: i / 26, y: i / 26, v: .2, s: 1 })), ctx, { low: false }, cosmeticRandom, Math.PI * 2, (a, n) => ((a % n) + n) % n,
  );
  const layerAngles = [0, 0], layers = [Array.from({ length: 8 }, () => ({})), Array.from({ length: 8 }, () => ({}))];
  const animate = async (dur, step) => {
    const frameCount = Math.max(1, Math.round(fps * dur / 1000)), roomInterval = 1000 / Math.min(fps, 15);
    let nextRoomFrame = 0;
    for (let frame = 0; frame <= frameCount; frame++) {
      const now = frame * dur / frameCount;
      if (now >= nextRoomFrame) { drawRoomFrame(now); nextRoomFrame += roomInterval; }
      step(frame / frameCount);
    }
  };
  const spinLayerRun = new Function('Math', 'LAYERS', 'rot', 'TAU', 'GHOST_CHANCE', 'TIP_CHANCE', 'target', 'easeOut', 'easeInOut', 'sliceAt', 'mod', 'hotSlice', 'animate', 'ghostPhelan', 'tick', 'flap', 'pegBuzz', 'draw', 'ting', 'buzz', `${spinMatch[0]}; return spinLayerRun;`)(
    gameMath, layers, layerAngles, Math.PI * 2, .05, .1, new Function('Math', 'TAU', `${targetMatch[0]}; return target;`)(gameMath, Math.PI * 2), t => 1 - (1 - t) ** 4,
    t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
    (r, n) => Math.floor((((-r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / n)) % n,
    (a, n) => ((a % n) + n) % n, it => !!(it && (it.wild || it.bonus || it.god)), animate,
    async (k, i) => i, () => {}, () => {}, () => {}, () => {}, () => {}, () => {},
  );
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await spinLayerRun(i % 2, 1000, 1));
  return results;
}

assert.deepEqual(await outcomes(10), await outcomes(30));
assert.deepEqual(await outcomes(30), await outcomes(60));

async function checkWaits() {
  let nextTimer = 0, scheduledMs = 0;
  const timers = new Map(), listeners = {};
  const setTimer = (fn, ms) => { scheduledMs = ms; const id = ++nextTimer; timers.set(id, fn); return id; };
  const clearTimer = id => timers.delete(id);
  const document = { addEventListener(type, fn) { listeners[type] = fn; } };
  const runtime = new Function('reduce', 'setTimeout', 'clearTimeout', 'document', `${waitMatch[0]}\n${skipMatch[0]}\nreturn { wait, pendingWaits };`)(
    false, setTimer, clearTimer, document,
  );
  const normal = runtime.wait(1000);
  assert.equal(scheduledMs, 750, 'long waits should be shortened by 25% in milliseconds');
  assert.equal(runtime.pendingWaits.size, 1);
  [...timers.values()][0]();
  await normal;
  assert.equal(runtime.pendingWaits.size, 0);
  assert.equal(timers.size, 0);

  const skipped = runtime.wait(450);
  assert.equal(scheduledMs, 450, 'short waits should keep their intended duration');
  let prevented = false, stopped = false;
  listeners.pointerdown({ preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
  await skipped;
  assert.equal(runtime.pendingWaits.size, 0, 'a pointer tap should release the wait');
  assert.equal(timers.size, 0, 'skipping should clear the timer');
  assert.equal(prevented, true, 'the skip tap should not activate the next phase');
  assert.equal(stopped, true);
}

await checkWaits();
console.log('Seeded wheel-spin outcomes match at 10, 30, and 60 fps with fireplace frames interleaved; wait timers are shortened and skippable.');
