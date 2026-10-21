// ---------- the Wild room roulette: every Wild and ankh you carried in becomes a ball ----------
// Owns Wild-room vault and roulette behavior.
const WILD_ACTS = [
  'Message Zena', 'Message Phelan', 'Message Laurence', 'Tell Phelan you love him', "Email Phelan's work", 'Track down Phelan',
  'Buy the next round of shots', 'Do a lap of the bar dancing', 'Get a stranger to say Phelan', 'Order your next drink in an accent',
  'Sing one line of a country song', 'Group selfie with a stranger', 'High five ten strangers', 'Swap jackets with someone in the group',
  'Toast to 77 Bridgefield', 'Tell the barman a joke',
];
const ROUL_N = 20, ROUL_SC = .95, ROUL_GOLD = [0, 5, 10, 15]; // four gold Wild pockets out of twenty: 20%
const R_TRACK = .885, R_POCKET = .64;
let roul = null, vault = null;
function rollPockets() {
  const acts = WILD_ACTS.slice().sort(() => Math.random() - .5), amts = [10, 10, 12, 12, 15, 15, 15, 20, 20, 25, 25, 30, 40, 50, 60, 75].sort(() => Math.random() - .5);
  let j = 0; return Array.from({ length: ROUL_N }, (_, i) => ROUL_GOLD.includes(i) ? { gold: true } : { act: acts[j], amt: amts[j++] });
}
function buildRoulBowl() { // the part that stays still: walnut rim, the ball track, gold deflectors
  const k = mk(), g = k.getContext('2d');
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = R * .1; g.shadowOffsetY = R * .05;
  g.beginPath(); g.arc(c, c, R * 1.04, 0, TAU); g.fillStyle = '#2a1608'; g.fill(); g.restore();
  const wood = g.createRadialGradient(c, c, R * .94, c, c, R * 1.04); wood.addColorStop(0, '#2a1406'); wood.addColorStop(.4, '#7a4419'); wood.addColorStop(.75, '#3c1f0b'); wood.addColorStop(1, '#9a5e2c');
  g.beginPath(); g.arc(c, c, R * 1.04, 0, TAU); g.arc(c, c, R * .94, 0, TAU, true); g.fillStyle = wood; g.fill();
  const tr = g.createRadialGradient(c, c, R * .8, c, c, R * .95); tr.addColorStop(0, '#120a05'); tr.addColorStop(.55, '#4a2a12'); tr.addColorStop(.88, '#d6a865'); tr.addColorStop(1, '#3a1e0a');
  g.beginPath(); g.arc(c, c, R * .95, 0, TAU); g.arc(c, c, R * .8, 0, TAU, true); g.fillStyle = tr; g.fill();
  [R * .95, R * 1.035].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, TAU); g.strokeStyle = '#e2bd5a'; g.lineWidth = 2 * D; g.stroke(); });
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + TAU / 16; g.save(); g.translate(c + Math.cos(a) * R * .83, c + Math.sin(a) * R * .83); g.rotate(a + Math.PI / 2);
    g.beginPath(); g.moveTo(-R * .028, 0); g.lineTo(0, -R * .012); g.lineTo(R * .028, 0); g.lineTo(0, R * .012); g.closePath(); g.fillStyle = grad(g, -R * .03, 0, R * .03, 0, GOLD_A); g.fill(); g.restore();
  }
  for (let i = 0; i < 24; i++) { const a = i * TAU / 24; stud(g, c + Math.cos(a) * R * .99, c + Math.sin(a) * R * .99, R * .011); }
  return k;
}
function buildRoulHead(pk) { // the part that turns: twenty pockets, the cone, the gold turret
  const k = mk(), g = k.getContext('2d'), seg = TAU / ROUL_N, r0 = R * .57, r1 = R * .8;
  g.beginPath(); g.arc(c, c, r1, 0, TAU); g.fillStyle = '#0c0805'; g.fill();
  pk.forEach((p, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg, am = a0 + seg / 2;
    wedgePath(g, a0, a1, r0, r1);
    g.fillStyle = p.gold ? wedgeFill(g, a0, a1, r0, r1, GOLD_A) : i % 2 ? '#17110d' : '#8c1a1f'; g.fill();
    if (p.gold) cleopatra(g, c + Math.cos(am) * R * .7, c + Math.sin(am) * R * .7, am, R * .14);
    else wedgeText(g, am, R * .735, ['€' + $m(p.amt)], R * .05, R * .1, 'dark');
  });
  const sh = g.createRadialGradient(c, c, r0, c, c, r1); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(.35, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
  g.beginPath(); g.arc(c, c, r1, 0, TAU); g.arc(c, c, r0, 0, TAU, true); g.fillStyle = sh; g.fill();
  ridges(g, ROUL_N, r0, r1);
  [r0, r1].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, TAU); g.strokeStyle = '#e8c45a'; g.lineWidth = 2.5 * D; g.stroke(); });
  const cone = g.createRadialGradient(c - R * .12, c - R * .14, R * .04, c, c, r0); cone.addColorStop(0, '#e2b46a'); cone.addColorStop(.45, '#80501f'); cone.addColorStop(1, '#241105');
  g.beginPath(); g.arc(c, c, r0 - 1.5 * D, 0, TAU); g.fillStyle = cone; g.fill();
  for (let i = 0; i < 4; i++) { g.save(); g.translate(c, c); g.rotate(i * TAU / 4 + .2); rrect(g, R * .09, -R * .02, R * .38, R * .04, R * .02); g.fillStyle = grad(g, 0, -R * .02, 0, R * .02, GOLD_A); g.fill(); stud(g, R * .45, 0, R * .028); g.restore(); }
  const dome = g.createRadialGradient(c - R * .03, c - R * .04, 0, c, c, R * .12); dome.addColorStop(0, '#fffbe6'); dome.addColorStop(.4, '#f3cf6e'); dome.addColorStop(1, '#5a3a08');
  g.beginPath(); g.arc(c, c, R * .12, 0, TAU); g.fillStyle = dome; g.fill();
  return k;
}
function roulBallXY(b) {
  const t = roul.t, k = R * ROUL_SC;
  if (b.s == null || t < b.s - .35) return { x: b.x, y: b.y };
  if (t < b.s) { const e = easeInOut((t - b.s + .35) / .35); return { x: lerp(b.x, c, e), y: lerp(b.y, c - R_TRACK * k, e) - Math.sin(e * Math.PI) * N * .03 }; }
  const u = Math.min(1, (t - b.s) / (b.land - b.s)), a = roul.rot + b.rel0 + (b.T - b.rel0) * easeOut(u);
  let rr = R_TRACK;
  if (u > .7) { const v = (u - .7) / .3; rr = lerp(R_TRACK, R_POCKET, easeIn(v)) + Math.abs(Math.sin(v * Math.PI * 3)) * (1 - v) * .06; }
  return { x: c + Math.cos(a) * rr * k, y: c + Math.sin(a) * rr * k };
}
function drawRoul(now) {
  ctx.drawImage(faces.stankBg, 0, 0);
  drawScaled(faces.roulBowl, 0, ROUL_SC);
  drawScaled(faces.roulHead, roul.rot, ROUL_SC);
  ctx.globalCompositeOperation = 'overlay'; drawScaled(faces.sheen, 0, ROUL_SC); ctx.globalCompositeOperation = 'source-over';
  const br = R * .048 * ROUL_SC;
  roul.balls.forEach(b => {
    const p = roulBallXY(b);
    if (b.hit) {
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, br * 4); gr.addColorStop(0, b.kind === 'B' ? `rgba(200,140,255,${.9 * b.hit})` : `rgba(255,226,130,${.9 * b.hit})`); gr.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, br * 4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(p.x + br * .25, p.y + br * .35, br, br * .8, 0, 0, TAU); ctx.fill();
    ctx.drawImage(ballImg(b), p.x - br, p.y - br, br * 2, br * 2);
  });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (roul.tally) { ctx.font = `700 ${N * .03}px ${LABEL_FONT}`; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(roul.tally, c, N * .045 + D); ctx.fillStyle = '#ffe9a8'; ctx.fillText(roul.tally, c, N * .045); }
  if (roul.label) {
    const [big, small] = roul.label;
    ctx.font = `700 ${N * .055}px ${LABEL_FONT}`; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(big, c, N * .9 + 2 * D); ctx.fillStyle = roul.labelGold ? '#ffe9a8' : '#f4eee0'; ctx.fillText(big, c, N * .9);
    if (small) { ctx.font = `600 ${N * .028}px ${LABEL_FONT}`; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(small, c, N * .955 + D); ctx.fillStyle = '#e8dcc0'; ctx.fillText(small, c, N * .955); }
  }
}
// the elite Wild room: down into a golden locksafe, three gold doors, gold tablets behind them
function drawVault(now) {
  const V = vault;
  ctx.save(); rrect(ctx, D, D, N - 2 * D, N - 2 * D, N * .05); ctx.clip();
  ctx.fillStyle = grad(ctx, 0, 0, 0, N, [[0, '#120b02'], [.55, '#3a2607'], [1, '#0d0801']]); ctx.fillRect(0, 0, N, N);
  if (V.ph === 'safe') {
    // falling down the shaft: gold light streaks rush up past you
    for (let i = 0; i < 26; i++) { const x = ((i * .618) % 1) * N, y = mod(i * N * .137 - now * N * .0012 * (1 + i % 3) * (1 - V.drop * .8), N * 1.3) - N * .15; ctx.fillStyle = `rgba(255,214,120,${.08 + (i % 4) * .04})`; ctx.fillRect(x, y, D * (1 + i % 3), N * .12); }
    const r = N * .37 * (.35 + .65 * easeOut(V.drop)), cy = lerp(N * .75, c, easeOut(V.drop));
    const gl = ctx.createRadialGradient(c, cy, 0, c, cy, r * 1.1); gl.addColorStop(0, '#fff3c0'); gl.addColorStop(.6, '#e0a83a'); gl.addColorStop(1, 'rgba(120,70,10,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c, cy, r * 1.1, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(c - r * V.open * .95, cy); ctx.scale(Math.max(.03, 1 - V.open), 1);
    const disc = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r); disc.addColorStop(0, '#fff0b0'); disc.addColorStop(.45, '#d7a43c'); disc.addColorStop(1, '#5a3a08');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = disc; ctx.fill(); ctx.strokeStyle = '#3a2405'; ctx.lineWidth = 3 * D; ctx.stroke();
    [.82, .55].forEach(f => { ctx.beginPath(); ctx.arc(0, 0, r * f, 0, TAU); ctx.strokeStyle = 'rgba(60,36,6,.55)'; ctx.lineWidth = 2 * D; ctx.stroke(); });
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; stud(ctx, Math.cos(a) * r * .9, Math.sin(a) * r * .9, r * .035); }
    ctx.save(); ctx.rotate(V.spin);
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * TAU / 3); rrect(ctx, 0, -r * .035, r * .5, r * .07, r * .035); ctx.fillStyle = grad(ctx, 0, -r * .035, 0, r * .035, GOLD_A); ctx.fill(); stud(ctx, r * .52, 0, r * .07); ctx.restore(); }
    ctx.restore(); stud(ctx, 0, 0, r * .13);
    ctx.restore();
    ctx.font = `700 ${N * .045}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = `rgba(255,233,168,${V.drop})`; ctx.fillText('THE GOLDEN LOCKSAFE', c, N * .08);
  } else {
    ctx.strokeStyle = 'rgba(255,214,120,.08)'; ctx.lineWidth = D; for (let y = N * .05; y < N; y += N * .05) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(N, y); ctx.stroke(); }
    V.doors.forEach((d, j) => {
      const r = doorRect(j);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.fillStyle = grad(ctx, 0, r.y, 0, r.y + r.h, [[0, '#3a0f14'], [1, '#140406']]); ctx.fillRect(r.x, r.y, r.w, r.h);
      const tx = r.x + r.w * .12, ty = r.y + r.h * .26, tw = r.w * .76, th = r.h * .48;
      ctx.save(); ctx.shadowColor = 'rgba(255,210,110,.8)'; ctx.shadowBlur = N * .04 * d.open; rrect(ctx, tx, ty, tw, th, tw * .12); ctx.fillStyle = grad(ctx, tx, ty, tx + tw, ty + th, GOLD_A); ctx.fill(); ctx.restore();
      rrect(ctx, tx + tw * .08, ty + th * .07, tw * .84, th * .86, tw * .09); ctx.strokeStyle = 'rgba(70,42,6,.6)'; ctx.lineWidth = 1.5 * D; ctx.stroke();
      ctx.font = `700 ${r.w * .26}px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2208'; ctx.fillText('€' + $m(d.amt), r.x + r.w / 2, ty + th / 2);
      const sy = r.y - d.open * r.h;
      ctx.fillStyle = grad(ctx, r.x, 0, r.x + r.w, 0, [[0, '#7a5310'], [.3, '#f2cf73'], [.55, '#fff3c4'], [.8, '#d9a93e'], [1, '#6a460c']]); ctx.fillRect(r.x, sy, r.w, r.h);
      ctx.strokeStyle = 'rgba(70,42,6,.55)'; ctx.lineWidth = 2 * D; ctx.strokeRect(r.x + r.w * .1, sy + r.h * .07, r.w * .8, r.h * .86);
      [[.18, .12], [.82, .12], [.18, .88], [.82, .88]].forEach(([a, b]) => stud(ctx, r.x + r.w * a, sy + r.h * b, r.w * .045));
      ctx.fillStyle = '#2a1804'; ctx.beginPath(); ctx.arc(r.x + r.w / 2, sy + r.h * .45, r.w * .07, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r.x + r.w * .47, sy + r.h * .46); ctx.lineTo(r.x + r.w * .53, sy + r.h * .46); ctx.lineTo(r.x + r.w * .56, sy + r.h * .58); ctx.lineTo(r.x + r.w * .44, sy + r.h * .58); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#4a3008'; ctx.fillRect(r.x - N * .02, r.y - N * .04, r.w + N * .04, N * .04); ctx.fillRect(r.x - N * .02, r.y, N * .02, r.h); ctx.fillRect(r.x + r.w, r.y, N * .02, r.h);
      if (V.pickable) { const pulse = .35 + .35 * Math.sin(now / 250 + j); ctx.strokeStyle = `rgba(255,225,130,${pulse})`; ctx.lineWidth = 3 * D; ctx.strokeRect(r.x - N * .02, r.y - N * .04, r.w + N * .04, r.h + N * .04); }
    });
  }
  ctx.restore();
}
async function vaultRun(steps, cash, acts) {
  Music.sting(4); buzz([100, 60, 100, 60, 300]);
  setVerdict({ eyebrow: 'Elite Wild', title: 'Three gold Wilds', body: 'The floor opens. Down into the golden locksafe.', steps: steps.slice(), flash: true });
  vault = { ph: 'safe', spin: 0, open: 0, drop: 0, pickable: false, doors: [0, 1, 2].map(() => ({ open: 0, amt: 100 + 20 * Math.floor(Math.random() * 20) })) };
  whoosh(true);
  await crossTo(() => { scene = 'vault'; }, 900);
  $('#caption').textContent = 'The golden locksafe';
  await animate(2200, t => { vault.drop = t; if (Math.random() < .1) tick(.3, 300 + Math.random() * 200); draw(); });
  await wait(300);
  await animate(1700, t => { vault.spin = easeInOut(t) * TAU * 1.25; if (Math.random() < .25) tick(.6, 500 + Math.random() * 300); draw(); });
  ting(); buzz([40, 30, 80]);
  await animate(1300, t => { vault.open = easeInOut(t); draw(); });
  await crossTo(() => { vault.ph = 'doors'; vault.pickable = true; }, 800);
  $('#caption').textContent = 'Pick a gold door';
  setBtn('Pick a door', true);
  let alive = true; (function pulse() { if (!alive) return; draw(); requestAnimationFrame(pulse); })();
  const chosen = await waitTap((x, y) => { for (let j = 0; j < 3; j++) { const d = doorRect(j); if (x > d.x - N * .03 && x < d.x + d.w + N * .03 && y > d.y - N * .06 && y < d.y + d.h + N * .03) return j; } return null; });
  alive = false; vault.pickable = false;
  const d = vault.doors[chosen];
  Music.sting(3); buzz([40, 40, 40]);
  await animate(1400, t => { d.open = easeInOut(t); if (t < .8 && Math.random() < .3) tick(.4, 600 + Math.random() * 200); draw(); });
  ting(); buzz([60, 40, 120]);
  await wait(600);
  await animate(1000, t => { vault.doors.forEach(o => { if (o !== d) o.open = easeInOut(t) * .85; }); draw(); });
  const total = d.amt + cash;
  $('#caption').textContent = 'Tap Spin to go back to the top';
  setVerdict({ eyebrow: 'Final answer · €' + $m(total), title: `The locksafe pays €${$m(d.amt)}`, body: (cash ? `Plus €${$m(cash)} from the roulette. ` : '') + (acts.length ? 'Do these before the next spin: ' + acts.join('. ') + '.' : ''), steps: steps.slice(), q: quote() });
  speak(['Final answer', ...spokenMoves(steps), ...acts, `The golden locksafe pays ${$m(d.amt)} euro`, cash ? `plus ${$m(cash)} from the roulette` : '', roomAct('pub')].filter(Boolean));
  logMove(`Ultra bonus · golden locksafe · €${$m(total)}`);
}
async function bonusRun(steps, w = 3, b = 0) {
  roomHit = true; buzz([80, 60, 80, 60, 250]);
  ensureStank();
  setVerdict({ eyebrow: 'Ultra bonus', title: 'Three wilds', body: 'Something is waiting at 77 Bridgefield.', steps: steps.slice() });
  $('#caption').textContent = 'Ultra bonus';
  await wait(900);
  whoosh(true);
  await fadeTo(1, 800);
  scene = 'intro'; introT = 0; fade = 0; Music.duck(.3);
  await animate(7000, t => { introT = Math.min(1, t / .62); draw(); });
  await fadeTo(1, 700);
  scene = 'building'; camT = 0;
  await fadeTo(0, 700);
  await wait(900);
  whoosh(true);
  await animate(3800, t => { camT = t; draw(); });
  scene = 'hall'; hallZ = 0; doorT = 0;
  await animate(500, t => { fade = 0; ctx.globalAlpha = 1; draw(); ctx.fillStyle = `rgba(255,214,140,${1 - t})`; ctx.fillRect(0, 0, N, N); });
  $('#caption').textContent = 'The Stank Chamber';
  await animate(2200, t => { hallZ = easeInOut(t); draw(); });
  await wait(400);
  tick(1.5, 400);
  await animate(1400, t => { doorT = easeInOut(t); draw(); });
  await animate(450, t => { draw(); ctx.fillStyle = `rgba(255,236,180,${t})`; ctx.fillRect(0, 0, N, N); });
  // the Stankman's roulette: every Wild and ankh you carried in lifts off the tiles and becomes a ball
  if (!faces.roulBowl || faces.roulBowl.width !== N) faces.roulBowl = buildRoulBowl();
  const pk = rollPockets(); faces.roulHead = buildRoulHead(pk);
  roul = { rot: 0, t: 0, pk, balls: [], label: null, tally: '' };
  scene = 'roul';
  $('#caption').textContent = "The Stankman's Roulette"; Music.setLevel(4); Music.duck(1); Music.sting(4);
  setVerdict({ eyebrow: 'Ultra bonus', title: "The Stankman's Roulette", body: 'Every Wild and ankh you brought in becomes a ball. Land three on gold and the locksafe opens.', steps: steps.slice() });
  await animate(600, t => { draw(); ctx.fillStyle = `rgba(255,236,180,${1 - t})`; ctx.fillRect(0, 0, N, N); });
  const cr = cv.getBoundingClientRect(), litOf = kd => [...wildTiles.filter((k, j) => (kd === 'W' ? j < 3 : j >= 3) && k.classList.contains('lit')), ...$('#wx' + kd).children];
  const srcs = { W: litOf('W'), B: litOf('B') }, kinds = [...Array(w).fill('W'), ...Array(b).fill('B')], nb = kinds.length, gap = Math.min(N * .08, N * .8 / nb), seen = { W: 0, B: 0 };
  kinds.forEach((kd, i) => {
    const list = srcs[kd], el = list[Math.min(seen[kd]++, list.length - 1)], r = el ? el.getBoundingClientRect() : null;
    const sx = r ? (r.left + r.width / 2 - cr.left) / cr.width * N : c, sy = r ? (r.top + r.height / 2 - cr.top) / cr.height * N : N * 1.1;
    roul.balls.push({ kind: kd, el, sx, sy, x: sx, y: sy, tx: c + (i - (nb - 1) / 2) * gap, ty: N * .1, hit: 0 });
  });
  await animate(1500 + nb * 90, t => {
    roul.balls.forEach((bl, i) => {
      const u = Math.max(0, Math.min(1, (t * (1 + nb * .06) - i * .06)));
      if (u > 0 && bl.el) { bl.el.classList.remove('lit'); bl.el.classList.add('gone'); bl.el.style.opacity = '.15'; bl.el = null; popSound(); }
      const e = easeInOut(u); bl.x = lerp(bl.sx, bl.tx, e) + Math.sin(e * Math.PI) * N * .05; bl.y = lerp(bl.sy, bl.ty, e);
    });
    draw();
  });
  roul.tally = 'GOLD 0 OF 3';
  await wait(500);
  // spin: the wheel turns one way, the balls run the other way round the track, then drop into pockets
  const seg = TAU / ROUL_N, Dsec = Math.max(9.5, 5.2 + (nb - 1) * .55 + 1.4), rotAt = s => 6 * TAU * easeOut(Math.min(1, s / Dsec)), used = {};
  roul.balls.forEach((bl, i) => {
    bl.pocket = Math.floor(Math.random() * ROUL_N); const dup = used[bl.pocket] = (used[bl.pocket] || 0) + 1;
    bl.s = .5 + i * .3; bl.land = 5.2 + i * .55; bl.bn = -1;
    const pa = BASE + (bl.pocket + .5) * seg + [0, .26, -.26, .13, -.13][Math.min(4, dup - 1)] * seg;
    bl.rel0 = -Math.PI / 2 - rotAt(bl.s); bl.T = bl.rel0 - mod(bl.rel0 - pa, TAU) - TAU * 4;
  });
  whoosh(true); tick(1.4, 900); buzz(25);
  let lastTick = 0;
  await animate(Dsec * 1000, t => {
    roul.t = t * Dsec; roul.rot = rotAt(roul.t);
    roul.balls.forEach(bl => {
      if (roul.t < bl.s) return;
      const u = Math.min(1, (roul.t - bl.s) / (bl.land - bl.s));
      if (u > .7 && u < 1) { const k = Math.floor((u - .7) / .3 * 3); if (k !== bl.bn) { bl.bn = k; tick(.7, 2600 + Math.random() * 400); } }
      if (u >= 1 && !bl.landed) { bl.landed = true; tick(1.3, 1500); buzz(15); }
    });
    if (roul.t - lastTick > .09 * (1 + t * 3)) { lastTick = roul.t; tick(.25, 3200); }
    draw();
  });
  // read them out, one ball at a time
  let cash = 0, gold = 0; const acts = [];
  for (const bl of roul.balls) {
    const p = pk[bl.pocket];
    if (p.gold) { gold++; roul.label = [`GOLD WILD · ${gold} OF 3`, '']; roul.labelGold = true; Music.sting(Math.min(4, gold + 1)); buzz([40, 30, 80]); }
    else {
      const v = p.amt * (bl.kind === 'B' ? 2 : 1); cash += v; if (!acts.includes(p.act)) acts.push(p.act);
      roul.label = [bl.kind === 'B' ? `€${$m(p.amt)} × 2 = €${$m(v)}` : `€${$m(v)}`, p.act.toUpperCase()]; roul.labelGold = false; ting(); buzz(25);
    }
    roul.tally = `GOLD ${gold} OF 3 · €${$m(cash)}`;
    await animate(1000, t => { bl.hit = Math.sin(Math.min(1, t * 1.8) * Math.PI / 2); draw(); });
    bl.hit = .55;
  }
  await wait(800);
  if (gold >= 3) { await vaultRun(steps, cash, acts); return; }
  if (gold) cash += gold * 50;
  roul.label = [`€${$m(cash)}`, gold ? `${gold} GOLD WILD${gold > 1 ? 'S' : ''} AT €${$m(50)}, NO LOCKSAFE` : '']; roul.labelGold = true; roul.tally = ''; draw();
  ting(); buzz([60, 40, 120]);
  setVerdict({ eyebrow: 'Final answer · €' + $m(cash), title: `The Stank Chamber pays €${$m(cash)}`, body: (gold ? `${gold} gold Wild${gold > 1 ? 's' : ''} at €${$m(50)} each, short of the locksafe. ` : '') + (acts.length ? 'Do these before the next spin: ' + acts.join('. ') + '.' : ''), steps: steps.slice(), q: quote() });
  speak(['Final answer', ...spokenMoves(steps), ...acts, `The Stank Chamber pays ${$m(cash)} euro`, roomAct('pub')]);
  $('#caption').textContent = 'Tap Spin to go back to the top';
  logMove(`Ultra bonus · roulette · €${$m(cash)}`);
}
