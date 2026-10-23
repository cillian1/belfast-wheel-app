// ---------- state ----------
// Owns mutable game state helpers and special dice.
let scene = 'nested', zoom = 1, busy = false, fade = 0;
const rot = Array(MAXD + 1).fill(0);
let dice = [];
for (let i = 0; i < 12; i++) { // ten six-sided dice: two in the middle, eight round the edge (slots 0 and 2 are kept for special dice)
  if (i === 0 || i === 2) continue;
  const a = i < 4 ? i * TAU / 4 + .4 : (i - 4) * TAU / 8, rr = i < 4 ? .13 : .32;
  dice.push({ hx: Math.cos(a) * rr, hy: Math.sin(a) * rr, x: Math.cos(a) * rr, y: Math.sin(a) * rr, a: (Math.random() - .5) * .3, v: 1 + Math.floor(Math.random() * 12), sp: null });
}
// special dice only turn up at the dice well: one gold die per Wild and one purple die per ankh you are holding
const SP_SLOTS = [[.4, .13], [.4 + Math.PI, .13], [TAU / 16 + Math.PI / 2, .22], [TAU / 16 - Math.PI / 2, .22], [Math.PI / 2 + .4, .13]];
function clearSpecialDice() { dice = dice.filter(d => !d.sp); }
function addSpecialDice(kinds) {
  clearSpecialDice();
  return kinds.map((sp, j) => { const [a, rr] = SP_SLOTS[j % SP_SLOTS.length], d = { hx: Math.cos(a) * rr, hy: Math.sin(a) * rr, x: Math.cos(a) * rr, y: Math.sin(a) * rr, a: (Math.random() - .5) * .3, v: 1, sp, swell: 0, born: 0 }; dice.push(d); return d; });
}
let rotF = 0, flatT = 0, balls = [], ballR = 0, counts = null, winner = -1, banner = '', achievement = null;
let rotP = 0, hi = null, hiA = 0;

// keep physics positions valid when the canvas is resized mid-drop
function rescaleBalls(oldB) {
  if (!oldB || !oldB.N || oldB.N === N) return;
  const f = N / oldB.N; balls.forEach(b => { b.x *= f; b.y *= f; b.vx *= f; b.vy *= f; }); ballR *= f;
}
