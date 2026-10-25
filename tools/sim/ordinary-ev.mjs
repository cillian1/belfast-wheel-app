// Conditional ordinary-prize model, not a certificate of actual player RTP.
// Excludes progressive jackpot, promotions/free-spin frequency and currency rounding.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = name => readFileSync(new URL(`../../src/game/${name}.js`, import.meta.url), 'utf8');
const wild = source('wild-room'), tank = source('bonus-round'), pyramid = source('pyramid');
const god = source('god-room'), race = source('chicken-race'), mark = source('mark-ending');
function required(text, pattern, name) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Ordinary EV source contract changed: ${name}`);
  return match;
}
function array(text, name) {
  const match = required(text, new RegExp(`\\b${name}\\s*=\\s*(\\[[^;]*?\\])(?:[;,]|\\.sort)`), name);
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${match[1]})`)));
}
const mean = a => a.reduce((sum, n) => sum + n, 0) / a.length;
const levels = array(tank, 'TANK_LEVELS'), cap = +required(tank, /const TANK_CAP = ([\d.]+);/, 'tank cap')[1];
const monsterFunction = required(tank, /function monsterPrize\(total\) \{[\s\S]*?\n\}/, 'monsterPrize')[0];
const monsterPrize = new Function('TANK_LEVELS', 'TANK_CAP', `${monsterFunction}; return monsterPrize;`)(levels, cap);
const pockets = +required(wild, /const ROUL_N = (\d+)/, 'roulette size')[1];
const goldP = array(wild, 'ROUL_GOLD').length / pockets;
const amounts = array(wild, 'amts');
const vault = required(wild, /amt: (\d+) \+ (\d+) \* Math\.floor\(Math\.random\(\) \* (\d+)\)/, 'vault doors');
const vaultMean = +vault[1] + +vault[2] * (+vault[3] - 1) / 2;
const goldPay = +required(wild, /if \(gold\) cash \+= gold \* (\d+);/, 'gold consolation')[1];
const pyramidPrizes = array(pyramid, 'PYR_PRIZES');
const doors = required(pyramid, /amt: (\d+) \+ (\d+) \* Math\.floor\(Math\.random\(\) \* (\d+)\)/, 'pyramid doors');
const pyramidMean = mean(pyramidPrizes) / 3 + (2 / 3) * (+doors[1] + +doors[2] * (+doors[3] - 1) / 2);
const godMean = mean(array(god, 'GOD_PRIZES'));
required(god, /Math\.floor\(Math\.random\(\) \* 13\)/, '13 God ranks');
required(god, /cards\[cards\.length - 1\]\.r/, 'adjacent God rank exclusion');
const raceChance = +required(race, /const RACE_CHANCE = ([\d.]+)/, 'race chance')[1];
const raceMax = +required(race, /RACE_MAX = (\d+)/, 'maximum racers')[1];
const values = array(race, 'vals');
const bigValues = required(race, /pick\((\[[\d, ]+\])\)/, 'big race prize')[1];
const bigPrizes = JSON.parse(bigValues);
const markFunction = required(mark, /function markSpecialPrize\(kind, mult\) \{[^\n]*\}/, 'Mark special prize')[0];
const markPrize = new Function(`${markFunction}; return markSpecialPrize;`)();
const bigAtFunction = required(race, /function raceBigAt\(racers, randomAt\) \{[\s\S]*?\n\}/, 'race special selection')[0];
const bigAt = new Function(`${bigAtFunction}; return raceBigAt;`)();

let successes = Array(13).fill(1);
for (let draw = 0; draw < 4; draw++) successes = successes.map((_, rank) => Math.max(
  successes.slice(0, rank).reduce((a, b) => a + b, 0),
  successes.slice(rank + 1).reduce((a, b) => a + b, 0),
) / 12);
export const godWinProbability = mean(successes); // optimal higher/lower strategy
export const assumptions = [
  'Ordinary prizes only: progressive jackpot and free-spin/promotional frequency excluded.',
  'Conditional room model: physical d12 faces are assumed independent and uniform; this is not proven by the animation.',
  'God room assumes optimal higher/lower decisions; player choices can reduce return.',
  'Race indexed-tag distributions approximate the source biased shuffle with 50,000 fixed-seed shuffles.',
  'Currency rounding is not included in base EV; reported stake bounds quantify that limitation.',
  'Path-mean standard error excludes error in these conditional-room assumptions; use independent holdout seeds.',
];

