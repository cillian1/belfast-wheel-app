import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore, seededRandom } from './core.mjs';
import { liveTipChance, sources } from './core-source.mjs';

const random = seededRandom(123), same = seededRandom(123);
for (let i = 0; i < 100; i++) {
  const value = random();
  assert.equal(value, same());
  assert.ok(value >= 0 && value < 1);
}
const spin = createCore(sources), kinds = new Set();
let gold = false, backUp = false, hidden = false;
for (let seed = 1; seed <= 200; seed++) {
  const record = await spin(seed, .10, true);
  assert.deepEqual(await createCore(sources)(seed, .10, true), record, `state leaked into seed ${seed}`);
  kinds.add(record.result.k);
  gold ||= !!record.result.g;
  const wheels = record.trace.map(t => t[1]);
  backUp ||= wheels.some((k, i) => i > 0 && k < wheels[i - 1]);
  hidden ||= wheels.includes(5);
}
assert.ok(kinds.has('D') && kinds.has('-') && kinds.has('W') && kinds.has('B'));
assert.ok(gold && backUp && hidden, 'seeds must cover golden runs, go back up and the hidden wheel');
const run = (workers, tip) => {
  const args = [new URL('./run.mjs', import.meta.url).pathname, '--engine', 'node', '--spins', '200', '--workers', String(workers)];
  if (tip !== undefined) args.push('--tip', String(tip));
  return JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
};
assert.deepEqual(run(1), run(1, liveTipChance), 'runner default must match the live tip chance');
assert.deepEqual(run(1), run(4), 'worker partitioning must not change paths or record count');
assert.equal(run(3).length, 200, 'non-divisible worker partitions must not overrun');
console.log('Core RNG, fresh-spin isolation, path coverage and worker partitioning passed.');

const fullRun = workers => JSON.parse(execFileSync(process.execPath, [
  new URL('./run.mjs', import.meta.url).pathname, '--engine', 'core', '--spins', '205',
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
  const race = execFileSync('python3', [
    new URL('./race.py', import.meta.url).pathname, temp, '0',
  ], { encoding: 'utf8' });
  assert.match(race, /baseline \(game 28\).*mark\/spin\s+15\.000/,
    'race analysis must use the recorded 3x stacked chicken multiplier');
  assert.match(race, /stacking, x2 per extra token.*mark\/spin\s+15\.000/,
    'stack analysis must use the recorded token count');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log('Stacked chicken records round-trip through race.py.');
