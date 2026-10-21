// ---------- motion ----------
// Owns wheel spins, transitions, and animated game effects.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = t => 1 - Math.pow(1 - t, 4);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function animate(dur, step) {
  if (reduce) dur = Math.min(dur, 1200);
  return new Promise(res => {
    const t0 = performance.now();
    // the first frame's timestamp can be a hair before t0, so clamp at 0; and a frame that throws must never stall the run
    function f(now) {
      const t = Math.max(0, Math.min(1, (now - t0) / dur));
      try { step(t); } catch (e) { console.error(String(e && e.stack || e)); }
      if (t < 1) requestAnimationFrame(f); else res();
    }
    requestAnimationFrame(f);
  });
}
const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 300) : ms));
const sliceAt = (r, n) => Math.floor(mod(-r, TAU) / (TAU / n)) % n;
function target(n) { const i = Math.floor(Math.random() * n); return { i, a: (i + .15 + Math.random() * .7) * TAU / n }; }

let sweepOn = false, sweepA = 0, winGlow = null;
async function spinLayer(k, dur, dir) {
  liveK = k; sweepOn = true; winGlow = null;
  try { const i = await spinLayerRun(k, dur, dir); winGlow = { k, i, t0: performance.now() }; return i; } finally { liveK = -1; sweepOn = false; }
}
// the slice a wheel stopped on glows and pulses, then settles to a soft gold edge
function drawWinGlow() {
  if (!winGlow || scene !== 'nested' || !LAYERS[winGlow.k]) return;
  const { k, i, t0 } = winGlow, sc = layerVisible(k); if (sc <= 0) return;
  const n = LAYERS[k].length, seg = TAU / n, a0 = BASE + i * seg + rot[k], t = (performance.now() - t0) / 1000;
  const a = Math.min(1, t * 3) * (t < 2.4 ? .55 + .3 * Math.sin(t * 7) : .35);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.arc(c, c, R * .93 * sc, a0, a0 + seg); ctx.arc(c, c, R * .55 * sc, a0 + seg, a0, true); ctx.closePath();
  ctx.fillStyle = `rgba(255,214,120,${.32 * a})`; ctx.fill();
  ctx.shadowColor = 'rgba(255,210,110,.9)'; ctx.shadowBlur = R * .04 * sc;
  ctx.strokeStyle = `rgba(255,232,170,${.9 * a})`; ctx.lineWidth = 2.2 * D; ctx.stroke();
  ctx.restore();
}
// a Wild, ankh or God slice: the ones worth teasing and the ones Ghost Phelan pushes you onto
const hotSlice = it => !!(it && (it.wild || it.bonus || it.god));
let GHOST_CHANCE = 1 / 20; // per inner-wheel spin, so roughly one deep run in five sees him
// user chose 25% (Oct 21): about 37% of deep runs end in a room, Pyramid about 1 in 72
let TIP_CHANCE = .10;
let ghost = null;
async function spinLayerRun(k, dur, dir) {
  const n = LAYERS[k].length, t = target(n), turns = (k ? 3 : 5) + Math.floor(Math.random() * 2), s = rot[k], seg = TAU / n;
  const items = LAYERS[k], at = j => items[mod(j, n)];
  // one slice off a hot one: which side is it on (+1 = the next slice, -1 = the one before)
  // any special counts for the edge: Wild, ankh, God, More and Go back up slices
  const tease = it => hotSlice(it) || !!(it && (it.boost || it.up || it.even));
  const near = k && !tease(items[t.i]) ? (tease(at(t.i + 1)) ? 1 : tease(at(t.i - 1)) ? -1 : 0) : 0;
  const ghostNow = k > 0 && Math.random() < GHOST_CHANCE;
  const ghostNear = k && !hotSlice(items[t.i]) ? (hotSlice(at(t.i + 1)) ? 1 : hotSlice(at(t.i - 1)) ? -1 : 0) : 0;
  // a near miss stops right at the edge of the hot slice, so it hurts
  if (near && !ghostNow) t.a = (t.i + (near > 0 ? .9 + Math.random() * .05 : .05 + Math.random() * .05)) * seg;
  // landing on a special never sits on its edge, so it can't look like it might slip back off onto a normal slice
  else if (k && tease(items[t.i])) t.a = (t.i + .2 + Math.random() * .6) * seg;
  const e = dir > 0 ? s + turns * TAU + mod(-t.a - s, TAU) : s - turns * TAU - mod(s + t.a, TAU);
  let last = sliceAt(s, n);
  await animate(dur, p => {
    rot[k] = s + (e - s) * easeOut(p);
    const sl = sliceAt(rot[k], n); if (sl !== last) { last = sl; tick(1, 1500 + k * 250); flap(dir); pegBuzz(); }
    draw();
  });
  rot[k] = mod(rot[k], TAU);
  if (ghostNow) return await ghostPhelan(k, t.i, ghostNear);
  if (near) { // the pointer leans toward the special and teeters on the edge: TIP_CHANCE of the time it tips over onto it
    const r0 = rot[k], edge = -(t.i + (near > 0 ? 1 : 0)) * seg, gap = mod(edge - r0 + Math.PI, TAU) - Math.PI;
    let tk = 0;
    if (Math.random() < TIP_CHANCE) {
      await animate(1500, p => {
        const over = gap + Math.sign(gap) * seg * .14; // hangs on the edge, then over it goes
        rot[k] = r0 + (p < .6 ? gap * .93 * Math.sin(p / .6 * Math.PI / 2) + Math.sin(p * 40) * seg * .015 : lerp(gap * .93, over, easeOut((p - .6) / .4)));
        if (p > tk) { tick(.6, 1300); pegBuzz(); tk += .16; }
        draw();
      });
      rot[k] = mod(r0 + gap + Math.sign(gap) * seg * .14, TAU);
      ting(); buzz([60, 40, 120]);
      return mod(t.i + near, n);
    }
    await animate(1300, p => {
      const lean = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) * (p < .62 ? 1 : Math.max(0, 1 - (p - .62) / .38 * 1.4));
      rot[k] = r0 + gap * .6 * lean + Math.sin(p * 40) * seg * .01 * (1 - p); // leans in but never reaches the special's edge
      if (p > tk) { tick(.6, 1300); pegBuzz(); tk += .16; }
      draw();
    });
    rot[k] = r0; draw();
  }
  ting(); buzz([30, 40, 60]);
  return t.i;
}
// Ghost Phelan drifts past the pointer; if a hot slice is next door he gives the wheel a shove onto it
async function ghostPhelan(k, i, near) {
  const n = LAYERS[k].length, seg = TAU / n, r0 = rot[k], px = c, py = c - R * .985;
  const dest = near ? mod(i + near, n) : i, want = -(dest + .5) * seg, push = near ? mod(want - r0 + Math.PI, TAU) - Math.PI : 0;
  setVerdict({ eyebrow: 'Something cold', title: 'Ghost Phelan', body: '', flash: true });
  Music.sting(2); buzz([20, 80, 20, 80, 20]);
  ghost = { x: N * 1.15, y: py + R * .15, a: 0, side: near || 1 };
  await animate(1100, p => { const e = easeOut(p); ghost.x = lerp(N * 1.15, px + R * .22 * ghost.side, e); ghost.y = py + R * .15 + Math.sin(p * 6) * R * .02; ghost.a = Math.min(1, p * 2); draw(); });
  let last = sliceAt(rot[k], n);
  await animate(near ? 900 : 500, p => {
    ghost.x = px + R * .22 * ghost.side - Math.sin(p * Math.PI) * R * .08 * ghost.side;
    if (near) { rot[k] = r0 + push * easeInOut(p); const sl = sliceAt(rot[k], n); if (sl !== last) { last = sl; tick(1.3, 900); buzz(40); } }
    draw();
  });
  if (near) { rot[k] = mod(r0 + push, TAU); ting(); buzz([60, 40, 120]); }
  await animate(1000, p => { ghost.x = px + R * .22 * ghost.side - R * .08 * ghost.side - p * N * .9; ghost.y -= R * .004; ghost.a = 1 - p; draw(); });
  ghost = null; draw();
  return dest;
}
function drawGhost() {
  const g = ctx, s = R * .26;
  g.save(); g.globalAlpha = ghost.a * .85; g.translate(ghost.x, ghost.y);
  g.shadowColor = 'rgba(160,255,200,.8)'; g.shadowBlur = s * .5;
  g.beginPath(); g.moveTo(-s * .5, s * .6); g.lineTo(-s * .5, -s * .1); g.arc(0, -s * .1, s * .5, Math.PI, 0); g.lineTo(s * .5, s * .6);
  for (let j = 0; j < 4; j++) g.quadraticCurveTo(s * (.5 - j * .25 - .125), s * (j % 2 ? .45 : .8), s * (.5 - (j + 1) * .25), s * .6);
  g.fillStyle = 'rgba(235,250,245,.92)'; g.fill(); g.shadowBlur = 0;
  g.fillStyle = '#1b2a26'; g.beginPath(); g.ellipse(-s * .17, -s * .12, s * .07, s * .1, 0, 0, TAU); g.ellipse(s * .17, -s * .12, s * .07, s * .1, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, s * .12, s * .09, s * .06, 0, 0, TAU); g.fill();
  g.fillStyle = '#3d4a2e'; g.beginPath(); g.ellipse(0, -s * .55, s * .42, s * .1, 0, Math.PI, 0); g.fill(); // his cap
  g.strokeStyle = 'rgba(150,200,90,.7)'; g.lineWidth = s * .04; // the stink follows him even now
  [-.4, 0, .4].forEach((o, j) => { g.beginPath(); g.moveTo(s * (o + .7), s * .2); g.bezierCurveTo(s * (o + .85), 0, s * (o + .6), -s * .2, s * (o + .8), -s * .4 - j * s * .05); g.stroke(); });
  g.restore();
}
// the dive between wheels: a wind-up, a drum roll that speeds up, speed lines, a little overshoot and a crash
let streak = 0;
async function dive(z) {
  const from = zoom; whoosh(true);
  await animate(450, t => { zoom = from * (1 - .05 * Math.sin(t * Math.PI)); draw(); });
  let nextRoll = 0;
  await animate(2600, t => {
    const e = easeInOut(t), over = Math.sin(Math.min(1, t * 1.25) * Math.PI) * .07 * (t > .6 ? 1 : 0);
    zoom = from * Math.pow(z / from, Math.min(1, e + over));
    streak = Math.sin(t * Math.PI);
    if (t >= nextRoll) { tick(.35 + t * .5, 700 + t * 1400); nextRoll += lerp(.07, .018, t); }
    draw();
  });
  zoom = z; streak = 0; draw(); ting(); buzz(30);
}
async function zoomTo(z, dur) {
  const from = zoom; whoosh(z > from);
  await animate(dur, t => { zoom = from * Math.pow(z / from, easeInOut(t)); draw(); });
  zoom = z; draw();
}
// smooth scene change: the last frame melts away over the new scene, never through black
let snap = null, snapA = 0, dots = [], godParts = [], boostA = Array(MAXD + 1).fill(0), boostNew = [];
// More Wilds / More Bonus: icons pour into the wheels further in, which flash and come back with extra slices
function boostedOrder(order, kind, extra, k) {
  const o = order.slice(), sp = x => ['WD', 'BN', 'GD', 'MW', 'MB', 'UP', 'UW', 'UB'].includes(x);
  let added = 0, j = k * 2;
  const spots = o.map((x, i) => i).filter(i => !sp(o[i]));
  const pickS = spots.filter((_, n) => n % Math.max(1, Math.floor(spots.length / extra)) === 0).slice(0, extra).sort((a, b) => b - a);
  // one of each batch is a Go back up Wild / Go back up Bonus, never on the first inner wheel (there's nowhere to go back up to)
  pickS.forEach((i, q) => { o.splice(i + 1, 0, q === 1 && k >= 2 ? (kind === 'W' ? 'UW' : 'UB') : kind === 'W' ? 'WD' : 'BN', REPLACE[j++ % REPLACE.length]); added++; });
  return o;
}
// Golden run: 1 in 30 Go deepers turn every wheel below into nothing but Wilds, ankhs and God slices
let GOLDEN_CHANCE = 1 / 30;
async function goldenRun() {
  for (let j = 1; j <= DEPTH; j++) {
    // a quarter of the golden Wilds and ankhs below the first wheel also send you back up, so all six (the Pyramid) is about 1 in 100
    const o = BASE_ORDERS[j - 1].map(() => {
      const r = Math.random(), kd = j < DEPTH ? (r < .5 ? 'W' : 'B') : r < .42 ? 'W' : r < .84 ? 'B' : 'G';
      return kd === 'G' ? 'GD' : j >= 2 && Math.random() < .25 ? (kd === 'W' ? 'UW' : 'UB') : kd === 'W' ? 'WD' : 'BN';
    });
    boostNew[j] = o; faces['boost' + j] = ringFor(j, o);
  }
  Music.sting(4); buzz([100, 50, 100, 50, 100, 50, 300]); whoosh(true);
  setVerdict({ eyebrow: 'Going deeper', title: 'Golden run', body: 'Every wheel below has turned to gold.', flash: true });
  $('#caption').textContent = 'Golden run';
  const img = mk(96, 96), img2 = mk(96, 96); paintTile(img, 'W'); paintTile(img2, 'B');
  godParts = [];
  for (let i = 0; i < 70; i++) { const a = Math.random() * TAU, sp = N * (.25 + Math.random() * .9); godParts.push({ x: c, y: c, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - N * .2, r: Math.random() * TAU, vr: (Math.random() - .5) * 10, s: N * (.035 + Math.random() * .04), life: 1.8 + Math.random(), img: i % 2 ? img : img2 }); }
  let last = performance.now();
  await animate(2600, t => {
    const now = performance.now(), dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    godParts.forEach(p => { p.vy += N * .8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt * .7; });
    for (let j = 1; j <= DEPTH; j++) boostA[j] = Math.max(0, Math.min(1, (t - .2) / .5));
    draw();
    const f = Math.max(0, Math.sin(Math.min(1, t * 2.5) * Math.PI));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,80,${f * .55})`; ctx.fillRect(0, 0, N, N); ctx.restore();
  });
  godParts = [];
  for (let j = 1; j <= DEPTH; j++) { setLayerOrder(j, boostNew[j]); boostA[j] = 0; }
  draw(); ting();
}
async function boostRun(kind, fromK) {
  const img = mk(96, 96); paintTile(img, kind);
  for (let j = fromK + 1; j <= DEPTH; j++) { boostNew[j] = boostedOrder(runOrders[j - 1], kind, 4, j); faces['boost' + j] = ringFor(j, boostNew[j]); }
  Music.sting(3); buzz([40, 30, 40, 30, 120]); whoosh(true);
  setVerdict({ eyebrow: 'Going deeper', title: kind === 'W' ? 'More Wilds' : 'More Bonus', body: 'The wheels below are changing.', flash: true });
  godParts = [];
  for (let i = 0; i < 36; i++) {
    const j = fromK + 1 + (i % (DEPTH - fromK)), sc = Math.pow(S, j - fromK), a = Math.random() * TAU, rr = R * (.6 + Math.random() * .3) * sc;
    godParts.push({ sx: c, sy: c - R * .74, x: c, y: c - R * .74, tx: c + Math.cos(a) * rr, ty: c + Math.sin(a) * rr, r: Math.random() * TAU, vr: (Math.random() - .5) * 8, s: N * (.035 + Math.random() * .02) * (.6 + sc * .4), life: 1, img, d: i * .018 });
  }
  let hits = 0;
  await animate(1700, t => {
    godParts.forEach(p => {
      const u = Math.max(0, Math.min(1, (t - p.d) / .55)), e = easeInOut(u);
      p.x = lerp(p.sx, p.tx, e); p.y = lerp(p.sy, p.ty, e) - Math.sin(u * Math.PI) * N * .15; p.r += p.vr / 60; p.life = u >= 1 ? Math.max(0, p.life - .08) : 1;
      if (u >= 1 && !p.hit) { p.hit = true; if (hits++ % 3 === 0) tick(.8, 1600 + Math.random() * 800); }
    });
    for (let j = fromK + 1; j <= DEPTH; j++) boostA[j] = Math.max(0, Math.min(1, (t - .45) / .45));
    draw();
  });
  godParts = [];
  for (let j = fromK + 1; j <= DEPTH; j++) { setLayerOrder(j, boostNew[j]); boostA[j] = 0; }
  await animate(500, t => { draw(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = kind === 'W' ? `rgba(255,210,100,${(1 - t) * .5})` : `rgba(170,110,255,${(1 - t) * .5})`; ctx.beginPath(); ctx.arc(c, c, R * .55, 0, TAU); ctx.fill(); ctx.restore(); });
  ting();
}
// the God slice bursts into a storm of Cleopatras or ankhs and the bar overfills
async function godBurst(kind) {
  const img = mk(96, 96); paintTile(img, kind);
  const ox = c, oy = c - R * .74;
  setVerdict({ eyebrow: 'Going deeper', title: 'The God slice', body: '', flash: true });
  Music.sting(4); buzz([60, 40, 60, 40, 200]); whoosh(true);
  await animate(500, t => { draw(); ctx.fillStyle = `rgba(255,250,225,${Math.sin(t * Math.PI) * .8})`; ctx.fillRect(0, 0, N, N); });
  godParts = [];
  for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, sp = N * (.3 + Math.random() * 1.1); godParts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - N * .3, r: Math.random() * TAU, vr: (Math.random() - .5) * 10, s: N * (.04 + Math.random() * .05), life: 2 + Math.random(), img }); }
  const bar = $('#wilds');
  let last = performance.now(), filled = 0;
  await animate(2600, t => {
    const now = performance.now(), dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    godParts.forEach(p => { p.vy += N * .9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt * .8; });
    const want = Math.min(3, Math.floor(t * 4));
    if (want > filled) { filled = want; setTiles(kind === 'W' ? filled : 0, kind === 'B' ? filled : 0); tick(1.4, 1800 + filled * 300); }
    if (t > .75 && !bar.classList.contains('over')) { bar.classList.add('over', kind === 'B' ? 'overB' : 'overW'); ting(); }
    draw();
  });
  godParts = []; draw();
}
async function crossTo(setup, dur = 800) {
  if (!snap || snap.width !== N) snap = mk();
  const g = snap.getContext('2d'); g.clearRect(0, 0, N, N); g.drawImage(cv, 0, 0);
  snapA = 1; setup(); draw();
  await animate(dur, t => { snapA = 1 - easeInOut(t); draw(); });
  snapA = 0; draw();
}
async function fadeTo(v, dur) { const f0 = fade; await animate(dur, t => { fade = lerp(f0, v, t); draw(); }); fade = v; draw(); }

function popSound() {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(70, t + .12);
  g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
  o.connect(g); g.connect(effectsOutput()); o.start(t); o.stop(t + .22); tick(1.6, 1200);
}
// pop-up dome: press, the dice fly up, tumble, bounce off the glass and each other, and settle
async function rollDice() {
  liveK = DEPTH;
  try { return await rollDiceRun(); } finally { liveK = -1; }
}
async function rollDiceRun() {
  const WALL = .5 - .075, DR = .07, G = 4.6;
  const pop = async (power) => {
    await animate(160, t => { domeBulge = -t; draw(); });
    popSound(); buzz(25);
    dice.forEach(d => {
      const a = Math.random() * TAU, sp = (.5 + Math.random() * .9) * power;
      d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp; d.vz = (1.2 + Math.random() * .9) * power; d.z = d.z || 0;
      d.va = 0; d.w = [(Math.random() - .5) * 34, (Math.random() - .5) * 34, (Math.random() - .5) * 14]; if (!d.M) d.M = randRot();
    });
    let last = performance.now(), calm = 0, el = 0;
    await new Promise(res => {
      function f(now) {
        const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now; el += dt;
        domeBulge = Math.max(0, 1 - el * 4) * Math.sin(el * 40);
        for (let k = 0; k < 4; k++) {
          const h = dt / 4;
          dice.forEach(d => {
            d.vz -= G * h; d.z += d.vz * h; d.x += d.vx * h; d.y += d.vy * h; d.M = spinRot(d.M, d.w, h);
            if (d.z <= 0) {
              d.z = 0;
              if (d.vz < -.3) { d.vz = -d.vz * .5; d.w = d.w.map(x => x * .75 + (Math.random() - .5) * 10); tick(.9, 1500 + Math.random() * 500); }
              else d.vz = 0;
              d.vx *= .93; d.vy *= .93; d.w = d.w.map(x => x * .975);
            }
            const dd = Math.hypot(d.x, d.y);
            if (dd > WALL) {
              const nx = d.x / dd, ny = d.y / dd, vn = d.vx * nx + d.vy * ny;
              d.x = nx * WALL; d.y = ny * WALL;
              if (vn > 0) { d.vx -= 1.6 * vn * nx; d.vy -= 1.6 * vn * ny; d.w = d.w.map(x => x + (Math.random() - .5) * 8); if (vn > .3) tick(.6, 2600); }
            }
          });
          for (let i = 0; i < dice.length; i++) for (let j = i + 1; j < dice.length; j++) {
            const a = dice[i], b = dice[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            if (Math.abs(a.z - b.z) > .12 || d2 >= 4 * DR * DR || d2 < 1e-8) continue;
            const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd, ov = (2 * DR - dd) / 2;
            a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
            const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn < 0) { const jn = -.85 * vn; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; a.w[2] += 4; b.w[2] -= 4; if (vn < -.4) tick(.5, 3200); }
          }
        }
        const still = dice.every(d => d.z === 0 && d.vz === 0 && Math.hypot(d.vx, d.vy) < .03 && Math.hypot(...d.w) < 1.5);
        calm = still ? calm + 1 : 0;
        draw();
        if (calm > 12 || el > 9) res(); else requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    });
    const from = dice.map(d => d.M), to = dice.map(d => snapRot(d.M));
    await animate(260, t => { dice.forEach((d, i) => d.M = lerpRot(from[i], to[i], easeOut(t))); draw(); });
    dice.forEach((d, i) => { d.M = to[i]; d.v = topValue(d.M); d.vx = d.vy = d.vz = 0; d.z = 0; d.w = [0, 0, 0]; });
    domeBulge = 0;
  };
  await pop(1.3);
  draw(); tick(1.4, 1600);
  return dice.reduce((a, d) => a + (d.sp && d.v === 6 ? 0 : d.v), 0);
}

// each die bursts into as many balls as it shows
let wellBalls = [];
async function burstDice() {
  liveK = DEPTH;
  try { return await burstDiceRun(); } finally { liveK = -1; }
}
async function burstDiceRun() {
  const WALL = .5 - .03, BR = .028;
  let running = true, last = performance.now();
  const loop = now => {
    const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    wellBalls.forEach(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .985; b.vy *= .985;
      // gentle swirl, like they're circling the drain
      const dd = Math.hypot(b.x, b.y) || 1e-3; b.vx += -b.y / dd * .5 * dt; b.vy += b.x / dd * .5 * dt;
      if (dd > WALL) { const nx = b.x / dd, ny = b.y / dd, vn = b.vx * nx + b.vy * ny; b.x = nx * WALL; b.y = ny * WALL; if (vn > 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; } }
    });
    for (let i = 0; i < wellBalls.length; i++) for (let j = i + 1; j < wellBalls.length; j++) {
      const a = wellBalls[i], b = wellBalls[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * BR * BR || d2 < 1e-9) continue;
      const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd, ov = (2 * BR - dd) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { const jn = -.9 * vn; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; }
    }
    dice.forEach(d => { if (d.label > 0) d.label = Math.max(0, d.label - dt * 1.4); });
    draw();
    if (running) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const order = dice.map((_, i) => i);
  for (const i of order) {
    const d = dice[i];
    await animate(140, t => { d.swell = t; });
    d.gone = true; d.swell = 0; d.label = 1; popSound(); buzz(18);
    if (d.sp && d.v === 6) { // a special face that opened nothing rides on as one gold or purple ball
      if (d.toBall) { const a = Math.random() * TAU; wellBalls.push({ x: d.x, y: d.y, vx: Math.cos(a) * .8, vy: Math.sin(a) * .8, kind: d.sp }); ting(); }
      await wait(260); continue;
    }
    for (let k = 0; k < d.v; k++) {
      const a = Math.random() * TAU, sp = .6 + Math.random() * 1.2;
      wellBalls.push({ x: d.x + Math.cos(a) * .02, y: d.y + Math.sin(a) * .02, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
    await wait(260);
  }
  await wait(1300);
  running = false;
}
