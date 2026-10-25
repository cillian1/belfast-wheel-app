import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(resolve(root, 'src/game/core.js'), 'utf8');
const room = readFileSync(resolve(root, 'src/game/room.js'), 'utf8');
const pyramid = readFileSync(resolve(root, 'src/game/pyramid.js'), 'utf8');
const motion = readFileSync(resolve(root, 'src/game/motion.js'), 'utf8');
const music = readFileSync(resolve(root, 'src/game/music.js'), 'utf8');
assert.doesNotMatch(music, /Math\.random\(/, 'background music must never advance gameplay RNG');
assert.match(music, /cosmeticRandom\(/, 'audio noise and beat offsets use cosmetic RNG');
// Exercise audio initialisation and scheduled beats with gameplay RNG forbidden.
// Changing the number/timing of audio callbacks must only consume cosmetic draws.
{
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), detune: param(), threshold: param(), ratio: param(), Q: param(), connect() {}, start() {}, stop() {} });
  const audio = { currentTime: 0, sampleRate: 32, destination: {}, createBuffer: () => ({ getChannelData: () => new Float32Array(32) }) };
  for (const name of ['Gain', 'DynamicsCompressor', 'BiquadFilter', 'Oscillator', 'BufferSource']) audio['create' + name] = node;
  const timers = [];
  let draws = 0;
  const gameMath = Object.create(Math);
  gameMath.random = () => { throw new Error('Music consumed gameplay RNG'); };
  const runtime = new Function('Math', 'cosmeticRandom', 'AC', 'localStorage', 'window', 'document', 'setInterval', 'clearInterval', 'setEffectsMuted', `${music}; return Music;`)(
    gameMath, () => { draws++; return .25; }, audio, { getItem() { return null; } }, {}, { hidden: false, addEventListener() {} },
    callback => { timers.push(callback); return timers.length; }, () => {}, () => {},
  );
  runtime.start(); runtime.setLevel(4);
  for (let i = 0; i < 40; i++) { audio.currentTime = i / 4; timers[0](); }
  assert.ok(draws > audio.sampleRate + 3, 'scheduled beats actually exercise cosmetic noise offsets');
}
const factoryMatch = core.match(/function makeCosmeticRandom\(seed\) \{[\s\S]*?\n\}/);
const roomFrameMatch = room.match(/function drawRoomFrame\(now\) \{[\s\S]*?\n\}/);
const sandStepMatch = pyramid.match(/function sandStep\(dt, rate\) \{[\s\S]*?\n\}/);
const spinMatch = motion.match(/async function spinLayerRun\(k, dur, dir\) \{[\s\S]*?\n\}/);
const physicsMatch = core.match(/function physicsFrames\(\) \{[\s\S]*?\n\}/);
assert.ok(physicsMatch, 'fixed physics scheduler exists');
function physicsTicks(fps) {
  let now = 0, frames = [];
  const request = new Function('performance', 'requestAnimationFrame', `${physicsMatch[0]}; return physicsFrames();`)(
    { now: () => now }, callback => { frames.push(callback); },
  );
  const times = [];
  const step = time => { times.push(time); if (times.length < 120) request(step); };
  request(step);
  for (let i = 0; times.length < 120; i++) {
    assert.ok(i < 2000, 'physics scheduler finishes');
    now += 1000 / fps;
    const pending = frames; frames = [];
    pending.forEach(callback => callback(now));
  }
  return times;
}
for (const fps of [10, 30, 120]) assert.deepEqual(physicsTicks(fps), physicsTicks(60), 'display rate must not alter physics timestamps or tick count');
const targetMatch = motion.match(/function target\(n\) \{[\s\S]*?\n\}/);
if (!factoryMatch || !roomFrameMatch || !sandStepMatch || !spinMatch || !targetMatch) throw new Error('Could not find the RNG, frame effect, or wheel-spin functions');

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
  const spinLayerRun = new Function('Math', 'LAYERS', 'rot', 'TAU', 'GHOST_CHANCE', 'TIP_CHANCE', 'TEASE_CHANCE', 'target', 'easeOut', 'easeInOut', 'lerp', 'sliceAt', 'mod', 'hotSlice', 'animate', 'ghostPhelan', 'ghostReact', 'tick', 'flap', 'pegBuzz', 'draw', 'ting', 'buzz', `${spinMatch[0]}; return spinLayerRun;`)(
    gameMath, layers, layerAngles, Math.PI * 2, .05, .3, 1 / 3, new Function('Math', 'TAU', `${targetMatch[0]}; return target;`)(gameMath, Math.PI * 2), t => 1 - (1 - t) ** 4,
    t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, (a, b, t) => a + (b - a) * t,
    (r, n) => Math.floor((((-r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / n)) % n,
    (a, n) => ((a % n) + n) % n, it => !!(it && (it.wild || it.bonus || it.god)), animate,
    async (k, i) => i, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {},
  );
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await spinLayerRun(i % 2, 1000, 1));
  return results;
}

