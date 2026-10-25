import assert from 'node:assert/strict';
import { conditionalEV, calibrate, godWinProbability, assumptions } from './sim/ordinary-ev.mjs';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} vs ${expected}`);
close(conditionalEV({ k: '-' }), 0, 'ordinary losing path');
close(conditionalEV({ k: 'W', w: 1, b: 0 }), 31.7, 'one roulette ball: 80% of27.125 plus20% of50');
close(conditionalEV({ k: 'W', w: 0, b: 1 }), 53.4, 'Bonus ball doubles cash, not the gold consolation');
close(conditionalEV({ k: 'W', w: 3, b: 0 }), 96.22, 'three balls include the0.8% locksafe branch and no gold consolation there');
close(conditionalEV({ k: 'B', w: 0, b: 3 }), 42.868840498400104, 'ten independent fair d12 tank distribution, not roulette EV');
// With56 special dice, even the minimum fill exceeds120; all prize values are
// exactly150 +1.25*(sum-120), and the mean sum is65 +56*13.
close(conditionalEV({ k: 'B', w: 56, b: 3 }), 991.25, 'overflow is counted once at source payout rate');
close(conditionalEV({ k: 'B', w: 56, b: 3 }, { includeOverflow: false }), 150, 'old tank baseline excludes the new overflow payout');
close(conditionalEV({ k: 'P' }), 383.3333333333333, 'pyramid: one wild door of3 plus uniform source plaques');
close(godWinProbability, 0.3099700261158595, 'exact optimal four-guess survival across13 nonrepeating ranks');
const god = conditionalEV({ k: 'G' });
for (const record of [{ k: '-' }, { k: 'W', w: 3 }, { k: 'B', b: 3 }, { k: 'P' }, { k: 'M', n: 0, ch: [] }]) {
  close(conditionalEV({ ...record, god: 1 }) - conditionalEV(record), god, `side God prize retained on ${record.k}`);
}
close(conditionalEV({ k: 'G', god: 1 }), god, 'a God-only record does not double-pay its modeled prize');
close(conditionalEV({ k: 'M', n: 1, ch: [{ special: 'W', count: 2, mult: 3 }] }), 64.8, 'recorded3x gold chicken:84% Mark20 plus16% race300');
close(conditionalEV({ k: 'M', n: 1, ch: [{ special: 'B', count: 3, mult: 6 }] }), 112.8, 'actual recorded multiplier retained for purple chicken');
close(conditionalEV({ k: 'M', n: 0, ch: [] }), 0, 'no farm survivors');
assert.throws(() => conditionalEV({ k: 'D' }), /unresolved/);
assert.throws(() => conditionalEV({ k: 'B', w: .5 }), /Invalid/);
const model = calibrate([{ k: 'W', w: 1 }, { k: '-' }]);
close(model.meanBase, 15.85, 'calibration sample mean');
close(model.standardError, 15.85, 'unbiased path-mean standard error');
close(model.calibrationEV, model.meanBase, 'normalization fits conditional model, not a full-RTP certificate');
close(model.modeledReturn, .995, 'ordinary-model target');
close(model.perStakeRoundingBounds[0].returnAbsoluteErrorBound, .025, '10c rounding bound remains visible');
close(calibrate([{ k: 'W', w: 1 }, { k: '-' }], { normalizationEV: 31.7 }).modeledReturn, .4975, 'independent validation can use a frozen training normalization');
assert.ok(assumptions.some(text => /uniform/.test(text)) && assumptions.some(text => /jackpot/.test(text)) && assumptions.some(text => /rounding/.test(text)));
assert.throws(() => calibrate([{ k: '-' }, { k: '-' }]), /no expected/);
console.log('Ordinary EV: source-derived roulette, tank/overflow, God, pyramid, recorded chicken multipliers, side prizes and calibration uncertainty pass.');
