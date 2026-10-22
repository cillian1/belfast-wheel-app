import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(resolve(root, 'src/game/core.js'), 'utf8');
const room = readFileSync(resolve(root, 'src/game/room.js'), 'utf8');
const pyramid = readFileSync(resolve(root, 'src/game/pyramid.js'), 'utf8');
const factoryMatch = core.match(/function makeCosmeticRandom\(seed\) \{[\s\S]*?\n\}/);
const roomFrameMatch = room.match(/function drawRoomFrame\(now\) \{[\s\S]*?\n\}/);
const sandStepMatch = pyramid.match(/function sandStep\(dt, rate\) \{[\s\S]*?\n\}/);
if (!factoryMatch || !roomFrameMatch || !sandStepMatch) throw new Error('Could not find the cosmetic RNG or frame effect functions');

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
function outcomes(fps) {
  const gameMath = Object.create(Math);
  gameMath.random = seededRandom(0x12345678);
  const cosmeticRandom = makeCosmeticRandom(0x87654321);
  const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  const drawRoomFrame = new Function('Math', 'RW', 'RH', 'RDp', 'roomBg', 'fireBox', 'EMBERS', 'rctx', 'Perf', 'cosmeticRandom', 'TAU', 'mod', `${roomFrameMatch[0]}; return drawRoomFrame;`)(
    gameMath, 360, 800, 1, {}, { x: 100, y: 300, w: 180, base: 780 }, Array.from({ length: 26 }, (_, i) => ({ x: i / 26, y: i / 26, v: .2, s: 1 })), ctx, { low: false }, cosmeticRandom, Math.PI * 2, (a, n) => ((a % n) + n) % n,
  );
  for (let frame = 0; frame < Math.min(fps, 15) * 5; frame++) drawRoomFrame(frame * 1000 / fps);
  return Array.from({ length: 20 }, () => gameMath.random());
}

assert.deepEqual(outcomes(10), outcomes(30));
assert.deepEqual(outcomes(30), outcomes(60));
console.log('Independent cosmetic frame draws leave seeded gameplay outcomes unchanged at 10, 30, and 60 fps.');
