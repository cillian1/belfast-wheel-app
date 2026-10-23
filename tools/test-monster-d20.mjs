import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { tank } = require('./sim/monster-tank.js');
const levels = JSON.parse(readFileSync(resolve(root, 'tools/sim/tables.json'), 'utf8')).LV;
const bonus = readFileSync(resolve(root, 'src/game/bonus-round.js'), 'utf8');
assert.match(bonus, /const TANK_LEVELS = \[\{ at: 0, v: 30 \}, \{ at: 68, v: 50 \}, \{ at: 78, v: 80 \}, \{ at: 90, v: 150 \}\]/);
assert.match(bonus, /const TANK_CAP = 120;/);
assert.match(bonus, /const fy = lvlY\(Math\.min\(M\.fill, TANK_CAP\)\)/, 'tank rendering never overflows its 120-can cap');
const start = bonus.indexOf('// a dodecahedron:');
const end = bonus.indexOf('// sprites', start);
assert.ok(start >= 0 && end > start, 'Monster Room die geometry is present');
const geometry = vm.runInNewContext(`${bonus.slice(start, end)}\n({ D12, D20, d20PipLayout, monsterPips, drawMonsterDie })`, {
  TAU: Math.PI * 2,
  unit3(v) {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  },
  mv(M, p) {
    return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
  },
});