assert.deepEqual(await outcomes(10), await outcomes(30));
assert.deepEqual(await outcomes(30), await outcomes(60));
assert.deepEqual(await outcomes(60), await outcomes(120));
console.log('Seeded wheel-spin outcomes match at 10, 30, 60, and 120 fps with fireplace frames interleaved.');

async function tickerOutcomes() {
  const gameMath = Object.create(Math);
  gameMath.random = seededRandom(0x5eed1234);
  const layers = [Array.from({ length: 8 }, () => ({})), Array.from({ length: 8 }, () => ({}))];
  layers[1][3] = { wild: true };
  const rotations = [0, 0], runs = [];
  const spinLayerRun = new Function('Math', 'LAYERS', 'rot', 'TAU', 'GHOST_CHANCE', 'TIP_CHANCE', 'TEASE_CHANCE', 'target', 'easeOut', 'easeInOut', 'lerp', 'sliceAt', 'mod', 'hotSlice', 'animate', 'ghostPhelan', 'ghostReact', 'tick', 'flap', 'pegBuzz', 'draw', 'ting', 'buzz', `${spinMatch[0]}; return spinLayerRun;`)(
    gameMath, layers, rotations, Math.PI * 2, 0, .3, 1 / 3, n => ({ i: 2, a: 2.5 * Math.PI / n }), t => 1 - (1 - t) ** 4,
    t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, (a, b, t) => a + (b - a) * t,
    (r, n) => Math.floor((((-r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / n)) % n,
    (a, n) => ((a % n) + n) % n, it => !!(it && (it.wild || it.bonus || it.god)),
    async (duration, step) => { runs.at(-1).durations.push(duration); step(1); },
    async (k, i) => i, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {},
  );
  for (let i = 0; i < 30000; i++) {
    runs.push({ durations: [] });
    runs[i].result = await spinLayerRun(1, 100, 1);
  }
  return runs;
}

const tickerRuns = await tickerOutcomes();
const teased = tickerRuns.filter(run => run.durations.includes(1300) || run.durations.includes(1500));
const tipped = tickerRuns.filter(run => run.durations.includes(1500));
const notTeased = tickerRuns.filter(run => !run.durations.includes(1300) && !run.durations.includes(1500));
assert.ok(teased.length > 9300 && teased.length < 10700, `teases occurred ${teased.length} times, expected about one third`);
assert.ok(tipped.length > 2700 && tipped.length < 3300, `tips occurred ${tipped.length} times, expected about 10% of near misses`);
assert.ok(notTeased.every(run => run.durations.length === 1 && run.result === 2), 'non-teased near misses must use the ordinary stop without a lean');
assert.ok(tipped.every(run => run.result === 3), 'every tip must land from a normal slice onto the adjacent special');
assert.ok(tickerRuns.filter(run => run.result === 3).length === tipped.length, 'only tips may land on the adjacent special');
console.log('Seeded ticker test confirms about one-third of near misses tease, about 10% tip, and tips land on the special.');
