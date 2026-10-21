// ---------- the bonus round: rollercoaster, the planet wheel, twelve-sided dice, the Monster tank ----------
const TANK_LEVELS = [{ at: 0, v: 30 }, { at: 68, v: 50 }, { at: 78, v: 80 }, { at: 90, v: 150 }];
const TANK_CAP = 120;
const COSMIC = [1000, 5000, 10000, 1000, 5000, 1000, 10000, 5000, 1000, 5000, 10000, 5000];
// the planet wheel is a trick, so its prizes are plain text: never real money
const FAKE_EUR = '€', fakeEur = v => FAKE_EUR + v.toLocaleString('en-IE');
let coaster = null, planet = null, mon = null, rotC = 0;

// a dodecahedron: 12 pentagon faces, opposite faces add up to 13
const PHI = (1 + Math.sqrt(5)) / 2;
const D12 = (() => {
  const V = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const d of [-1, 1]) V.push([a, b, d]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { V.push([0, a / PHI, b * PHI]); V.push([a / PHI, b * PHI, 0]); V.push([a * PHI, 0, b / PHI]); }
  const Nn = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) { Nn.push([0, a * PHI, b]); Nn.push([a * PHI, b, 0]); Nn.push([a, 0, b * PHI]); }
  const faces = Nn.map(n0 => {
    const n = unit3(n0), dots = V.map(v => v[0] * n[0] + v[1] * n[1] + v[2] * n[2]), mx = Math.max(...dots);
    const vs = V.filter((v, i) => dots[i] > mx - 1e-6);
    const C = [0, 1, 2].map(j => vs.reduce((s, v) => s + v[j], 0) / 5);
    const u = unit3([vs[0][0] - C[0], vs[0][1] - C[1], vs[0][2] - C[2]]);
    const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    vs.sort((p, q) => Math.atan2(...[w, u].map(e => (p[0] - C[0]) * e[0] + (p[1] - C[1]) * e[1] + (p[2] - C[2]) * e[2])) - Math.atan2(...[w, u].map(e => (q[0] - C[0]) * e[0] + (q[1] - C[1]) * e[1] + (q[2] - C[2]) * e[2])));
    return { n, vs, C, u, w, rp: Math.hypot(vs[0][0] - C[0], vs[0][1] - C[1], vs[0][2] - C[2]), val: 0 };
  });
  let next = 1;
  faces.forEach(f => {
    if (f.val) return;
    const opp = faces.find(g => !g.val && g !== f && Math.abs(g.n[0] + f.n[0]) + Math.abs(g.n[1] + f.n[1]) + Math.abs(g.n[2] + f.n[2]) < 1e-6);
    f.val = next; if (opp) opp.val = 13 - next; next++;
  });
  return faces;
})();
const D12R = Math.sqrt(3);
function pipLayout(k) {
  const ring = (m, r, off = 0) => Array.from({ length: m }, (_, i) => [Math.cos(off + i * TAU / m) * r, Math.sin(off + i * TAU / m) * r]);
  if (k === 1) return [[0, 0]];
  if (k <= 6) return ring(k, .48, -Math.PI / 2);
  if (k <= 8) return [[0, 0], ...ring(k - 1, .55, -Math.PI / 2)];
  const inner = k >= 11 ? 4 : 3;
  return [...ring(inner, .22, .3), ...ring(k - inner, .6, -Math.PI / 2)];
}
function d12Pips(f, x, y, s, M) { // screen spots of the pips on one face
  const h = s / 2 / D12R, C = mv(M, f.C), U = mv(M, f.u), W = mv(M, f.w), rp = f.rp, pr = f.val > 6 ? .1 : .13;
  return pipLayout(f.val).map(([a, b]) => ({ x: x + (C[0] + (U[0] * a + W[0] * b) * rp) * h, y: y + (C[1] + (U[1] * a + W[1] * b) * rp) * h, r: pr * rp * h }));
}
function drawD12(g, x, y, s, M, sp) {
  const h = s / 2 / D12R;
  D12.map(f => ({ f, n: mv(M, f.n) })).filter(o => o.n[2] > .02).sort((a, b) => a.n[2] - b.n[2]).forEach(({ f, n }) => {
    const lit = .45 + .55 * Math.max(0, n[2] * .75 - n[0] * .3 - n[1] * .45);
    g.beginPath(); f.vs.forEach((v, i) => { const p = mv(M, v); i ? g.lineTo(x + p[0] * h, y + p[1] * h) : g.moveTo(x + p[0] * h, y + p[1] * h); }); g.closePath();
    const col = sp === 'W' ? [250, 200, 80] : sp === 'B' ? [130, 50, 220] : [190, 120, 255];
    g.fillStyle = `rgb(${Math.round(col[0] * lit)},${Math.round(col[1] * lit)},${Math.round(col[2] * lit)})`; g.fill();
    g.strokeStyle = sp === 'W' ? 'rgba(70,40,4,.6)' : 'rgba(30,10,50,.55)'; g.lineWidth = Math.max(1, s * .015); g.stroke();
    if (n[2] < .35) return;
    g.globalAlpha = Math.min(1, (n[2] - .35) * 3); g.fillStyle = sp === 'W' ? '#3a2406' : sp === 'B' ? '#ffe28a' : '#fff6dc';
    d12Pips(f, x, y, s, M).forEach(p => { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); });
    g.globalAlpha = 1;
  });
}
function d12Top(M) { let best = -2, top = D12[0]; D12.forEach(f => { const z = mv(M, f.n)[2]; if (z > best) { best = z; top = f; } }); return top; }
function d12Snap(M) { // turn the die so its top face looks straight at the camera
  const n = mv(M, d12Top(M).n), ax = [n[1], -n[0], 0], L = Math.hypot(ax[0], ax[1]);
  if (L < 1e-6) return M;
  return orthonorm(mmul(axisRot([ax[0] / L, ax[1] / L, 0], Math.acos(Math.max(-1, Math.min(1, n[2])))), M));
}

