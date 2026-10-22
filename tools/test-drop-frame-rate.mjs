import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/game/ball-physics.js'), 'utf8');
const physicsMatch = source.match(/function physicsStep\(dt\) \{[\s\S]*?\n\}/);
const runMatch = source.match(/function runDrop\(maxMs\) \{[\s\S]*?\n\}/);
if (!physicsMatch || !runMatch) throw new Error('Could not find drop physics functions');

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

async function drop(fps) {
  let now = 0, nextFrame = null, randomCalls = 0;
  const math = Object.create(Math);
  const random = seededRandom(0x12345678);
  math.random = () => { randomCalls++; return random(); };
  const N = 512, count = 32, m = N * .045, w = (N - 2 * m) / 8, ballR = N * .017 * Math.sqrt(42 / count);
  const B = { m, w, slotTop: N * .66, floor: N * .9, pr: N * .0085, dw: N * .004, pegs: [], divs: [] };
  for (let row = 0; row < 7; row++) {
    const y = N * (.34 + .26 * row / 6);
    if (row % 2 === 0) for (let j = 0; j < 8; j++) B.pegs.push({ x: m + w * (j + .5), y });
    else for (let j = 1; j < 8; j++) B.pegs.push({ x: m + w * j, y });
  }
  for (let j = 1; j < 8; j++) B.divs.push(m + w * j);
  const balls = Array.from({ length: count }, (_, i) => ({
    free: false, x: m + w * (.5 + (i % 8)), y: N * .3, vx: 0, vy: 0,
    rel: 60 + i / count * 1500,
  }));
  const performance = { now: () => now };
  const physicsStep = new Function('Math', 'performance', 'N', 'ballR', 'balls', 'B', 'tick', `let lastPeg = 0;\n${physicsMatch[0]}; return physicsStep;`)(
    math, performance, N, ballR, balls, B, () => {},
  );
  const draw = () => {};
  const runDrop = new Function('Math', 'performance', 'requestAnimationFrame', 'physicsStep', 'N', 'balls', 'B', 'ballR', 'rotF', 'draw', `${source.match(/const DROP_HZ = .*;/)[0]}\n${runMatch[0]}; return runDrop;`)(
    math, performance, fn => { nextFrame = fn; }, physicsStep, N, balls, B, ballR, 0, draw,
  );
  let done = false;
  const finished = runDrop(16000).then(() => { done = true; });
  while (!done) {
    assert.ok(nextFrame, 'runDrop should schedule another animation frame');
    const frame = nextFrame;
    nextFrame = null;
    now += 1000 / fps;
    frame(now);
    await Promise.resolve();
  }
  await finished;
  const slots = Array(8).fill(0);
  balls.forEach(ball => slots[Math.max(0, Math.min(7, Math.floor((ball.x - m) / w)))]++);
  return { slots, randomCalls };
}

const baseline = await drop(10);
for (const fps of [30, 60, 120]) assert.deepEqual(await drop(fps), baseline, `seeded drop differs at ${fps} fps`);
console.log('Seeded fixed-step ball-drop slots and gameplay RNG draws match at 10, 30, 60, and 120 fps.');
