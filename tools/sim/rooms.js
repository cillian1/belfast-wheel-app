// Full prize outcome table: per-room odds per deep run and every prize at 10c / €1, scaled to RTP.
// usage: TABLES=tools/sim/tables.json node tools/sim/rooms.js runs.json   (prints rooms EV per spin in base units on stderr)
const fs = require('fs'); const R = Math.random, ri = n => Math.floor(R() * n), M = +(process.env.M || 400000);
const OLD = process.argv[3] === 'old';
const T = OLD ? {
  AM: [1, 2, 3, 5, 5, 8, 10, 10, 12, 15, 15, 20, 25, 30, 40, 50],
  GOD: [1, 5, 2, 10, 3, 20, 5, 1000, 2, 15, 5, 50, 1, 10, 3, 100, 5, 25, 2, 500, 10, 5, 200, 3], CONS: 5,
  LV: [[0, 1], [45, 2], [58, 5], [68, 10], [78, 20], [90, 50]],
} : {
  AM: [10, 10, 10, 12, 12, 15, 15, 15, 20, 20, 25, 30, 40, 50, 60, 75],
  GOD: [25, 50, 25, 100, 30, 75, 25, 1000, 30, 50, 25, 150, 25, 40, 30, 300, 25, 60, 30, 500, 40, 25, 200, 30], CONS: 0,
  LV: [[0, 10], [68, 20], [78, 50], [90, 100]],
};
if (process.env.TABLES) Object.assign(T, JSON.parse(fs.readFileSync(process.env.TABLES)));
const GOLD = [0, 5, 10, 15];
function stank(w, b) {
  const am = T.AM.slice().sort(() => R() - .5), pk = []; let j = 0;
  for (let i = 0; i < 20; i++) pk.push(GOLD.includes(i) ? { g: 1 } : { a: am[j++] });
  let g = 0, c = 0; for (const kd of [...Array(w).fill('W'), ...Array(b).fill('B')]) { const p = pk[ri(20)]; if (p.g) g++; else c += p.a * (kd === 'B' ? 2 : 1); }
  return g >= 3 ? { v: (T.LS||[20,10,19])[0] + (T.LS||[20,10,19])[1] * ri((T.LS||[20,10,19])[2]) + c, sub: 'locksafe' } : { v: c + g * (T.GB || 50), sub: g ? 'gold' : 'plain' };
}
function tank(w, b) {
  let t = 0; for (let i = 0; i < 10; i++) t += 1 + ri(12); const sp = w + Math.max(0, b - 3);
  for (let i = 0; i < sp; i++) t += 2 * (1 + ri(12)); let v = T.LV[0][1]; for (const [a, x] of T.LV) if (t >= a) v = x; return { v };
}
function god() {
  const c = []; while (c.length < 5) { const r = 2 + ri(13); if (!c.length || r !== c[c.length - 1]) c.push(r); }
  for (let j = 1; j < 5; j++) { const p = c[j - 1], n = c[j], g = p < 8 ? 'hi' : p > 8 ? 'lo' : (R() < .5 ? 'hi' : 'lo'); if (!(g === 'hi' ? n > p : n < p)) return { v: T.CONS, sub: 'lost' }; }
  return { v: T.GOD[ri(24)], sub: 'wheel' };
}
T.PT ||= [50, 100, 200, 500, 1000]; T.PD ||= [20, 5, 17];
function pyr() { return ri(3) === 0 ? { v: T.PT[ri(T.PT.length)], sub: 'tip' } : { v: T.PD[0] + T.PD[1] * ri(T.PD[2]), sub: 'door' }; }
const draw0 = r => r.k === 'W' ? stank(r.w, r.b) : r.k === 'B' ? tank(r.w, r.b) : r.k === 'G' ? god() : r.k === 'P' ? pyr() : { v: 0 };
const draw = r => { const o = draw0(r); if (r.god && (r.k === 'W' || r.k === 'B')) { const g = god(); return { v: o.v + g.v, sub: (o.sub ? o.sub + '+' : '') + 'god' }; } return o; };
const RTP = .995;
const runs = JSON.parse(fs.readFileSync(process.argv[2])), n = runs.length, deepRuns = runs.filter(r => r.k !== '-');
const deep = deepRuns.length;
let ev = 0; const dist = {}; // k -> Map(v -> count)
for (let i = 0; i < M; i++) { const r = deepRuns[ri(deep)]; const o = draw(r); ev += o.v; const key = r.k + (o.sub ? ':' + o.sub : ''); (dist[r.k] ||= {}); (dist[r.k][o.v] ||= 0); dist[r.k][o.v]++; (dist[key] ||= {}); (dist[key][o.v] ||= 0); dist[key][o.v]++; }
const evDeep = ev / M, evSpin = evDeep * deep / n, k = RTP / evSpin; // euro paid per base euro at €1
const cnt = kk => runs.filter(r => r.k === kk).length;
const out = { spins: n, deep, deepPct: deep / n, evSpinBase: evSpin, perBaseAt1: k, rooms: {} };
for (const kk of ['W', 'B', 'G', 'P', 'M', '-']) out.rooms[kk] = cnt(kk);
out.dist = {}; out.cnt = {}; for (const kk of Object.keys(dist)) out.cnt[kk] = Object.values(dist[kk]).reduce((a, b) => a + b, 0);
for (const kk of Object.keys(dist)) { const d = dist[kk] || {}, tot = Object.values(d).reduce((a, b) => a + b, 0); out.dist[kk] = Object.entries(d).map(([v, c]) => [+v, c / tot]).sort((a, b) => a[0] - b[0]); }
console.log(JSON.stringify(out));
console.error(`deep ${(100 * deep / n).toFixed(1)}% | EV/spin base ${evSpin.toFixed(3)} | €1 bet pays €${k.toFixed(4)} per base € | rooms W${cnt('W')} B${cnt('B')} G${cnt('G')} P${cnt('P')} M${cnt('M')}`);
for (const kk of ['W', 'B', 'G', 'P']) { const d = out.dist[kk]; const lo = d[0], z = d.filter(x => x[0] === 0).reduce((a, b) => a + b[1], 0); console.error(kk, 'min base', lo && lo[0], '-> €', lo && (lo[0] * k).toFixed(2), 'zero share', (100 * z).toFixed(1) + '%'); }
for (const kk of ['W', 'B', 'G', 'P']) { const d = out.dist[kk], m = d.reduce((a, [v, p]) => a + v * p, 0), share = m * out.rooms[kk] / n / evSpin; console.error(kk, 'mean base', m.toFixed(1), '€', (m * k).toFixed(2), 'share of payback', (100 * share).toFixed(0) + '%'); }