// sprites
function buildCan(kind) {
  const w = Math.round(N * .036), h = Math.round(N * .066), k = mk(w, h), g = k.getContext('2d');
  const body = kind === 'W' ? [[0, '#5a3a08'], [.35, '#f2cf73'], [.5, '#c8952c'], [1, '#4a3006']] : kind === 'B' ? [[0, '#240a40'], [.35, '#a46cf0'], [.5, '#5a2a9a'], [1, '#1a0630']] : [[0, '#050605'], [.35, '#2b2f2b'], [.5, '#0d0f0d'], [1, '#020302']];
  rrect(g, 0, h * .06, w, h * .94, w * .18); g.fillStyle = grad(g, 0, 0, w, 0, body); g.fill();
  g.fillStyle = grad(g, 0, 0, w, 0, [[0, '#9aa1a8'], [.4, '#eef2f5'], [1, '#6b737b']]); g.fillRect(w * .12, 0, w * .76, h * .08);
  g.strokeStyle = kind ? '#ffffff' : '#8cff3a'; g.lineWidth = Math.max(1, w * .1); g.lineCap = 'round';
  [-.22, 0, .22].forEach(o => { g.beginPath(); g.moveTo(w * (.5 + o) - w * .05, h * .3); g.quadraticCurveTo(w * (.5 + o) + w * .07, h * .5, w * (.5 + o) - w * .02, h * .78); g.stroke(); });
  return k;
}
function drawStars(t, drift) {
  for (let i = 0; i < 140; i++) {
    const sx = mod(((i * 137.5) % 1) * N + i * 53.3 - drift * (.2 + (i % 3) * .25), N), sy = ((i * 91.7) % 100) / 100 * N;
    ctx.fillStyle = `rgba(255,255,255,${.25 + .5 * Math.abs(Math.sin(t * .002 + i))})`; ctx.fillRect(sx, sy, D * (1 + (i % 3) * .5), D * (1 + (i % 3) * .5));
  }
}
function drawPlanet(x, y, r, t) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, '#d7b6ff'); g.addColorStop(.5, '#7a3fd0'); g.addColorStop(1, '#1b0838'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? 'rgba(80,230,210,.18)' : 'rgba(255,190,90,.14)'; ctx.fillRect(x - r, y - r + (i + .2) * r / 3 + Math.sin(t * .001 + i) * r * .03, r * 2, r * .14); }
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.35); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * .32, 0, 0, TAU); ctx.ellipse(0, 0, r * 1.25, r * .2, 0, 0, TAU);
  ctx.fillStyle = 'rgba(240,210,150,.35)'; ctx.fill('evenodd'); ctx.restore();
}
function buildCosmic() {
  const k = mk(), g = k.getContext('2d'), n = COSMIC.length, seg = TAU / n, r0 = R * .2, r1 = R * .93;
  COSMIC.forEach((v, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg;
    wedgePath(g, a0, a1, r0, r1);
    g.fillStyle = wedgeFill(g, a0, a1, r0, r1, v === 10000 ? GOLD_A : v === 5000 ? PURPLE_A : [[0, '#0b3b3a'], [.3, '#4fd1c5'], [.55, '#0f4f4c'], [.8, '#8ef0e6'], [1, '#0b3b3a']]);
    g.fill();
    wedgeText(g, a0 + seg / 2, R * .6, [fakeEur(v)], R * .1, R * .5, v === 5000 ? 'dark' : 'light');
  });
  ridges(g, n, r0, r1);
  chromeRim(g, R * .93, R);
  const hub = g.createRadialGradient(c - R * .05, c - R * .05, 0, c, c, r0);
  hub.addColorStop(0, '#f3e6ff'); hub.addColorStop(.5, '#7a3fd0'); hub.addColorStop(1, '#1b0838');
  g.beginPath(); g.arc(c, c, r0, 0, TAU); g.fillStyle = hub; g.fill(); bevel(g, r0, true);
  return k;
}
function trackY(wx, kind) {
  const p = Math.max(0, Math.min(1, wx / (N * 7)));
  const base = kind === 1 ? N * (.78 - .42 * p) : N * (.3 + .48 * p);
  return base + N * .07 * Math.sin(wx / N * 3.1) + N * .035 * Math.sin(wx / N * 7.3 + 1);
}
function drawCoaster(now) {
  const C = coaster, k = C.kind;
  const sky = ctx.createLinearGradient(0, 0, 0, N);
  if (k === 1) { const p = Math.min(1, C.x / (N * 7)); sky.addColorStop(0, '#05030f'); sky.addColorStop(1, p < .5 ? '#2a1a5a' : '#0d0820'); }
  else { sky.addColorStop(0, '#120806'); sky.addColorStop(1, '#0a2a10'); }
  ctx.save(); rrect(ctx, D, D, N - 2 * D, N - 2 * D, N * .05); ctx.clip();
  ctx.fillStyle = sky; ctx.fillRect(0, 0, N, N);
  if (k === 1) drawStars(now, C.x); else { for (let i = 0; i < 40; i++) { const sx = mod(i * 97 - C.x * .4, N); ctx.fillStyle = 'rgba(140,255,90,.08)'; ctx.fillRect(sx, 0, N * .02, N); } }
  if (k === 1 && C.planet > 0) drawPlanet(N * .74, N * .24, N * .2 * C.planet, now);
  // supports and rails
  const step = N * .08;
  for (let wx = Math.floor(C.x / step) * step; wx < C.x + N + step; wx += step) {
    const sx = wx - C.x, y = trackY(wx, k);
    ctx.strokeStyle = k === 1 ? 'rgba(170,140,255,.35)' : 'rgba(120,220,90,.3)'; ctx.lineWidth = 2 * D;
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, N); ctx.stroke();
  }
  [0, N * .018].forEach((o, j) => {
    ctx.beginPath(); for (let sx = 0; sx <= N; sx += N / 80) { const y = trackY(C.x + sx, k) + o; sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
    ctx.strokeStyle = j ? 'rgba(90,70,140,.9)' : '#e8e0ff'; ctx.lineWidth = 2.5 * D; ctx.stroke();
  });
  // the cart, with three of you in it
  const cx = N * .32, cy = trackY(C.x + cx, k), ang = Math.atan2(trackY(C.x + cx + 4, k) - trackY(C.x + cx - 4, k), 8);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(sd * N * .035, -N * .006, N * .011, 0, TAU); ctx.fillStyle = '#c9d0d6'; ctx.fill(); });
  [-1, 0, 1].forEach(sd => { ctx.beginPath(); ctx.arc(sd * N * .026, -N * .062 + Math.sin(now * .02 + sd) * N * .003, N * .013, 0, TAU); ctx.fillStyle = '#f0c9a0'; ctx.fill(); });
  rrect(ctx, -N * .06, -N * .052, N * .12, N * .04, N * .012); ctx.fillStyle = grad(ctx, 0, -N * .05, 0, -N * .01, [[0, '#c9a2ff'], [1, '#4b1f7a']]); ctx.fill();
  ctx.strokeStyle = '#e2b856'; ctx.lineWidth = 2 * D; ctx.stroke();
  ankh(ctx, 0, -N * .032, -Math.PI / 2, N * .03);
  ctx.restore();
  ctx.restore();
}
function drawPlanetScene(now) {
  const P = planet;
  ctx.save(); rrect(ctx, D, D, N - 2 * D, N - 2 * D, N * .05); ctx.clip();
  ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, N, N); drawStars(now, now * .02);
  const r = lerp(N * .2, R * .95, P.grow), x = lerp(N * .74, c, P.grow), y = lerp(N * .24, c, P.grow);
  if (P.morph < 1) { ctx.globalAlpha = 1 - P.morph; drawPlanet(x, y, r, now); ctx.globalAlpha = 1; }
  if (P.melt <= 0) {
    if (P.morph > 0) { ctx.globalAlpha = P.morph; drawScaled(faces.cosmic, rotC, 1); ctx.globalAlpha = 1; drawPointer(faces.pointer, 1); }
  } else {
    // the wheel melts: strips sag and stretch, it goes molten, lava rises underneath
    const m = P.melt, tmp = P.tmp, g = tmp.getContext('2d'), hs = tmp.width / N; g.setTransform(hs, 0, 0, hs, 0, 0); g.clearRect(0, 0, N, N);
    const sw = N / 48;
    for (let i = 0; i < 48; i++) {
      const nz = .4 + .6 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1), off = m * m * N * .7 * nz;
      g.drawImage(P.src, i * sw, 0, sw + 1, N, i * sw, off, sw + 1, N * (1 + m * .5 * nz));
    }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,${Math.round(120 - m * 80)},0,${Math.min(.85, m * 1.2)})`; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0, 1 - m * .4); ctx.drawImage(tmp, 0, 0, N, N); ctx.globalAlpha = 1;
    const ly = N * (1 - .32 * m), lg = ctx.createLinearGradient(0, ly, 0, N); lg.addColorStop(0, '#ffd27a'); lg.addColorStop(.15, '#ff6a00'); lg.addColorStop(1, '#5a0a00');
    ctx.beginPath(); ctx.moveTo(0, N); for (let sx = 0; sx <= N; sx += N / 40) ctx.lineTo(sx, ly + Math.sin(sx / N * 18 + now * .004) * N * .012); ctx.lineTo(N, N); ctx.fillStyle = lg; ctx.fill();
    P.embers.forEach(e => { ctx.globalAlpha = Math.max(0, e.life); ctx.fillStyle = e.col; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // the prizes drip off it like wet paint
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    COSMIC.slice(0, 7).forEach((v, i) => {
      const nz = .5 + .5 * Math.abs(Math.sin(i * 7.31) * 9301 % 1), x = N * (.12 + i * .127), y = N * (.2 + (i % 3) * .1) + m * m * N * .55 * nz;
      ctx.save(); ctx.translate(x, y); ctx.scale(1 - m * .25, 1 + m * 2.2 * nz); ctx.globalAlpha = Math.min(1, m * 4) * Math.max(0, 1 - m * .7);
      ctx.font = `700 ${N * .05}px ${LABEL_FONT}`; ctx.fillStyle = `rgb(255,${Math.round(220 - m * 140)},${Math.round(120 - m * 110)})`; ctx.fillText(fakeEur(v), 0, 0);
      ctx.restore();
    });
    // and it was never real
    if (m > .35) {
      const k = Math.min(1, (m - .35) / .2), sc = 1 + (1 - easeOut(k)) * 1.8;
      ctx.save(); ctx.translate(c, N * .42); ctx.rotate(-.22); ctx.scale(sc, sc); ctx.globalAlpha = k;
      ctx.font = `900 ${N * .19}px ${LABEL_FONT}`; const tw = ctx.measureText('FAKE').width, bh = N * .22;
      ctx.lineWidth = N * .018; ctx.strokeStyle = '#e0141c'; rrect(ctx, -tw / 2 - N * .04, -bh / 2, tw + N * .08, bh, N * .03); ctx.stroke();
      ctx.fillStyle = '#e0141c'; ctx.fillText('FAKE', 0, N * .01);
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
function drawMonster(now) {
  const M = mon;
  ctx.save(); rrect(ctx, D, D, N - 2 * D, N - 2 * D, N * .05); ctx.clip();
  ctx.fillStyle = grad(ctx, 0, 0, 0, N, [[0, '#0b0f0a'], [1, '#050705']]); ctx.fillRect(0, 0, N, N);
  // the tank
  const x0 = N * .3, x1 = N * .7, y0 = N * .48, y1 = N * .95, H = y1 - y0, lvlY = v => y1 - v / TANK_CAP * H;
  rrect(ctx, x0, y0, x1 - x0, H, N * .02); ctx.fillStyle = 'rgba(160,255,120,.04)'; ctx.fill();
  const fy = lvlY(M.fill);
  ctx.save(); rrect(ctx, x0, y0, x1 - x0, H, N * .02); ctx.clip();
  const lg = ctx.createLinearGradient(0, fy, 0, y1); lg.addColorStop(0, '#c8ff6a'); lg.addColorStop(.1, '#7cff3a'); lg.addColorStop(1, '#1f7a10');
  ctx.beginPath(); ctx.moveTo(x0, y1); for (let sx = x0; sx <= x1; sx += N / 60) ctx.lineTo(sx, fy + Math.sin(sx / N * 30 + now * .006) * N * .004 * (M.pouring ? 2 : 1)); ctx.lineTo(x1, y1); ctx.fillStyle = lg; ctx.fill();
  for (let i = 0; i < 18; i++) { const bx = x0 + ((i * 0.618) % 1) * (x1 - x0), by = y1 - ((now * .0002 * (1 + i % 3) + i * .13) % 1) * (y1 - fy); if (by > fy) { ctx.beginPath(); ctx.arc(bx, by, N * .004, 0, TAU); ctx.fillStyle = 'rgba(230,255,200,.5)'; ctx.fill(); } }
  ctx.restore();
  const cur = TANK_LEVELS.reduce((a, l) => M.fill >= l.at ? l : a, TANK_LEVELS[0]);
  TANK_LEVELS.forEach((l, i) => {
    const ya = lvlY(l.at), yb = lvlY(i < TANK_LEVELS.length - 1 ? TANK_LEVELS[i + 1].at : TANK_CAP), on = l === cur && M.fill > 0;
    if (i) { ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(x1, ya); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5 * D; ctx.setLineDash([6 * D, 5 * D]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.font = `700 ${N * (on ? .04 : .032)}px ${LABEL_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? '#c8ff6a' : 'rgba(220,235,210,.6)'; ctx.fillText('€' + $m(l.v), x1 + N * .025, (ya + yb) / 2);
  });
  rrect(ctx, x0, y0, x1 - x0, H, N * .02); ctx.strokeStyle = 'rgba(220,235,225,.8)'; ctx.lineWidth = 3 * D; ctx.stroke();
  // pour streams, then the dice, the dots and the cans on top
  M.cans.forEach(k => { if (k.state === 'pour') { ctx.beginPath(); ctx.moveTo(k.x, k.y + N * .02); ctx.lineTo(k.x + Math.sin(now * .03) * N * .003, fy); ctx.strokeStyle = k.sp === 'W' ? 'rgba(255,214,90,.9)' : k.sp === 'B' ? 'rgba(190,130,255,.9)' : 'rgba(140,255,70,.85)'; ctx.lineWidth = N * (k.sp ? .014 : .008); ctx.stroke(); } });
  M.dice.forEach(d => {
    ctx.globalAlpha = d.a ?? 1;
    if (d.sp) { const gx = d.x, gy = d.y - d.z * N * .02, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, N * .1); gr.addColorStop(0, d.sp === 'W' ? 'rgba(255,214,110,.55)' : 'rgba(180,120,255,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(gx - N * .1, gy - N * .1, N * .2, N * .2); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(d.x + d.z * N * .03, d.y + d.z * N * .05, N * .035, N * .026, 0, 0, TAU); ctx.fill(); drawD12(ctx, d.x, d.y - d.z * N * .02, N * .11 * (1 + d.z * .4), d.M, d.sp); ctx.globalAlpha = 1;
  });
  M.dots.forEach(p => { if (p.gone) return; const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5); gr.addColorStop(0, p.sp === 'W' ? `rgba(255,220,120,${.8 * p.glow})` : p.sp === 'B' ? `rgba(190,130,255,${.8 * p.glow})` : `rgba(200,255,120,${.8 * p.glow})`); gr.addColorStop(1, 'rgba(120,255,60,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); });
  const cw = faces.can.width, ch = faces.can.height;
  M.cans.forEach(k => { if (k.state === 'gone' || k.state === 'wait') return; const im = k.sp === 'W' ? faces.canW : k.sp === 'B' ? faces.canB : faces.can, sc = k.sp ? 1.4 : 1; ctx.save(); ctx.globalAlpha = k.a; ctx.translate(k.x, k.y); ctx.rotate(k.rot); ctx.scale(k.s * sc, k.s * sc); ctx.drawImage(im, -cw / 2, -ch / 2); ctx.restore(); });
  ctx.restore();
}

async function roll12(dice) {
  dice.forEach(d => { const a = -Math.PI / 2 + (Math.random() - .5) * 2.6, sp = N * (.35 + Math.random() * .45); d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp + N * .15; d.vz = 2.6 + Math.random() * 1.4; d.w = [(Math.random() - .5) * 18, (Math.random() - .5) * 18, (Math.random() - .5) * 8]; });
  const x0 = N * .06, x1 = N * .94, y0 = N * .06, y1 = N * .42, rad = N * .052;
  let last = performance.now(), calm = 0, el = 0;
  await new Promise(res => {
    function f(now) {
      const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now; el += dt;
      for (let k = 0; k < 4; k++) {
        const h = dt / 4;
        dice.forEach(d => {
          d.vz -= 3.4 * h; d.z += d.vz * h; d.x += d.vx * h; d.y += d.vy * h; d.M = spinRot(d.M, d.w, h);
          if (d.z <= 0) {
            d.z = 0;
            if (d.vz < -.35) { d.vz = -d.vz * .52; d.w = d.w.map(x => x * .75 + (Math.random() - .5) * 6); d.vx += (Math.random() - .5) * N * .12; d.vy += (Math.random() - .5) * N * .12; tick(.5 + Math.min(.6, -d.vz * .2), 1200 + Math.random() * 500); }
            else d.vz = 0;
            d.vx *= .975; d.vy *= .975; d.w = d.w.map(x => x * .985);
            // on the felt it rolls: spin follows the direction it travels
            const rl = 1 / (N * .045); d.w[0] = lerp(d.w[0], -d.vy * rl, .04); d.w[1] = lerp(d.w[1], d.vx * rl, .04);
          }
          if (d.x < x0 + rad) { d.x = x0 + rad; d.vx = Math.abs(d.vx) * .6; } if (d.x > x1 - rad) { d.x = x1 - rad; d.vx = -Math.abs(d.vx) * .6; }
          if (d.y < y0 + rad) { d.y = y0 + rad; d.vy = Math.abs(d.vy) * .6; } if (d.y > y1 - rad) { d.y = y1 - rad; d.vy = -Math.abs(d.vy) * .6; }
        });
        for (let i = 0; i < dice.length; i++) for (let j = i + 1; j < dice.length; j++) {
          const a = dice[i], b = dice[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= 4 * rad * rad || d2 < 1e-6) continue;
          const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd, ov = (2 * rad - dd) / 2;
          a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { const jn = -.8 * vn; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; }
        }
      }
      const still = dice.every(d => d.z === 0 && d.vz === 0 && Math.hypot(d.vx, d.vy) < N * .02 && Math.hypot(...d.w) < 1.5);
      calm = still ? calm + 1 : 0; draw();
      if (calm > 12 || el > 13) res(); else requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  });
  const from = dice.map(d => d.M), to = dice.map(d => d12Snap(d.M));
  await animate(300, t => { dice.forEach((d, i) => d.M = lerpRot(from[i], to[i], easeOut(t))); draw(); });
  dice.forEach((d, i) => { d.M = to[i]; d.top = d12Top(d.M); });
  ting();
}