assert.equal(geometry.D12.length, 12, 'ordinary dice remain d12s');
assert.ok(geometry.D12.every(face => face.vs.length === 5), 'ordinary d12 faces remain pentagons');
assert.equal(geometry.D20.length, 20, 'special dice have twenty faces');
assert.ok(geometry.D20.every(face => face.vs.length === 3), 'special d20 faces are triangles');
assert.deepEqual(Array.from(geometry.D20, face => face.val).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
for (const face of geometry.D20) {
  for (let i = 0; i < 3; i++) {
    const a = face.vs[i], b = face.vs[(i + 1) % 3];
    assert.ok(Math.abs(Math.hypot(...a.map((x, axis) => x - b[axis])) - 2) < 1e-6, 'd20 faces have equal edges');
  }
  const opposite = geometry.D20.find(other => Math.hypot(...face.n.map((x, i) => x + other.n[i])) < 1e-6);
  assert.ok(opposite && face.val + opposite.val === 21, 'opposite d20 faces sum to 21');
}
for (let value = 1; value <= 20; value++) {
  const face = geometry.D20.find(item => item.val === value);
  assert.equal(geometry.d20PipLayout(value).length, value, `d20 face ${value} shows one dot per can`);
  assert.equal(geometry.monsterPips(face, 0, 0, 100, [1, 0, 0, 0, 1, 0, 0, 0, 1], 'W').length, value, `d20 face ${value} converts linearly to cans`);
}
for (let value = 1; value <= 12; value++) {
  const face = geometry.D12.find(item => item.val === value);
  assert.equal(geometry.monsterPips(face, 0, 0, 100, [1, 0, 0, 0, 1, 0, 0, 0, 1]).length, value, `ordinary d12 face ${value} keeps its pips`);
}

function faceColors(sp) {
  const colors = [];
  const ctx = {
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, arc() {},
    set fillStyle(value) { colors.push(value); },
  };
  geometry.drawMonsterDie(ctx, 0, 0, 100, [1, 0, 0, 0, 1, 0, 0, 0, 1], sp);
  return colors.filter(value => value.startsWith('rgb(')).map(value => value.match(/\d+/g).map(Number));
}
const white = faceColors(undefined), gold = faceColors('W'), purple = faceColors('B');
assert.ok(white.length && white.every(([r, g, b]) => Math.abs(r - g) <= 2 && b >= g), 'ordinary d12 faces are white');
assert.ok(gold.length && gold.every(([r, g, b]) => r > g && g > b), 'Wild d20 faces are gold');
assert.ok(purple.length && purple.every(([r, g, b]) => b > r && r > g), 'Bonus d20 faces are purple');

for (let face = 1; face <= 20; face++) {
  let calls = 0;
  const result = tank(1, 3, sides => {
    if (calls++ < 10) { assert.equal(sides, 12); return 0; }
    assert.equal(sides, 20);
    return face - 1;
  }, levels);
  assert.equal(result.total, 10 + 2 * face, `special d20 face ${face} adds its face value at the existing 2x weight`);
  assert.equal(result.cans, 10 + face, `special d20 face ${face} adds its pips as physical cans`);
}
console.log(`Special d20 face → physical cans / weighted tank units: ${Array.from({ length: 20 }, (_, i) => `${i + 1}→${i + 1}/${2 * (i + 1)}`).join(', ')}`);
let bonusCalls = 0;
const bonusResult = tank(0, 4, sides => { bonusCalls++; return sides === 12 ? 0 : 19; }, levels);
assert.equal(bonusResult.total, 50, 'one ankh beyond the three required adds a weighted d20');
assert.equal(bonusCalls, 11, 'the Monster tank keeps ten ordinary dice and one bonus die');

function tankOdds(specialCount, specialSides) {
  let distribution = [1];
  for (let die = 0; die < 10 + specialCount; die++) {
    const sides = die < 10 ? 12 : specialSides, weight = die < 10 ? 1 : 2;
    const next = Array(distribution.length + sides * weight).fill(0);
    distribution.forEach((probability, total) => {
      for (let face = 1; face <= sides; face++) next[total + face * weight] += probability / sides;
    });
    distribution = next;
  }
  const expected = distribution.reduce((sum, probability, total) => {
    let payout = levels[0][1];
    for (const [at, value] of levels) if (total >= at) payout = value;
    return sum + probability * payout;
  }, 0);
  const thresholdRates = Object.fromEntries(levels.slice(1).map(([at]) => [
    at,
    distribution.reduce((sum, probability, total) => sum + (total >= at ? probability : 0), 0),
  ]));
  return {
    expected,
    meanCans: 65 + specialCount * (specialSides + 1) / 2,
    meanFillUnits: 65 + specialCount * (specialSides + 1),
    thresholdRates,
  };
}
const expected = [
  [[42.87, 1.16], [42.87, 1.16]],
  [[74.55, 19.05], [97.5, 41.87]],
  [[111.24, 53.99], [133.97, 80.61]],
  [[135.04, 81.14], [146.42, 95.44]],
  [[145.44, 94.03], [149.37, 99.17]],
  [[148.86, 98.47], [149.91, 99.87]],
];
const rows = [];
for (let count = 0; count <= 5; count++) {
  const old = tankOdds(count, 12), current = tankOdds(count, 20);
  for (const [side, result, values] of [[12, old, expected[count][0]], [20, current, expected[count][1]]]) {
    assert.equal(result.expected.toFixed(2), values[0].toFixed(2), `${count} special d${side} exact expected payout`);
    assert.equal((result.thresholdRates[90] * 100).toFixed(2), values[1].toFixed(2), `${count} special d${side} €150 threshold chance`);
  }
  assert.equal(current.meanCans - old.meanCans, count * 4, `${count} special d20s add four physical cans per die on average`);
  assert.equal(current.meanFillUnits - old.meanFillUnits, count * 8, `${count} special d20s add eight weighted tank units per die on average`);
  const thresholdRates = result => [68, 78, 90].map(at => `${at}:${(result.thresholdRates[at] * 100).toFixed(2)}%`).join('/');
  rows.push(`${count} special: cans ${old.meanCans.toFixed(1)} → ${current.meanCans.toFixed(1)}, weighted fill ${old.meanFillUnits} → ${current.meanFillUnits}, EV €${old.expected.toFixed(2)} → €${current.expected.toFixed(2)}, thresholds ${thresholdRates(old)} → ${thresholdRates(current)}`);
}
console.log('Exact Monster Tank comparison (10 regular d12s; special d12 vs d20; thresholds 68/78/90; each special can weighted 2x):');
console.log(rows.join('\n'));
