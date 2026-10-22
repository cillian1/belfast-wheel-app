import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    race: 1, n: 2, sp: 2, sw: 1, sb: 1,
    ch: [
      { special: 'W', count: 2, mult: 3 },
      { special: 'B', count: 1, mult: 1.5 },
    ],
  }]));
  const race = execFileSync(process.platform === 'win32' ? 'py' : 'python3', [
    ...(process.platform === 'win32' ? ['-3'] : []), simFile('./race.py'), temp, '0',
  ], { encoding: 'utf8' });
  const raceChance = Number(readFileSync(simFile('../../src/game/chicken-race.js'), 'utf8')
    .match(/\bconst RACE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/)[1]);
  const config = JSON.parse(readFileSync(simFile('../../src/config.json'), 'utf8'));
  assert.ok(race.includes(`payback inputs: race chance=${raceChance.toFixed(3)} EV=${config.ev.toFixed(2)} edge=${config.edge.toFixed(3)}`),
    'payback analysis must use the live race chance and payout constants');
  assert.match(race, /Mark wheel EV\/farm before 12\.500 after 15\.000/,
    'Mark analysis must weight a stacked wedge by its token count');
  const raceEV = race.match(/current odds \(weighted Mark wedges\)\s+race\/spin\s+([\d.]+)/);
  assert.ok(raceEV && Number(raceEV[1]) > 24 && Number(raceEV[1]) < 29,
    'current race analysis must give the top tag to the strongest special, as the live game does');
  const payback = race.match(/payback before ([\d.]+)% after ([\d.]+)%/);
  assert.ok(payback && Number(payback[2]) > Number(payback[1]),
    'race analysis must report increased paired payback for the restored weighted odds');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log('Stacked chicken records round-trip through race.py.');
