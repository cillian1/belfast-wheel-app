import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../src/wallet/money.js', import.meta.url)), 'utf8');
const functions = ['gambleAllowed', 'gambleDecision', 'settleGamble'].map(name => {
  const match = source.match(new RegExp(`  function ${name}\\([^]*?\\n  \\}`));
  assert.ok(match, `Missing real ${name} function`);
  return match[0];
}).join('\n');
const { gambleAllowed, gambleDecision, settleGamble } = new Function(`${functions}; return { gambleAllowed, gambleDecision, settleGamble };`)();

for (const pick of ['red', 'black']) {
  assert.equal(Array.from({ length: 256 }, (_, n) => gambleDecision(pick, n)).filter(r => r.won).length, 128);
}
assert.throws(() => gambleDecision('green', 0));
for (const amount of [0, -1, 0.5, 2001, NaN]) assert.equal(gambleAllowed(amount, 0), false);
assert.equal(gambleAllowed(2000, 4), true);
assert.equal(gambleAllowed(6, 5), false);
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

// Reproducible ladders across small and capped wins, using the live decision and stop rules.
let seed = 0x1352026;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const starts = [6, 10, 100, 500, 1500, 2000], ladders = 1000000;
let banked = 0, returned = 0, wagers = 0;
for (let i = 0; i < ladders; i++) {
  let risk = starts[i % starts.length], step = 0;
  banked += risk;
  while (gambleAllowed(risk, step)) {
    risk = gambleDecision('red', random()).won ? risk * 2 : 0;
    step++; wagers++;
  }
  returned += risk;
}
const percent = returned / banked * 100;
console.log(`${ladders.toLocaleString('en-IE')} gamble ladders (${wagers.toLocaleString('en-IE')} wagers), starts 6c–€20, max 5 gambles / €20 at risk`);
console.log(`Return: ${percent.toFixed(4)}% (expected 100%, tolerance ±0.2%)`);
assert.ok(Math.abs(percent - 100) <= 0.2, 'Return outside tolerance');
