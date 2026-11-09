import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const content = readFileSync(new URL('../src/game/content.js', import.meta.url), 'utf8');
const start = content.indexOf('const FINAL_POOL = [');
const end = content.indexOf('dealFinal();', start) + 'dealFinal();'.length;
assert.notEqual(start, -1, 'FINAL_POOL exists');
assert.ok(end > start, 'dealFinal exists after FINAL_POOL');

const context = vm.createContext({ Math: Object.create(Math) });
vm.runInContext(`${content.slice(start, end)}\nglobalThis.pool = FINAL_POOL; Object.defineProperty(globalThis, 'slots', { get: () => FINAL }); globalThis.slotTints = SLOT_TINTS; globalThis.deal = dealFinal;`, context);
const pool = context.pool;
assert.ok(pool.length >= 24, `expected at least 24 options, found ${pool.length}`);
assert.equal(new Set(pool.map(option => option.t)).size, pool.length, 'destination names are unique');
for (const option of pool) {
  assert.ok(option.t && option.b, 'each destination has readable result text');
  assert.ok(option.lbl.length <= 2 && option.lbl.every(line => line.length <= 12), `${option.t} has short slot labels`);
}

const reachable = new Set();
for (let seed = 1; seed <= 500; seed++) {
  let state = seed;
  context.Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
  context.deal();
  const deal = context.slots;
  assert.equal(deal.length, 8, 'each deal keeps eight visible slots');
  assert.equal(new Set(deal.map(option => option.t)).size, 8, 'a deal has no duplicate destinations');
  deal.forEach((option, index) => {
    assert.deepEqual(Array.from(option.tint), Array.from(context.slotTints[index]), 'each slot keeps its tint');
    reachable.add(option.t);
  });
}
assert.deepEqual([...reachable].sort(), Array.from(pool, option => option.t).sort(), 'every pool option is reachable');
console.log(`Checked ${pool.length} unique destinations, eight-slot deals, and reachability across 500 deterministic seeds.`);
