// Rebalance contract: better ordinary Pyramid doors are funded by smaller race
// tags and Monster awards. Exercise release source and its stake conversion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const cfg = JSON.parse(read('src/config.json'));
const money = read('src/wallet/money.js').match(/window\.\$m = function \(v\) \{[\s\S]*?\n  \};/);
assert.ok(money, 'exercise the actual wallet prize conversion');
const wallet = vm.createContext({ window: {}, W: { stake: 20, cfg, run: null } });
vm.runInContext(money[0], wallet);
const cents = value => Math.round(Number(wallet.window.$m(value)) * 100);

// Evaluate the real door construction at each possible integer result. This
// also checks all three doors use the same payout range, independently of wild.
const doors = read('src/game/pyramid.js').match(/pyr\.doors = \[0, 1, 2\]\.map\([^\n]+;/);
assert.ok(doors, 'actual Pyramid door construction is available');
const amounts = [];
for (let outcome = 0; outcome < 15; outcome++) {
  const math = Object.create(Math);
  math.random = () => (outcome + .5) / 15;
  const room = vm.createContext({ Math: math, pyr: {}, wildDoor: 1 });
  vm.runInContext(doors[0], room);
  assert.deepEqual(Array.from(room.pyr.doors, door => door.wild), [false, true, false]);
  for (const door of room.pyr.doors) {
    assert.equal(door.amt, 240 + 10 * outcome, 'Pyramid ordinary-door prize schedule');
    amounts.push(door.amt);
  }
}
const minimum = cents(Math.min(...amounts)), maximum = cents(Math.max(...amounts));
assert.ok(minimum >= 300 && maximum <= 500,
  `released 20c ordinary-door range must fit €3–€5, got ${minimum}–${maximum} cents`);
assert.ok(minimum > cents(200), 'new lowest door beats even the previous best ordinary door');

// Tags are the actual prize later returned by chickenRace. Deduct once after
// the special multiplier, so a stacked chicken does not multiply the haircut.
const noRandom = Object.create(Math);
noRandom.random = () => { throw new Error('payout helpers must not draw gameplay randomness'); };
const race = vm.createContext({ Math: noRandom });
vm.runInContext(read('src/game/chicken-race.js').split('function drawRaceLine')[0] +
  ';globalThis.tag = raceTagValue;', race);
for (const base of [5, 8, 10, 12, 15, 20, 25, 30, 80, 100, 120]) {
  for (const chicken of [{}, { special: 'W', mult: 1.5 }, { special: 'B', mult: 3 }, { special: 'W', mult: 6 }]) {
    const previous = chicken.special ? Math.round(base * chicken.mult) : base;
    const current = race.tag(base, chicken);
    assert.equal(current, Math.max(1, previous - 8), '8-base haircut follows multiplier and keeps a positive tag');
    assert.ok(current > 0 && current <= previous);
    if (previous > 8) assert.ok(Math.abs(cents(previous) - cents(current) - 10) <= 1,
      'ordinary 20c stake haircut is approximately10c, allowing cent rounding');
  }
}
assert.equal(race.tag(100, { special: 'W', mult: 3 }), 292);

// Every tank tier and overflow unit is reduced by the same10%, preserving the
// tier boundaries, overflow capacity and monotonic payout behavior.
const tank = vm.createContext({ Math: noRandom, $m: wallet.window.$m });
vm.runInContext(read('src/game/bonus-round.js').split('const COSMIC')[0] +
  ';globalThis.prize = monsterPrize;', tank);
const oldTiers = [{ at: 0, v: 30 }, { at: 68, v: 50 }, { at: 78, v: 80 }, { at: 90, v: 150 }];
let last = 0;
for (let total = 0; total <= 400; total++) {
  const oldBase = oldTiers.reduce((value, tier) => total >= tier.at ? tier.v : value, 30);
  const oldOverflow = Math.max(0, total - 120) * 150 / 120;
  const current = tank.prize(total);
  assert.ok(Math.abs(current.base - oldBase * .9) < 1e-10, 'Monster base tier receives10% reduction');
  assert.ok(Math.abs(current.overflow - oldOverflow * .9) < 1e-10, 'overflow receives the same reduction once');
  assert.ok(Math.abs(current.total - (current.base + current.overflow)) < 1e-10);
  assert.ok(current.total >= last, 'Monster remains monotonic');
  last = current.total;
}
assert.equal(tank.prize(120).overflow, 0);
assert.equal(tank.prize(144).total, 162);
console.log(`Payout rebalance: ordinary Pyramid doors €${(minimum / 100).toFixed(2)}–€${(maximum / 100).toFixed(2)} at20c; positive race tags with one haircut; Monster tiers/overflow10% lower.`);