// Preserve the source's biased sort, rather than assuming a uniform permutation.
const indexed = values.map(() => new Map());
let randomState = 0x51a7c0de;
const random = () => { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 4294967296; };
for (let i = 0; i < 50000; i++) values.slice().sort(() => random() - .5).forEach((v, index) => indexed[index].set(v, (indexed[index].get(v) || 0) + 1 / 50000));
const indexedPrize = (index, mult = 1) => [...indexed[index]].reduce((sum, [v, p]) => sum + p * Math.round(v * mult), 0);
const tanks = new Map();
function monsterEV(specials, includeOverflow) {
  const key = `${specials}:${includeOverflow}`;
  if (tanks.has(key)) return tanks.get(key);
  let distribution = [1];
  for (let die = 0; die < 10 + specials; die++) {
    const weight = die < 10 ? 1 : 2, next = Array(distribution.length + 12 * weight).fill(0);
    for (let sum = 0; sum < distribution.length; sum++) {
      if (!distribution[sum]) continue;
      for (let face = 1; face <= 12; face++) next[sum + face * weight] += distribution[sum] / 12;
    }
    distribution = next;
  }
  const ev = distribution.reduce((sum, p, total) => {
    const prize = monsterPrize(total);
    return sum + p * (includeOverflow ? prize.total : prize.base);
  }, 0);
  tanks.set(key, ev);
  return ev;
}
function nonnegative(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000) throw new Error(`Invalid ${name}: ${value}`);
  return value;
}
function farmEV(record) {
  const specials = record.ch || [
    ...Array(nonnegative(record.sw || 0, 'gold chickens')).fill({ special: 'W', mult: 1.5 }),
    ...Array(nonnegative(record.sb || 0, 'purple chickens')).fill({ special: 'B', mult: 1.5 }),
  ];
  const n = nonnegative(record.n ?? specials.length, 'surviving chickens');
  if (specials.length > n) throw new Error('Special chickens exceed survivors');
  for (const ch of specials) if (!['W', 'B'].includes(ch.special) || !(ch.mult > 0) || !Number.isFinite(ch.mult)) throw new Error('Invalid recorded special chicken');
  const wheelSize = Math.min(n, 16);
  const markEV = wheelSize ? specials.slice(0, wheelSize).reduce((sum, ch) => sum + markPrize(ch.special, ch.mult), 0) / wheelSize : 0;
  const racers = [...specials, ...Array(n - specials.length).fill({})].slice(0, raceMax);
  if (!racers.length) return 0;
  const specialBig = bigAt(racers, 0), hasSpecial = racers.some(ch => ch.special);
  let expectedTags = 0;
  for (let i = 0; i < racers.length; i++) {
    const mult = racers[i].special ? racers[i].mult : 1;
    const regular = indexedPrize(i, mult), big = mean(bigPrizes.map(v => Math.round(v * mult)));
    expectedTags += hasSpecial ? (i === specialBig ? big : regular) : big / racers.length + regular * (1 - 1 / racers.length);
  }
  return (1 - raceChance) * markEV + raceChance * expectedTags / racers.length;
}

export function conditionalEV(record, { includeOverflow = true } = {}) {
  let ev;
  const w = nonnegative(record.w || 0, 'Wild count'), b = nonnegative(record.b || 0, 'Bonus count');
  if (record.k === '-') ev = 0;
  else if (record.k === 'W') {
    const n = w + b, p0 = (1 - goldP) ** n;
    const p1 = n ? n * goldP * (1 - goldP) ** (n - 1) : 0;
    const p2 = n > 1 ? n * (n - 1) / 2 * goldP ** 2 * (1 - goldP) ** (n - 2) : 0;
    ev = (1 - goldP) * (w + 2 * b) * mean(amounts) + goldPay * (p1 + 2 * p2) + vaultMean * Math.max(0, 1 - p0 - p1 - p2);
  } else if (record.k === 'B') ev = monsterEV(w + Math.max(0, b - 3), includeOverflow);
  else if (record.k === 'G') ev = godWinProbability * godMean;
  else if (record.k === 'P') ev = pyramidMean;
  else if (record.k === 'M') ev = farmEV(record);
  else throw new Error(`Unsupported/unresolved path ${record.k}; use full --engine core records`);
  if (record.god && record.k !== 'G') ev += godWinProbability * godMean;
  return ev;
}

export function calibrate(records, { target = .995, normalizationEV, includeOverflow = true, stakes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] } = {}) {
  if (!Array.isArray(records) || records.length < 2 || !(target > 0 && target <= 1)) throw new Error('Need at least two complete paths and a valid target return');
  let meanBase = 0, varianceSum = 0, components = 0;
  records.forEach((record, index) => {
    const value = conditionalEV(record, { includeOverflow }), delta = value - meanBase;
    meanBase += delta / (index + 1); varianceSum += delta * (value - meanBase);
    components += (value > 0 ? 1 : 0) + (record.god && record.k !== 'G' ? 1 : 0);
  });
  if (!(meanBase > 0)) throw new Error('Calibration paths have no expected ordinary prizes');
  const standardError = Math.sqrt(varianceSum / (records.length - 1) / records.length);
  const ev = normalizationEV ?? meanBase;
  if (!(ev > 0) || !Number.isFinite(ev)) throw new Error('Invalid normalization EV');
  return {
    count: records.length, meanBase, standardError, calibrationEV: meanBase, target, includeOverflow,
    mean95Interval: [Math.max(0, meanBase - 1.96 * standardError), meanBase + 1.96 * standardError],
    normalizationEV: ev, modeledReturn: meanBase * target / ev, modeledReturnSE: standardError * target / ev,
    perStakeRoundingBounds: stakes.map(stake => {
      if (!Number.isSafeInteger(stake) || stake <= 0) throw new Error('Stake must be positive whole cents');
      return { stakeCents: stake, returnAbsoluteErrorBound: .5 * components / records.length / stake };
    }),
    assumptions: assumptions.slice(),
  };
}
