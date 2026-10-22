import assert from 'node:assert/strict';
import test from 'node:test';
import {
  godEV, markEV, pairedDifference, raceEV, sampleInterval, seedForSpin, stankEV, summarize, tankEV, topSpecialIndex,
} from './run.mjs';

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    let value = state += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function randomInt(random, limit) {
  return Math.floor(random() * limit);
}

test('Stank EV includes gold pockets, doubled ankhs, and the locksafe threshold', () => {
  const meanAmount = (10 + 10 + 12 + 12 + 15 + 15 + 15 + 20 + 20 + 25 + 25 + 30 + 40 + 50 + 60 + 75) / 16;
  assert.equal(stankEV(0, 0), 0);
  assert.ok(Math.abs(stankEV(1, 0) - (.8 * meanAmount + .2 * 50)) < 1e-10);
  assert.ok(stankEV(0, 3) > stankEV(3, 0));
  assert.ok(stankEV(3, 0) > 70);
});

test('analytic room and race expectations agree with seeded legacy-style samples', () => {
  const random = randomGenerator(89);
  const amounts = [10, 10, 12, 12, 15, 15, 15, 20, 20, 25, 25, 30, 40, 50, 60, 75];
  let roomTotal = 0;
  const roomTrials = 200000;
  for (let trial = 0; trial < roomTrials; trial++) {
    let gold = 0;
    let cash = 0;
    for (const multiplier of [1, 2, 1]) {
      if (random() < .2) gold++;
      else cash += amounts[randomInt(random, amounts.length)] * multiplier;
    }
    roomTotal += cash + (gold >= 3 ? 100 + 20 * randomInt(random, 20) : gold * 50);
  }
  assert.ok(Math.abs(roomTotal / roomTrials - stankEV(2, 1)) < .5);

  const vals = [5, 8, 10, 12, 15, 20, 25, 30];
  let raceTotal = 0;
  const raceTrials = 200000;
  for (let trial = 0; trial < raceTrials; trial++) {
    const tags = vals.slice();
    for (let i = tags.length - 1; i > 0; i--) {
      const j = randomInt(random, i + 1);
      [tags[i], tags[j]] = [tags[j], tags[i]];
    }
    const bigAt = randomInt(random, 6);
    const winner = randomInt(random, 6);
    const base = winner === bigAt ? [80, 100, 120][randomInt(random, 3)] : tags[winner];
    raceTotal += winner < 2 ? Math.round(base * 1.5) : base;
  }
  assert.ok(Math.abs(raceTotal / raceTrials - raceEV({ n: 6, sw: 2, sb: 0 })) < .5);
});

test('Tank EV accounts for the extra dice and configured prize thresholds', () => {
  assert.equal(tankEV(0, 3), tankEV(0, 0));
  assert.ok(tankEV(1, 3) > tankEV(0, 3));
  assert.ok(tankEV(0, 3) >= 30 && tankEV(0, 3) <= 150);
});

test('tank and God room EVs agree with seeded game-rule samples', () => {
  const random = randomGenerator(8901);
  const levels = [[0, 30], [68, 50], [78, 80], [90, 150]];
  let tankTotal = 0;
  let godTotal = 0;
  const trials = 200000;
  for (let trial = 0; trial < trials; trial++) {
    let total = 0;
    for (let die = 0; die < 12; die++) total += (1 + randomInt(random, 12)) * (die < 10 ? 1 : 2);
    let tankPrize = levels[0][1];
    for (const [threshold, value] of levels) if (total >= threshold) tankPrize = value;
    tankTotal += tankPrize;

    let previous = 2 + randomInt(random, 13);
    let won = true;
    for (let draw = 0; draw < 4; draw++) {
      let rank = 2 + randomInt(random, 13);
      while (rank === previous) rank = 2 + randomInt(random, 13);
      const guessHigher = previous === 8 ? random() < .5 : previous < 8;
      if (guessHigher ? rank <= previous : rank >= previous) won = false;
      previous = rank;
      if (!won) break;
    }
    const prizes = [30, 50, 30, 100, 30, 75, 30, 1500, 30, 50, 30, 150, 30, 40, 30, 300, 30, 60, 30, 500, 40, 30, 200, 30];
    godTotal += won ? prizes[randomInt(random, prizes.length)] : 0;
  }
  assert.ok(Math.abs(tankTotal / trials - tankEV(1, 4)) < .2);
  assert.ok(Math.abs(godTotal / trials - godEV()) < 1.5);
});

test('race and Mark EVs preserve the existing tag rules', () => {
  assert.equal(raceEV({ n: 1, sw: 0, sb: 0 }), 100);
  assert.equal(raceEV({ n: 1, sw: 1, sb: 0 }), 150);
  assert.equal(markEV({ n: 2, sw: 1, sb: 1 }), 7.5);
  assert.equal(markEV({ n: 0, sw: 0, sb: 0 }), 0);
});

test('stacked race tags use the highest multiplier and average rounded tag payouts', () => {
  const run = {
    n: 4,
    raceTopSpecial: true,
    specials: [{ kind: 'B', mult: 3 }, { kind: 'W', mult: 6 }],
  };
  assert.equal(topSpecialIndex(run.specials), 1);
  assert.equal(raceEV(run), 169.53125);
  assert.equal(markEV({ n: 3, specials: run.specials }), 50 / 3);
  assert.equal(topSpecialIndex([{ kind: 'B', mult: 3 }, { kind: 'W', mult: 3 }]), 1);
  assert.equal(raceEV({
    n: 2,
    raceTopSpecial: true,
    specials: [{ kind: 'W', mult: 3 }, { kind: 'B', mult: 1.5 }],
  }), (300 + 23.625) / 2);
});

test('race lineup truncates specials before evaluating the top tag', () => {
  const specials = Array.from({ length: 9 }, (_, index) => ({
    kind: index === 8 ? 'W' : 'B',
    mult: index === 8 ? 99 : 1.5,
  }));
  assert.equal(raceEV({ n: 10, raceTopSpecial: true, specials }), 315.375 / 8);
});

test('summary reports per-spin expected components and their total interval', () => {
  const result = summarize([{ k: 'P' }, { k: 'M', n: 2, sw: 1, sb: 0 }], .25);
  assert.equal(result.spins, 2);
  assert.equal(result.counts.P, 1);
  assert.equal(result.counts.M, 1);
  assert.ok(result.rooms.mean > 190 && result.rooms.mean < 200);
  assert.ok(result.race.mean > 9 && result.race.mean < 10);
  assert.equal(result.mark.mean, 1.875);
  assert.equal(result.total.mean, result.rooms.mean + result.race.mean + result.mark.mean);
});

test('confidence interval and per-spin seeds are reproducible', () => {
  const interval = sampleInterval([1, 2, 3]);
  assert.equal(interval.mean, 2);
  assert.ok(Math.abs(interval.se - Math.sqrt(1 / 3)) < 1e-12);
  assert.equal(seedForSpin(1, 0), 2654435770);
  assert.equal(seedForSpin(1, 1), 1013904243);
});

test('paired comparison uses spin-by-spin differences', () => {
  const baseline = [{ k: 'P' }, { k: 'M', n: 1, sw: 0, sb: 0 }];
  const changed = [{ k: 'P' }, { k: 'M', n: 1, sw: 1, sb: 0 }];
  const paired = pairedDifference(baseline, changed, .25, .25);
  assert.ok(paired.mean > 0);
  assert.ok(paired.low <= paired.mean && paired.mean <= paired.high);
  assert.throws(() => pairedDifference(baseline, changed.slice(1), .25, .25), /different numbers/);
});
