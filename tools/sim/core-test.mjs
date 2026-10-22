import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createCore, seededRandom } from './core.mjs';

const random = seededRandom(123), same = seededRandom(123);
for (let i = 0; i < 100; i++) {
  const value = random();
  assert.equal(value, same());
  assert.ok(value >= 0 && value < 1);
}
const spin = createCore(), kinds = new Set();
let gold = false, backUp = false, hidden = false;
for (let seed = 1; seed <= 200; seed++) {
  const record = await spin(seed, .10, true);
  assert.deepEqual(await createCore()(seed, .10, true), record, `state leaked into seed ${seed}`);
  kinds.add(record.result.k);
  gold ||= !!record.result.g;
  const wheels = record.trace.map(t => t[1]);
  backUp ||= wheels.some((k, i) => i > 0 && k < wheels[i - 1]);
  hidden ||= wheels.includes(5);
}
assert.ok(kinds.has('D') && kinds.has('-') && kinds.has('W') && kinds.has('B'));
assert.ok(gold && backUp && hidden, 'seeds must cover golden runs, go back up and the hidden wheel');
const run = workers => JSON.parse(execFileSync(process.execPath, [
  new URL('./run.mjs', import.meta.url).pathname, '--spins', '200', '--workers', String(workers),
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assert.deepEqual(run(1), run(4), 'worker partitioning must not change paths or record count');
assert.equal(run(3).length, 200, 'non-divisible worker partitions must not overrun');
console.log('Core RNG, fresh-spin isolation, path coverage and worker partitioning passed.');
