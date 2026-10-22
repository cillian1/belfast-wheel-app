import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/wallet/money.js', import.meta.url)), 'utf8');
const functions = ['gambleAllowed', 'gambleEligible', 'gambleDecision', 'secureGambleDecision', 'settleGamble', 'updateGambleStats'].map(name => {
  const match = source.match(new RegExp(`  function ${name}\\([^]*?\\n  \\}`));
  assert.ok(match, `Missing real ${name} function`);
  return match[0];
}).join('\n');
const cryptoQueue = [208, 207], cryptoCalls = [];
const crypto = { getRandomValues(bytes) { cryptoCalls.push(bytes); bytes[0] = cryptoQueue.shift(); return bytes; } };
const { gambleAllowed, gambleEligible, gambleDecision, secureGambleDecision, settleGamble, updateGambleStats } =
  new Function('crypto', `${functions}; return { gambleAllowed, gambleEligible, gambleDecision, secureGambleDecision, settleGamble, updateGambleStats };`)(crypto);

for (const pick of ['red', 'black']) {
  const cards = Array.from({ length: 208 }, (_, byte) => gambleDecision(pick, () => byte));
  assert.equal(cards.filter(r => r.won).length, 104, `${pick} wins on exactly half of accepted cards`);
  assert.equal(new Set(cards.map(r => r.card.s + r.card.r)).size, 52, 'the 52-card deck is represented');
}
assert.throws(() => gambleDecision('green', 0));
assert.throws(() => gambleDecision('red', () => -1));
const secureResult = secureGambleDecision('black');
assert.equal(secureResult.card.r, 14);
assert.equal(secureResult.card.s, '♠');
assert.equal(secureResult.won, true);
assert.equal(cryptoCalls.length, 2, 'out-of-range bytes are rejected before deciding');
assert.ok(cryptoCalls.every(bytes => bytes instanceof Uint8Array), 'the secure decision requests cryptographic bytes');
for (const amount of [0, -1, 0.5, 2001, NaN]) assert.equal(gambleAllowed(amount, 0), false);
assert.equal(gambleAllowed(2000, 4), true);
assert.equal(gambleAllowed(6, 5), false);
const eligible = { gambleCredit: 6 };
assert.equal(gambleEligible(eligible, eligible, false), true);
assert.equal(gambleEligible({ ...eligible, live: true }, eligible, false), false);
assert.equal(gambleEligible({ ...eligible, auto: true }, eligible, false), false);
assert.equal(gambleEligible(eligible, eligible, true), false);
assert.equal(gambleEligible({ ...eligible, gambleCredit: 0 }, eligible, false), false);
assert.equal(gambleEligible({ ...eligible, gambleClosed: true }, eligible, false), false, 'refunds and banked jackpot payouts stay closed');
const freeRun = { ...eligible, free: true };
assert.equal(gambleEligible(freeRun, freeRun, false), true, 'credited free-spin wins remain eligible');
assert.match(source, /if \(isPhelanTomb\) run\.gambleClosed = true/, 'the banked jackpot payout is excluded');
assert.match(source, /o\.title === 'That run broke halfway'\) \{ run\.paid = true; run\.gambleClosed = true/, 'refunds are excluded');
assert.match(source, /W\.gamble\.expiresAt = now\(\) \+ 15000/);
assert.match(source, /gambleTimer = setTimeout\(collectGamble, 15000\)/);
assert.ok(source.indexOf("g.phase = 'flipping'") < source.indexOf('g.card = result.card'), 'the card is not published before the reveal');
assert.doesNotMatch(functions, /Math\.random/);
let amount = 6, count = 0;
while (gambleAllowed(amount, count)) { amount *= 2; count++; }
assert.equal(amount, 192); assert.equal(count, 5);
for (const won of [true, false]) {
  const original = { balance: 100, spins: 7, staked: 70, won: 42 };
  const bet = { id: 'receipt', amount: 6, count: 0, won };
  const settled = settleGamble(structuredClone(original), bet);
  assert.equal(settled.balance, won ? 106 : 94);
  assert.equal(settled[won ? 'gambleWon' : 'gambleLost'], 6);
  for (const field of ['spins', 'staked', 'won']) assert.equal(settled[field], original[field]);
  assert.deepEqual(settleGamble(structuredClone(settled), bet), settled, 'retry must not settle twice');
  const globalStats = updateGambleStats({}, bet, false);
  assert.equal(globalStats[won ? 'gambleWon' : 'gambleLost'], 6);
  assert.deepEqual(updateGambleStats(globalStats, bet, true), globalStats, 'test accounts do not change global stats');
  const short = { balance: 5 };
  assert.equal(settleGamble(short, bet), undefined);
  assert.deepEqual(short, { balance: 5 }, 'short balance must not change');
}
assert.equal(settleGamble(null, { amount: 6 }), undefined);
const leaveSource = source.match(/  function leaveGamble\(e\) \{[^]*?\n  \}/)[0];
for (const locked of [false, true]) {
  const W = { run: {} }, calls = [];
  const leave = new Function('gambleBusy', 'W', 'collectGamble', 'toast', `${leaveSource}; return leaveGamble;`)(locked, W, () => calls.push('collect'), () => {});
  leave({ preventDefault: () => calls.push('prevent'), stopImmediatePropagation: () => calls.push('stop') });
  assert.deepEqual(calls, locked ? ['prevent', 'stop'] : ['collect'], 'Back to top/auto must collect, or block navigation while settling');
  assert.equal(W.run.gambleClosed, locked ? undefined : true);
}
console.log('Decision, ladder, cap, short-balance, separate stats and idempotent settlement checks passed.');

const watchSource = readFileSync(fileURLToPath(new URL('../src/wallet/watch.js', import.meta.url)), 'utf8');
assert.match(watchSource, /renderGamble\(\$w\('wwGamble'\), parse\(st\.gamble\) \|\| null, true\)/, 'Watch decodes its serialized gamble snapshot before rendering');
assert.match(watchSource, /st\.gamble = JSON\.stringify\(W\.gamble \|\| null\)/, 'Watch publishes the current pick/card/reveal state');
const uiSource = readFileSync(fileURLToPath(new URL('../src/wallet/ui.js', import.meta.url)), 'utf8');
assert.match(uiSource, /drawCard\(ctx, 90, 126, 140, g\.card \|\| \{ r: 14, s: '♥' \}, !!g\.colour/, 'the UI reveals the actual selected deck card');

// Reproducible ladders across small and capped wins, using the live decision and stop rules.
let seed = 0x1352026;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const starts = [6, 10, 100, 500, 1500, 2000], ladders = 1000000;
let banked = 0, returned = 0, wagers = 0;
for (let i = 0; i < ladders; i++) {
  let risk = starts[i % starts.length], step = 0;
  banked += risk;
  while (gambleAllowed(risk, step)) {
    risk = gambleDecision('red', () => (random() & 1) ? 26 : 0).won ? risk * 2 : 0;
    step++; wagers++;
  }
  returned += risk;
}
const percent = returned / banked * 100;
console.log(`${ladders.toLocaleString('en-IE')} gamble ladders (${wagers.toLocaleString('en-IE')} wagers), starts 6c–€20, max 5 gambles / €20 at risk`);
console.log(`Return: ${percent.toFixed(4)}% (expected 100%, tolerance ±0.2%)`);
assert.ok(Math.abs(percent - 100) <= 0.2, 'Return outside tolerance');
