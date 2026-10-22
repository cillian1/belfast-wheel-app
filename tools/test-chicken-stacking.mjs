import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mark = readFileSync(resolve(root, 'src/game/mark-ending.js'), 'utf8');
const race = readFileSync(resolve(root, 'src/game/chicken-race.js'), 'utf8');
const extract = (source, name) => {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`Could not find ${name}`);
  return match[0];
};

const stats = new Function(`${extract(mark, 'specialChickenStats')}; return specialChickenStats;`)();
const addSpecialChicken = new Function(`${extract(mark, 'specialChickenStats')}; ${extract(mark, 'addSpecialChicken')}; return addSpecialChicken;`)();
const drawSize = new Function(`${extract(mark, 'chickenDrawSize')}; return chickenDrawSize;`)();
const markPrize = new Function(`${extract(mark, 'markSpecialPrize')}; return markSpecialPrize;`)();
const raceHelpers = new Function(`${extract(race, 'raceBigAt')}; ${extract(race, 'raceTagValue')}; return { raceBigAt, raceTagValue };`)();

assert.deepEqual([1, 2, 3].map(stats), [
  { mult: 1.5, size: 1 },
  { mult: 3, size: 2 },
  { mult: 6, size: 4 },
]);
const stacks = {};
const firstGold = addSpecialChicken(stacks, 'W', { special: 'W' });
const secondGold = addSpecialChicken(stacks, 'W', { special: 'W' });
const firstPurple = addSpecialChicken(stacks, 'B', { special: 'B' });
assert.equal(secondGold.ch, firstGold.ch, 'a second gold token joins the existing gold chicken');
assert.deepEqual(Object.keys(stacks).sort(), ['B', 'W'], 'each special kind has one chicken');
assert.deepEqual([secondGold.ch.count, secondGold.ch.mult, secondGold.stats.size], [2, 3, 2]);
assert.deepEqual([firstPurple.ch.count, firstPurple.ch.mult], [1, 1.5]);
assert.equal(drawSize({ size: 4 }), 2.2, 'drawn chicken size is capped');
assert.deepEqual([1.5, 3, 6].map(mult => markPrize('W', mult)), [10, 20, 40]);
assert.deepEqual([1.5, 3, 6].map(mult => markPrize('B', mult)), [5, 10, 20]);

const gold = { special: 'W', mult: 3 }, purple = { special: 'B', mult: 6 }, plain = {};
assert.equal(raceHelpers.raceBigAt([gold, purple, plain], 2), 1, 'highest-multiplier special gets the big tag');
assert.equal(raceHelpers.raceBigAt([{ special: 'B', mult: 3 }, gold], 0), 1, 'gold wins a multiplier tie');
assert.equal(raceHelpers.raceBigAt([plain, {}], 1), 1, 'races without specials keep the random big-tag slot');
assert.equal(raceHelpers.raceTagValue(100, gold), 300);
assert.equal(raceHelpers.raceTagValue(100, plain), 100);

assert.match(mark, /const specialChickens = \{\};/);
assert.match(mark, /if \(!growing\) chickens\.push\(ch\);/);
assert.match(race, /const RACE_CHANCE = \.16/);

console.log('Stacked chicken multipliers, size cap, Mark prizes, and race big-tag selection are correct.');
