import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore, seededRandom } from './core.mjs';
import { liveTipChance, sources } from './core-source.mjs';

const simFile = name => fileURLToPath(new URL(name, import.meta.url));
const random = seededRandom(123), same = seededRandom(123);
for (let i = 0; i < 100; i++) {
  const value = random();
  assert.equal(value, same());
  assert.ok(value >= 0 && value < 1);
}
const spin = createCore(sources), kinds = new Set();
let gold = false, backUp = false, hidden = false;
let landedU2 = false, landedD2 = false, clampedTop = false, clampedBottom = false, clampedHiddenBottom = false;
let seedU2, seedD2, seedTop, seedBottom, seedHiddenBottom;
for (let seed = 1; seed <= 10000 && !(landedU2 && landedD2 && clampedTop && clampedBottom && clampedHiddenBottom); seed++) {
  const record = await spin(seed, .10, true);
  assert.deepEqual(await createCore(sources)(seed, .10, true), record, `state leaked into seed ${seed}`);
  kinds.add(record.result.k);
  gold ||= !!record.result.g;
  const wheels = record.trace.filter(t => t[0] === 'wheel').map(t => t[1]);
  backUp ||= wheels.some((k, i) => i > 0 && k < wheels[i - 1]);
  hidden ||= wheels.includes(5);
  record.trace.forEach((event, i) => {
    if (event[0] !== 'wheel') return;
    if (event[4] === 'U2' && !landedU2) { landedU2 = true; seedU2 = seed; }
    if (event[4] === 'D2' && !landedD2) { landedD2 = true; seedD2 = seed; }
    const move = record.trace[i + 1];
    if (event[4] === 'U2' && event[1] === 1 && move &&
        move[1] === 1 && move[2] === -2 && move[3] === 4 && move[4] === 0) { clampedTop = true; seedTop ||= seed; }
    if (event[4] === 'D2' && event[1] === 4 && move &&
        move[1] === 4 && move[2] === 2 && move[3] === 4 && move[4] === 4) { clampedBottom = true; seedBottom ||= seed; }
    if (event[4] === 'D2' && event[1] === 5 && move &&
        move[1] === 5 && move[2] === 2 && move[3] === 5 && move[4] === 5) { clampedHiddenBottom = true; seedHiddenBottom ||= seed; }
  });
}
assert.ok(kinds.has('D') && kinds.has('-') && kinds.has('W') && kinds.has('B'));
assert.ok(gold && backUp && hidden, 'seeds must cover golden runs, go back up and the hidden wheel');
assert.ok(landedU2 && landedD2, 'seeded paths must land on both double-arrow wedges');
assert.ok(clampedTop && clampedBottom && clampedHiddenBottom, 'seeded paths must cover the top and both deepest-level clamps');
const orderBlock = sources.content.match(/const LAYER_ORDERS = \[([\s\S]*?)\n\];/);
assert.ok(orderBlock, 'layer orders must remain available for replacement checks');
const orders = [...orderBlock[1].matchAll(/\[([^\]]*)\]/g)].map(([, order]) =>
  [...order.matchAll(/'([^']+)'/g)].map(([, move]) => move));
assert.deepEqual(orders.map(order => order.length), [44, 22, 22, 23, 28],
  'double arrows replace existing wedges without changing wheel sizes');
assert.ok(orders.every(order => order.filter(move => move === 'D2').length === 1 &&
  order.filter(move => move === 'U2').length === 1), 'each inner wheel has exactly one of each double arrow');
assert.deepEqual(orders.map(order => order.indexOf('D2') + 1), [5, 9, 16, 2, 2],
  'the tested D2 placement is on wheel 3 wedge 16');
assert.deepEqual(orders.map(order => order.indexOf('U2') + 1), [7, 13, 20, 21, 12],
  'U2 uses the tested placement on all five inner wheels');
console.log(`D2 seed ${seedD2}, U2 seed ${seedU2}; top clamp ${seedTop}, deepest clamps ${seedBottom}/${seedHiddenBottom}.`);
const run = (workers, tip) => {
  const args = [simFile('./run.mjs'), '--engine', 'node', '--spins', '200', '--workers', String(workers)];
  if (tip !== undefined) args.push('--tip', String(tip));
  return JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
};
assert.deepEqual(run(1), run(1, liveTipChance), 'runner default must match the live tip chance');
assert.deepEqual(run(1), run(4), 'worker partitioning must not change paths or record count');
assert.equal(run(3).length, 200, 'non-divisible worker partitions must not overrun');
console.log('Core RNG, fresh-spin isolation, path coverage and worker partitioning passed.');

const fullRun = workers => JSON.parse(execFileSync(process.execPath, [
  simFile('./run.mjs'), '--engine', 'core', '--spins', '205',
  '--seed', '1500', '--workers', String(workers),
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const full = fullRun(1);
assert.equal(full.length, 205);
assert.ok(full.some(r => r.race), 'full paths must reach the race sampler');
assert.ok(full.every(r => r.k !== 'D'), 'full engine must not emit partial dice paths');
assert.ok(full.filter(r => r.race).every(r => Array.isArray(r.ch) && r.ch.length === r.sp &&
  r.ch.every(ch => ch.special && ch.count > 0 && ch.mult === 1.5 * 2 ** (ch.count - 1))),
  'race records must preserve special chicken counts and multipliers');
assert.deepEqual(fullRun(3), full, 'full worker scheduling must preserve seed order and outcomes');
console.log('Chromium full-path batch isolation and worker partitioning passed.');

const tempDir = mkdtempSync(join(tmpdir(), 'sim-race-'));
const temp = join(tempDir, 'stacked.json');
try {
  writeFileSync(temp, JSON.stringify([{
    race: 1, n: 1, sp: 1, sw: 1, sb: 0,
    ch: [{ special: 'W', count: 2, mult: 3 }],
  }]));
  const race = execFileSync(process.platform === 'win32' ? 'py' : 'python3', [
    ...(process.platform === 'win32' ? ['-3'] : []), simFile('./race.py'), temp, '0',
  ], { encoding: 'utf8' });
  assert.match(race, /baseline \(game 28\).*mark\/spin\s+15\.000/,
    'race analysis must use the recorded 3x stacked chicken multiplier');
  assert.match(race, /stacking, x2 per extra token.*mark\/spin\s+15\.000/,
    'stack analysis must use the recorded token count');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log('Stacked chicken records round-trip through race.py.');
