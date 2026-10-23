// ---------- 3D six-sided dice ----------
// Owns six-sided die geometry and rotation math.
const DIE_FACES = [
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], val: 1 },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], val: 6 },
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], val: 2 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], val: 5 },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], val: 3 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], val: 4 },
];
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const mv = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
function mmul(A, B) { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
function axisRot([x, y, z], ang) { const co = Math.cos(ang), s = Math.sin(ang), t = 1 - co; return [t * x * x + co, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + co, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + co]; }
function unit3(v) { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
function orthonorm(M) {
  let a = unit3([M[0], M[3], M[6]]), b = [M[1], M[4], M[7]];
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; b = unit3(b.map((x, i) => x - d * a[i]));
  const w = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return [a[0], b[0], w[0], a[1], b[1], w[1], a[2], b[2], w[2]];
}
function randRot() { let M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; for (let i = 0; i < 3; i++) M = mmul(axisRot(unit3([Math.random() - .5, Math.random() - .5, Math.random() - .5]), Math.random() * TAU), M); return M; }
function snapRot(M) { // the nearest resting pose, with one face square to the camera
  const S = new Array(9).fill(0), usedRow = [false, false, false];
  const cols = [0, 1, 2].map(j => ({ j, v: [M[j], M[3 + j], M[6 + j]] })).sort((a, b) => Math.max(...b.v.map(Math.abs)) - Math.max(...a.v.map(Math.abs)));
  let lastJ = 0;
  cols.forEach(({ j, v }) => {
    let bi = -1, bv = -1; for (let i = 0; i < 3; i++) if (!usedRow[i] && Math.abs(v[i]) > bv) { bv = Math.abs(v[i]); bi = i; }
    usedRow[bi] = true; S[bi * 3 + j] = v[bi] < 0 ? -1 : 1; lastJ = j;
  });
  const det = S[0] * (S[4] * S[8] - S[5] * S[7]) - S[1] * (S[3] * S[8] - S[5] * S[6]) + S[2] * (S[3] * S[7] - S[4] * S[6]);
  if (det < 0) for (let i = 0; i < 3; i++) S[i * 3 + lastJ] *= -1;
  return S;
}
function topValue(M) { let best = -2, v = 1; DIE_FACES.forEach(f => { const z = mv(M, f.n)[2]; if (z > best) { best = z; v = f.val; } }); return v; }
function lerpRot(A, B, t) { return orthonorm(A.map((x, i) => x + (B[i] - x) * t)); }
function spinRot(M, w, h) { const n = Math.hypot(w[0], w[1], w[2]); return n < 1e-4 ? M : orthonorm(mmul(axisRot([w[0] / n, w[1] / n, w[2] / n], n * h), M)); }
const DIE_CORNERS = [[-1, -.78], [-.78, -1], [.78, -1], [1, -.78], [1, .78], [.78, 1], [-.78, 1], [-1, .78]];
function drawDie3D(g, x, y, s, M, sp) {
  const h = s / 2;
  DIE_FACES.map(f => ({ f, n: mv(M, f.n) })).filter(o => o.n[2] > .02).sort((a, b) => a.n[2] - b.n[2]).forEach(({ f, n }) => {
    const C = mv(M, f.n.map(k => k * h)), U = mv(M, f.u.map(k => k * h)), V = mv(M, f.v.map(k => k * h));
    const P = (a, b) => [x + C[0] + U[0] * a + V[0] * b, y + C[1] + U[1] * a + V[1] * b];
    const lit = .5 + .5 * Math.max(0, n[2] * .75 - n[0] * .35 - n[1] * .5);
    g.beginPath(); DIE_CORNERS.forEach(([a, b], i) => { const p = P(a, b); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    if (sp) { // a gold (Wild) or purple (Bonus) die: faces 1 to 5 are ordinary pips, the sixth face is the special one
      const special = f.val === 6, col = sp === 'W' ? (special ? [255, 236, 150] : [230, 178, 60]) : (special ? [205, 150, 255] : [128, 64, 205]);
      g.fillStyle = `rgb(${Math.round(col[0] * lit)},${Math.round(col[1] * lit)},${Math.round(col[2] * lit)})`; g.fill();
      g.strokeStyle = `rgba(30,20,40,${.4 + (1 - n[2]) * .3})`; g.lineWidth = Math.max(1, s * .02); g.stroke();
      g.globalAlpha = Math.min(1, n[2] * 2.2);
      if (!special) {
        g.fillStyle = sp === 'W' ? '#3a2406' : '#fff6dc';
        PIPS[f.val].forEach(([a, b]) => { g.beginPath(); for (let k = 0; k <= 10; k++) { const t = k / 10 * TAU, p = P(a * .5 + Math.cos(t) * .17, b * .5 + Math.sin(t) * .17); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.fill(); });
      }
      g.save(); g.transform(U[0], U[1], V[0], V[1], x + C[0], y + C[1]);
      if (special) g.drawImage(specialMark(sp), -.65, -.65, 1.3, 1.3);
      else g.drawImage(specialMark(sp), -.28, -.98, .56, .56);
      g.restore();
      g.globalAlpha = 1;
      return;
    }
    g.fillStyle = `rgb(${Math.round(250 * lit)},${Math.round(246 * lit)},${Math.round(236 * lit)})`; g.fill();
    g.strokeStyle = `rgba(60,50,40,${.35 + (1 - n[2]) * .3})`; g.lineWidth = Math.max(1, s * .02); g.stroke();
    g.fillStyle = f.val === 1 ? '#b3121f' : '#1b1a19'; g.globalAlpha = Math.min(1, n[2] * 2.2);
    PIPS[f.val].forEach(([a, b]) => {
      const rr = f.val === 1 ? .26 : .17; g.beginPath();
      for (let k = 0; k <= 10; k++) { const t = k / 10 * TAU, p = P(a * .5 + Math.cos(t) * rr, b * .5 + Math.sin(t) * rr); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.fill();
    });
    g.globalAlpha = 1;
  });
}
