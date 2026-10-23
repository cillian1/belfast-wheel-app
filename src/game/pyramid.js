// ---------- the Pyramid: all six tiles lit ----------
// Owns Pyramid and Monster room scenes and outcomes.
// the six tiles spiral into an eye of Horus, a pyramid rises out of the desert, a walk through the tomb, three doors,
// and behind the Wild door the tip opens, coins pour, Cleopatra rises with the prizes and Ghost Phelan snatches one
const PYR_PRIZES = [150, 300, 500, 1000, 2500];
let pyr = null, doorPick = null;
let desertCache = null;
function pyrBase() { return N * .66; }
function drawPyramidShape(g, rise, tipOff) {
  const base = pyrBase(), H = N * .42, w = N * .33, dy = (1 - rise) * H * 1.05, ax = c, ay = base - H + dy;
  g.save();
  g.beginPath(); g.rect(0, 0, N, base + 1); g.clip();
  const cut = .17; // the capstone lifts off in the finale
  const tx = ax, ty = ay + H * cut, tw = w * cut;
  // left face lit by the sun, right face in shade
  g.beginPath(); g.moveTo(tx - tw, ty); g.lineTo(ax - w, base + dy); g.lineTo(ax, base + dy); g.lineTo(ax, ty); g.closePath(); g.fillStyle = grad(g, ax - w, 0, ax, 0, [[0, '#e8b46a'], [1, '#c48b47']]); g.fill();
  g.beginPath(); g.moveTo(ax, ty); g.lineTo(ax, base + dy); g.lineTo(ax + w, base + dy); g.lineTo(tx + tw, ty); g.closePath(); g.fillStyle = grad(g, ax, 0, ax + w, 0, [[0, '#8f5f2e'], [1, '#6e4520']]); g.fill();
  g.beginPath(); g.moveTo(ax - w, base + dy); g.lineTo(ax, ay); g.lineTo(ax + w, base + dy);
  g.strokeStyle = 'rgba(255,232,190,.48)'; g.lineWidth = 2 * D; g.stroke();
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, base + dy);
  g.strokeStyle = 'rgba(55,30,12,.55)'; g.lineWidth = 2 * D; g.stroke();
  g.strokeStyle = 'rgba(70,40,15,.35)'; g.lineWidth = D;
  for (let j = 1; j < 14; j++) { const f = cut + (1 - cut) * j / 14, y = ay + H * f, hw = w * f; g.beginPath(); g.moveTo(ax - hw, y); g.lineTo(ax + hw, y); g.stroke(); }
  // the door
  if (rise > .9) { g.globalAlpha = Math.min(1, (rise - .9) * 10); g.fillStyle = '#1a0f07'; g.beginPath(); g.moveTo(ax - N * .035, base + dy); g.lineTo(ax - N * .035, base + dy - N * .06); g.lineTo(ax, base + dy - N * .085); g.lineTo(ax + N * .035, base + dy - N * .06); g.lineTo(ax + N * .035, base + dy); g.fill(); g.globalAlpha = 1; }
  // capstone, gold
  const lx = tipOff * N * .18, ly = -tipOff * N * .14;
  g.save(); g.translate(lx, ly); g.translate(ax, ty); g.rotate(tipOff * .5); g.translate(-ax, -ty);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx - tw, ty); g.lineTo(tx + tw, ty); g.closePath(); g.fillStyle = grad(g, tx - tw, 0, tx + tw, 0, [[0, '#fff1b8'], [.5, '#f3c34e'], [1, '#a8771e']]); g.fill();
  g.restore();
  g.restore();
  return { ax, ty, tw };
}
function drawDesert(g) {
  if (!desertCache || desertCache.width !== N) {
    desertCache = mk();
    const bg = desertCache.getContext('2d'), base = pyrBase();
    bg.fillStyle = grad(bg, 0, 0, 0, base, [[0, '#2a1640'], [.45, '#8e3a3a'], [.8, '#e0743a'], [1, '#f6b45a']]); bg.fillRect(0, 0, N, base + 2);
    const sg = bg.createRadialGradient(N * .74, base - N * .06, 0, N * .74, base - N * .06, N * .2); sg.addColorStop(0, 'rgba(255,230,150,1)'); sg.addColorStop(.35, 'rgba(255,190,90,.8)'); sg.addColorStop(1, 'rgba(255,150,60,0)');
    bg.fillStyle = sg; bg.fillRect(0, 0, N, base);
  }
  g.drawImage(desertCache, 0, 0);
  return pyrBase();
}
function drawDunes(g) {
  const base = pyrBase();
  g.fillStyle = '#c98d4a'; g.beginPath(); g.moveTo(0, base); g.quadraticCurveTo(N * .25, base - N * .03, N * .5, base + N * .01); g.quadraticCurveTo(N * .78, base - N * .035, N, base); g.lineTo(N, N); g.lineTo(0, N); g.fill();
  g.fillStyle = '#b07636'; g.beginPath(); g.moveTo(0, base + N * .12); g.quadraticCurveTo(N * .35, base + N * .05, N * .62, base + N * .14); g.quadraticCurveTo(N * .85, base + N * .2, N, base + N * .13); g.lineTo(N, N); g.lineTo(0, N); g.fill();
}
function glyph(g, kind, x, y, s) { // hieroglyphs of the lads, scratched in brown
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#4a2c10'; g.fillStyle = '#4a2c10'; g.lineWidth = .05; g.lineCap = 'round'; g.lineJoin = 'round';
  const man = (mx, my) => { g.beginPath(); g.arc(mx, my - .32, .08, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(mx, my - .24); g.lineTo(mx, my); g.lineTo(mx - .1, my + .25); g.moveTo(mx, my); g.lineTo(mx + .1, my + .25); g.moveTo(mx - .14, my - .14); g.lineTo(mx + .14, my - .14); g.stroke(); };
  if (kind === 0) { man(-.2, 0); g.beginPath(); g.ellipse(.22, .12, .14, .1, 0, 0, TAU); g.moveTo(.33, .03); g.arc(.33, .0, .05, 0, TAU); g.moveTo(.18, .22); g.lineTo(.16, .3); g.moveTo(.26, .22); g.lineTo(.28, .3); g.stroke(); g.beginPath(); g.moveTo(.37, -.03); g.lineTo(.43, 0); g.lineTo(.37, .02); g.fill(); }
  else if (kind === 1) { g.beginPath(); g.rect(-.38, .02, .3, .22); g.moveTo(-.38, .02); g.lineTo(-.4, -.25); g.stroke(); g.beginPath(); g.arc(-.22, -.18, .08, 0, TAU); g.stroke(); g.beginPath(); g.arc(.05, -.05, .1, 0, TAU); g.moveTo(-.2, -.1); g.lineTo(-.02, -.06); g.stroke(); g.beginPath(); g.rect(.2, -.35, .22, .16); g.stroke(); [-.02, .08].forEach(o => { g.beginPath(); g.moveTo(.31 + o, -.27); g.lineTo(.36 + o, -.25); g.stroke(); }); }
  else if (kind === 2) { man(-.25, 0); man(0, 0); man(.25, 0); }
  else if (kind === 3) { g.beginPath(); g.rect(-.35, -.08, .7, .2); g.moveTo(-.22, -.08); g.lineTo(-.15, -.24); g.lineTo(.12, -.24); g.lineTo(.2, -.08); g.stroke(); g.beginPath(); g.arc(-.2, .14, .06, 0, TAU); g.arc(.2, .14, .06, 0, TAU); g.fill(); g.beginPath(); g.rect(-.05, -.32, .1, .07); g.fill(); }
  else if (kind === 4) { g.lineWidth = .06; g.beginPath(); g.moveTo(-.3, 0); g.quadraticCurveTo(0, -.22, .3, 0); g.quadraticCurveTo(0, .18, -.3, 0); g.stroke(); g.beginPath(); g.arc(0, -.02, .07, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-.05, .1); g.lineTo(-.08, .3); g.quadraticCurveTo(-.15, .36, -.2, .3); g.stroke(); }
  else { man(0, 0); g.beginPath(); for (let j = 0; j < 3; j++) { g.moveTo(.18 + j * .07, -.3); g.bezierCurveTo(.25 + j * .07, -.4, .12 + j * .07, -.5, .2 + j * .07, -.6); } g.stroke(); }
  g.restore();
}
function drawTomb(g, now) {
  const scroll = pyr.scroll, wallTop = N * .12, wallBot = N * .74, pw = N * .42;
  g.fillStyle = '#140b05'; g.fillRect(0, 0, N, N);
  g.fillStyle = grad(g, 0, wallTop, 0, wallBot, [[0, '#6b4524'], [.5, '#a8743f'], [1, '#5a3a1c']]); g.fillRect(0, wallTop, N, wallBot - wallTop);
  g.fillStyle = '#2b1a0b'; g.fillRect(0, wallBot, N, N - wallBot);
  for (let j = 0; j < 9; j++) { // panels slide past as the camera walks in
    const x = j * pw - scroll; if (x < -pw || x > N) continue;
    g.fillStyle = 'rgba(230,190,130,.55)'; g.fillRect(x + N * .04, wallTop + N * .1, pw - N * .08, N * .36);
    g.strokeStyle = 'rgba(60,35,12,.6)'; g.lineWidth = 2 * D; g.strokeRect(x + N * .04, wallTop + N * .1, pw - N * .08, N * .36);
    glyph(g, j % 6, x + pw / 2, wallTop + N * .28, N * .3);
    // a torch between panels
    const tx = x, ty = wallTop + N * .16, fl = .8 + .2 * Math.sin(now / 70 + j * 3) + .1 * Math.sin(now / 33 + j);
    const tg = g.createRadialGradient(tx, ty, 0, tx, ty, N * .22 * fl); tg.addColorStop(0, 'rgba(255,190,90,.55)'); tg.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = tg; g.fillRect(tx - N * .25, ty - N * .25, N * .5, N * .5);
    g.fillStyle = '#3a220e'; g.fillRect(tx - N * .008, ty, N * .016, N * .07);
    g.fillStyle = `rgba(255,${170 + 50 * fl | 0},70,1)`; g.beginPath(); g.ellipse(tx, ty - N * .01, N * .013 * fl, N * .03 * fl, 0, 0, TAU); g.fill();
  }
  const v = g.createRadialGradient(c, c, N * .2, c, c, N * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = v; g.fillRect(0, 0, N, N);
}
function doorRect(j) { const w = N * .24, gap = N * .07, x0 = c - w * 1.5 - gap; return { x: x0 + j * (w + gap), y: N * .3, w, h: N * .44 }; }
function drawDoors(g, now) {
  g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#3a2412'], [.75, '#7a5228'], [1, '#2b1a0b']]); g.fillRect(0, 0, N, N);
  g.strokeStyle = 'rgba(40,22,8,.35)'; g.lineWidth = D; for (let y = N * .08; y < N; y += N * .07) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
  pyr.doors.forEach((d, j) => {
    const r = doorRect(j), open = d.open;
    // what is behind it
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    const bg = g.createRadialGradient(r.x + r.w / 2, r.y + r.h * .55, 0, r.x + r.w / 2, r.y + r.h * .55, r.w);
    bg.addColorStop(0, d.wild ? '#fff2b0' : '#f0d79a'); bg.addColorStop(1, d.wild ? '#a8771e' : '#4a3015'); g.fillStyle = bg; g.fillRect(r.x, r.y, r.w, r.h);
    if (d.wild) cleopatra(g, r.x + r.w / 2, r.y + r.h * .55, -Math.PI / 2, r.w * .75);
    else { g.font = `700 ${r.w * .3}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2208'; g.fillText('€' + $m(d.amt), r.x + r.w / 2, r.y + r.h * .55); }
    // the stone slab slides up
    const sy = r.y - open * r.h;
    g.fillStyle = grad(g, r.x, 0, r.x + r.w, 0, [[0, '#8a6334'], [.5, '#c79a5c'], [1, '#7a542a']]); g.fillRect(r.x, sy, r.w, r.h);
    g.strokeStyle = 'rgba(50,28,10,.6)'; g.lineWidth = 2 * D; g.strokeRect(r.x + r.w * .1, sy + r.h * .08, r.w * .8, r.h * .84);
    eyeOfHorus(g, r.x + r.w / 2, sy + r.h * .4, -Math.PI / 2, r.w * .55);
    g.font = `${r.w * .16}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(50,28,10,.85)'; g.fillText('?', r.x + r.w / 2, sy + r.h * .72);
    g.restore();
    // lintel and posts
    g.fillStyle = '#5a3a1c'; g.fillRect(r.x - N * .02, r.y - N * .04, r.w + N * .04, N * .04); g.fillRect(r.x - N * .02, r.y, N * .02, r.h); g.fillRect(r.x + r.w, r.y, N * .02, r.h);
    if (pyr.pickable) { const pulse = .3 + .3 * Math.sin(now / 250 + j); g.strokeStyle = `rgba(255,215,120,${pulse})`; g.lineWidth = 3 * D; g.strokeRect(r.x - N * .02, r.y - N * .04, r.w + N * .04, r.h + N * .04); }
  });
}
function drawPyramid(now) {
  const g = ctx;
  g.save(); rrect(g, D, D, N - 2 * D, N - 2 * D, N * .05); g.clip();
  if (pyr.ph === 'tomb') drawTomb(g, now);
  else if (pyr.ph === 'doors') drawDoors(g, now);
  else {
    drawDesert(g, now);
    if (pyr.beam > 0) { // light out of the open tip
      const bw = N * .05 * pyr.beam; g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = grad(g, c - bw * 2, 0, c + bw * 2, 0, [[0, 'rgba(255,240,180,0)'], [.5, `rgba(255,245,200,${.9 * pyr.beam})`], [1, 'rgba(255,240,180,0)']]);
      g.fillRect(c - bw * 2, 0, bw * 4, pyrBase() - N * .42 + N * .08); g.restore();
    }
    drawPyramidShape(g, pyr.rise, pyr.tipOff);
    drawDunes(g);
    if (pyr.pile > 0) { g.fillStyle = grad(g, 0, N * .8, 0, N, [[0, '#ffe08a'], [1, '#b8861e']]); g.beginPath(); g.ellipse(c, N * .98, N * .38 * pyr.pile, N * .16 * pyr.pile, 0, Math.PI, 0); g.fill(); }
    pyr.coins.forEach(k => { g.save(); g.translate(k.x, k.y); g.scale(Math.abs(Math.cos(k.r)) + .15, 1); g.fillStyle = '#f3c34e'; g.beginPath(); g.arc(0, 0, N * .014, 0, TAU); g.fill(); g.strokeStyle = '#a8771e'; g.lineWidth = D; g.stroke(); g.restore(); });
    if (pyr.cleo > 0) { // Cleopatra rises from the coins with the prizes held up around her
      const cy = N * .9 - pyr.cleo * N * .3;
      cleopatra(g, c, cy, -Math.PI / 2, N * .22);
      pyr.plaques.forEach((p, j) => {
        if (p.gone) return;
        g.save(); g.globalAlpha = pyr.cleo; g.translate(p.x, p.y);
        g.shadowColor = 'rgba(255,215,120,.9)'; g.shadowBlur = N * .03; rrect(g, -N * .075, -N * .03, N * .15, N * .06, N * .015); g.fillStyle = p.v === 2500 ? '#2a1640' : '#3a2208'; g.fill(); g.shadowBlur = 0;
        g.strokeStyle = '#f3c34e'; g.lineWidth = 1.5 * D; g.stroke();
        g.font = `700 ${N * (p.v === 2500 ? .026 : .032)}px ${LABEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8'; g.fillText(p.v === 2500 ? ("" + '€' + $m(2500) + " PHELAN'S TOMB") : '€' + $m(p.v), 0, 0);
        g.restore();
      });
    }
    pyr.sand.forEach(p => { g.strokeStyle = `rgba(240,200,140,${p.a})`; g.lineWidth = D * 1.2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.l, p.y + p.l * .1); g.stroke(); });
  }
  if (ghost) {
    drawGhost();
    if (pyr.wave) { const s = R * .26, a = Math.sin(now / 120) * .6; g.save(); g.globalAlpha = ghost.a * .85; g.translate(ghost.x + s * .45, ghost.y - s * .05); g.rotate(-.8 + a); g.strokeStyle = 'rgba(235,250,245,.95)'; g.lineWidth = s * .12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * .35, 0); g.stroke(); g.restore(); }
    if (pyr.held) { g.save(); g.translate(ghost.x, ghost.y + R * .36); g.scale(pyr.heldS, pyr.heldS); rrect(g, -N * .075, -N * .03, N * .15, N * .06, N * .015); g.fillStyle = pyr.held === 2500 ? '#2a1640' : '#3a2208'; g.fill(); g.strokeStyle = '#f3c34e'; g.lineWidth = 1.5 * D; g.stroke(); g.font = `700 ${N * (pyr.held === 2500 ? .026 : .032)}px ${LABEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8'; g.fillText(pyr.held === 2500 ? ("" + '€' + $m(2500) + " PHELAN'S TOMB") : '€' + $m(pyr.held), 0, 0); g.restore(); }
  }
  if (pyr.eye > 0) { g.save(); g.globalAlpha = Math.min(1, pyr.eye); eyeOfHorus(g, c, c, -Math.PI / 2, N * .45 * pyr.eye); g.restore(); }
  if (pyr.white > 0) { g.fillStyle = `rgba(255,252,240,${pyr.white})`; g.fillRect(0, 0, N, N); }
  g.restore();
}
function sandStep(dt, rate) {
  if (cosmeticRandom() < rate) pyr.sand.push({ x: -N * .1, y: N * (.2 + cosmeticRandom() * .75), v: N * (1.2 + cosmeticRandom()), l: N * (.04 + cosmeticRandom() * .08), a: .3 + cosmeticRandom() * .4 });
  pyr.sand.forEach(p => p.x += p.v * dt); pyr.sand = pyr.sand.filter(p => p.x < N * 1.2);
}
async function pyramidRun(steps) {
  roomHit = true; buzz([100, 50, 100, 50, 100, 50, 400]);
  setTiles(3, 3); const bar = $('#wilds'); bar.classList.add('over', 'overW', 'overB');
  $('#caption').textContent = 'All six';
  await wait(1600);
  // 1. the merge: the six tiles leave the bar and spiral into the middle of the wheel
  const cr = cv.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  const fl = wildTiles.map(t => {
    const r = t.getBoundingClientRect(), k = document.createElement('canvas'); k.width = k.height = 96; k.getContext('2d').drawImage(t, 0, 0);
    k.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;height:${r.height}px;border-radius:9px;z-index:20;pointer-events:none;box-shadow:0 0 24px rgba(255,220,130,.9)`;
    document.body.appendChild(k); t.classList.remove('lit'); t.classList.add('gone');
    return { k, x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width };
  });
  bar.classList.remove('over', 'overW', 'overB'); whoosh(true);
  pyr = { ph: 'merge', rise: 0, tipOff: 0, beam: 0, pile: 0, cleo: 0, eye: 0, white: 0, coins: [], sand: [], plaques: [], doors: [], scroll: 0 };
  await animate(2200, t => {
    const e = easeInOut(t);
    fl.forEach((f, j) => {
      const dx = f.x - cx, dy = f.y - cy, a = e * TAU * 1.5 + j * .3, m = 1 - e, ca = Math.cos(a), sa = Math.sin(a);
      const x = cx + (dx * ca - dy * sa) * m, y = cy + (dx * sa + dy * ca) * m;
      f.k.style.transform = `translate(${x - f.s / 2}px,${y - f.s / 2}px) rotate(${e * 720}deg) scale(${1 - e * .5})`;
      f.k.style.opacity = String(1 - Math.max(0, (t - .85) / .15));
    });
    if (t > .7) tick(.4, 1500 + t * 1500);
  });
  fl.forEach(f => f.k.remove());
  ting(); Music.sting(4);
  // the eye of Horus grows out of where they met, then everything goes white
  await animate(1500, t => { draw(); ctx.save(); ctx.globalAlpha = Math.min(1, t * 2); eyeOfHorus(ctx, c, c, -Math.PI / 2, N * .5 * easeOut(t)); ctx.restore(); ctx.fillStyle = `rgba(255,252,240,${Math.max(0, (t - .6) / .4)})`; ctx.fillRect(0, 0, N, N); });
  buzz([200]);
  // 2. the desert
  scene = 'pyramid'; pyr.ph = 'desert'; pyr.white = 1; Music.setMode('pyramid'); Music.setLevel(3); playSfx('pyramid');
  $('#caption').textContent = 'Somewhere south of Belfast';
  let last = performance.now();
  await animate(5200, t => {
    const now = performance.now(), dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    pyr.white = Math.max(0, 1 - t * 4); pyr.rise = easeInOut(Math.max(0, Math.min(1, (t - .15) / .55)));
    sandStep(dt, .9);
    if (t > .7 && !ghost) { ghost = { x: c + N * .1, y: pyrBase() - N * .07, a: 0, side: 1 }; pyr.wave = true; }
    if (ghost) ghost.a = Math.min(1, (t - .7) / .15);
    if (cosmeticRandom() < .08) tick(.25, 400 + cosmeticRandom() * 300);
    draw();
  });
  // 3. into the tomb
  await crossTo(() => { pyr.ph = 'tomb'; ghost = null; pyr.wave = false; pyr.scroll = 0; }, 900);
  $('#caption').textContent = '';
  await animate(6500, t => { pyr.scroll = easeInOut(t) * N * 2.6; if (cosmeticRandom() < .05) tick(.3, 300); draw(); });
  // 4. three doors: tap one
  const wildDoor = Math.floor(Math.random() * 3);
  pyr.doors = [0, 1, 2].map(j => ({ open: 0, wild: j === wildDoor, amt: 60 + 10 * Math.floor(Math.random() * 15) }));
  await crossTo(() => { pyr.ph = 'doors'; pyr.pickable = true; }, 900);
  $('#caption').textContent = 'Pick a door';
  setBtn('Pick a door', true);
  const stage = $('.stage'); stage.classList.add('pick');
  const stopPulse = visibleDrawLoop(draw);
  const chosen = await new Promise(res => { doorPick = res; });
  doorPick = null; stage.classList.remove('pick'); pyr.pickable = false; stopPulse();
  const d = pyr.doors[chosen];
  Music.sting(3); buzz([40, 40, 40]);
  await animate(1400, t => { d.open = easeInOut(t); if (t < .8 && cosmeticRandom() < .3) tick(.4, 200 + cosmeticRandom() * 100); draw(); });
  await wait(600);
  // the other two open as well, so you see what you walked past
  await animate(1000, t => { pyr.doors.forEach(o => { if (o !== d) o.open = easeInOut(t) * .85; }); draw(); });
  if (!d.wild) {
    ting(); buzz([60, 40, 60]);
    $('#caption').textContent = '';
    setVerdict({ eyebrow: 'Final answer · €' + $m(d.amt), title: 'The pyramid pays €' + $m(d.amt), body: '', steps: steps.slice(), q: quote() });
    speak(['Final answer', ...spokenMoves(steps), `The pyramid pays ${$m(d.amt)} euro`, roomAct('pyramid')]);
    return;
  }
  // 5. the finale
  Music.sting(4); buzz([100, 60, 100, 60, 300]);
  $('#caption').textContent = '';
  await crossTo(() => { pyr.ph = 'finale'; pyr.rise = 1; pyr.sand = []; }, 900);
  last = performance.now();
  await animate(2000, t => { pyr.tipOff = easeInOut(t); pyr.beam = Math.max(0, (t - .4) / .6); draw(); });
  whoosh(true); ting();
  pyr.plaques = PYR_PRIZES.map((v, j) => { const a = Math.PI + (j + .5) * Math.PI / PYR_PRIZES.length; return { v, x: c + Math.cos(a) * N * .3, y: N * .55 + Math.sin(a) * N * .3 }; });
  last = performance.now();
  await animate(5500, t => {
    const now = performance.now(), dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    if (t < .8) for (let j = 0; j < 3; j++) pyr.coins.push({ x: c + (cosmeticRandom() - .5) * N * .5, y: -N * .05, v: N * (.5 + cosmeticRandom() * .5), r: cosmeticRandom() * TAU });
    pyr.coins.forEach(k => { k.v += N * 1.6 * dt; k.y += k.v * dt; k.r += dt * 12; });
    const n0 = pyr.coins.length; pyr.coins = pyr.coins.filter(k => k.y < N * .95 - pyr.pile * N * .12); if (pyr.coins.length < n0 && cosmeticRandom() < .4) tick(.3, 2400 + cosmeticRandom() * 900);
    pyr.pile = Math.min(1, t * 1.4);
    pyr.cleo = easeOut(Math.max(0, (t - .45) / .55));
    draw();
  });
  pyr.coins = [];
  await wait(900);
  // Ghost Phelan swoops in and helps himself to one of them
  const pickI = Math.floor(Math.random() * PYR_PRIZES.length), p = pyr.plaques[pickI];
  ghost = { x: -N * .2, y: N * .2, a: 1, side: 1 }; Music.sting(2); buzz([20, 80, 20, 80, 20]);
  phelanSay(p.v === 2500 ? "Phelan's Tomb. That's mine now." : phelanLine('cameo'));
  setVerdict({ eyebrow: 'Something cold', title: 'Ghost Phelan', body: '', flash: true });
  const g0 = { x: ghost.x, y: ghost.y };
  await animate(1500, t => { const e = easeInOut(t); ghost.x = lerp(g0.x, p.x, e); ghost.y = lerp(g0.y, p.y - R * .2, e) - Math.sin(t * Math.PI) * N * .1; draw(); });
  p.gone = true; pyr.held = p.v; pyr.heldS = 1; ting(); buzz(60);
  await animate(1600, t => { const e = easeInOut(t); ghost.x = lerp(p.x, c, e); ghost.y = lerp(p.y - R * .2, N * .3, e); pyr.heldS = 1 + e * 1.4; draw(); });
  ting(); Music.sting(4); buzz([80, 50, 80, 50, 250]);
  const prize = p.v, label = prize === 2500 ? ("" + '€' + $m(2500) + ", Phelan's Tomb") : '€' + $m(prize);
  setVerdict({ eyebrow: 'Final answer · €' + $m(prize), title: label, body: '', steps: steps.slice(), q: quote() });
  await wait(1200);
  speak(['Final answer', ...spokenMoves(steps), prize === 2500 ? ("Phelan's Tomb. The pyramid pays " + $m(2500) + ' euro' + "") : `The pyramid pays ${$m(prize)} euro`, roomAct('pyramid')]);
}
async function monsterRun(steps, w = 0, b = 3) {
  roomHit = true; Music.setMode('monster'); playSfx('monster'); buzz([80, 60, 80, 60, 250]);
  setVerdict({ eyebrow: 'Bonus', title: 'Three ankhs', body: 'Get in. Hold on.', steps: steps.slice() });
  $('#caption').textContent = '';
  Music.setLevel(3); Music.sting(3);
  if (!faces.cosmic) faces.cosmic = buildCosmic();
  if (!faces.can || faces.can.height !== Math.round(N * .066)) faces.can = buildCan();
  await wait(1200);
  // 1. the rollercoaster climbs off into space
  coaster = { x: 0, kind: 1, planet: 0 };
  await crossTo(() => { scene = 'coaster'; }, 900);
  let lastSup = 0;
  await animate(8000, t => {
    coaster.x = N * 7 * (t * .4 + easeInOut(t) * .6);
    coaster.planet = Math.max(0, (t - .45) / .55);
    const sup = Math.floor(coaster.x / (N * .08)); if (sup !== lastSup) { lastSup = sup; tick(.35, 600 + t * 500); }
    draw();
  });
  // 2. land on the planet; it turns into a wheel
  planet = { grow: 0, morph: 0, melt: 0, embers: [], tmp: mk(N >> 1, N >> 1), src: null };
  scene = 'planet'; whoosh(true);
  await animate(1600, t => { planet.grow = easeInOut(t); draw(); });
  await animate(1200, t => { planet.morph = easeInOut(t); rotC += .02; draw(); });
  ting(); Music.sting(4); Music.setLevel(4);
  setVerdict({ eyebrow: 'Bonus', title: 'The planet wheel', body: 'Big money. Spin it.', steps: steps.slice(), flash: false });
  const n = COSMIC.length, tg = target(n), s0 = rotC, e0 = rotC + 7 * TAU + mod(-tg.a - rotC, TAU);
  let last = sliceAt(s0, n);
  planet.spinning = true;
  await animate(7500, t => { rotC = s0 + (e0 - s0) * easeOut(t); const sl = sliceAt(rotC, n); if (sl !== last) { last = sl; tick(1.1, 1600); flap(1); } draw(); });
  rotC = mod(rotC, TAU); planet.spinning = false; planet.winner = tg.i; planet.winAt = performance.now(); ting(); buzz([60, 40, 120]);
  const won = COSMIC[tg.i];
  setVerdict({ eyebrow: 'Bonus', title: fakeEur(won), body: 'Yours. Nearly.', steps: steps.slice() });
  await wait(1800);
  // 3. it melts into lava and burns
  planet.src = mk(); { const g = planet.src.getContext('2d'); g.translate(c, c); g.rotate(rotC); g.drawImage(faces.cosmic, -c, -c); }
  whoosh(false); buzz([80, 60, 200]);
  setVerdict({ eyebrow: 'Bonus', title: fakeEur(won), body: 'Wait. Something is wrong with it.', steps: steps.slice(), flash: false });
  await animate(4200, t => {
    planet.melt = easeIn(t);
    if (cosmeticRandom() < .6) planet.embers.push({ x: cosmeticRandom() * N, y: N * (1 - .3 * planet.melt), vx: (cosmeticRandom() - .5) * N * .1, vy: -N * (.2 + cosmeticRandom() * .4), r: N * (.003 + cosmeticRandom() * .006), life: 1, col: cosmeticRandom() < .5 ? '#ffb347' : '#ff5a1f' });
    planet.embers.forEach(e => { e.x += e.vx / 60; e.y += e.vy / 60; e.life -= 1 / 70; }); planet.embers = planet.embers.filter(e => e.life > 0);
    if (cosmeticRandom() < .15) tick(.6, 200 + cosmeticRandom() * 200);
    draw();
  });
  // Ghost Phelan pops up laughing, so you know you've been had
  ghost = { x: N * 1.2, y: N * .42, a: .95, side: 1 }; Music.sting(2); buzz([30, 60, 30, 60, 30]);
  await animate(900, t => { ghost.x = lerp(N * 1.2, N * .62, easeOut(t)); draw(); });
  ghostSay = 'Hahah not so easy!';
  phelanSay(ghostSay);
  await animate(2600, t => { ghost.y = N * .42 + Math.abs(Math.sin(t * 22)) * -N * .02; ghost.x = N * .62 + Math.sin(t * 14) * N * .008; draw(); });
  ghostSay = '';
  await animate(800, t => { ghost.x = lerp(N * .62, N * 1.2, easeInOut(t)); ghost.a = .95 * (1 - t); draw(); });
  ghost = null;
  setVerdict({ eyebrow: 'Bonus', title: 'FAKE', body: 'That money was never real. Back in the cart.', steps: steps.slice(), flash: false });
  // 4. back on the rollercoaster, down into the green
  coaster = { x: 0, kind: 2, planet: 0 };
  await crossTo(() => { scene = 'coaster'; }, 1000);
  await animate(5000, t => { coaster.x = N * 7 * easeInOut(t); const sup = Math.floor(coaster.x / (N * .08)); if (sup !== lastSup) { lastSup = sup; tick(.35, 900 - t * 400); } draw(); });
  // 5. ten ordinary d12s and any special d20s
  mon = { dice: [], dots: [], cans: [], fill: 0, poured: 0, pouring: false };
  for (let i = 0; i < 10; i++) mon.dice.push({ x: N * (.12 + (i % 5) * .19), y: N * (.12 + Math.floor(i / 5) * .16), z: 0, vx: 0, vy: 0, vz: 0, M: randRot(), w: [0, 0, 0] });
  // every Wild and every ankh past three adds a colored d20; each face pip becomes a big can
  const spec = [...Array(w).fill('W'), ...Array(Math.max(0, b - 3)).fill('B')];
  spec.forEach((k, j) => mon.dice.push({ x: N * (.14 + (j % 5) * .18), y: N * .38, z: 0, vx: 0, vy: 0, vz: 0, M: randRot(), w: [0, 0, 0], sp: k }));
  if (spec.length) { if (!faces.canW || faces.canW.height !== Math.round(N * .066)) { faces.canW = buildCan('W'); faces.canB = buildCan('B'); } setTiles(0, 0); }
  await crossTo(() => { scene = 'monster'; }, 900);
  setVerdict({ eyebrow: 'Bonus', title: spec.length ? `Ten dice and ${spec.length} special` : 'Ten dice', body: spec.length ? 'Every dot counts. The gold and purple dice pour big cans.' : 'Every dot counts.', steps: steps.slice(), flash: false });
  await wait(600);
  tick(1.4, 900); buzz(25);
  await rollMonsterDice(mon.dice);
  await wait(700);
  // 6. every dot lifts off and turns into a can of Monster
  mon.dice.forEach(d => monsterPips(d.top, d.x, d.y, N * .11, d.M, d.sp).forEach(p => mon.dots.push({ x: p.x, y: p.y, x0: p.x, y: p.y, r: Math.max(D * 1.5, p.r), glow: 0, sp: d.sp })));
  await animate(800, t => { mon.dice.forEach(d => d.a = 1 - t); mon.dots.forEach((p, i) => { p.glow = t; p.y = p.y0 - easeOut(t) * N * (.02 + (i % 4) * .01); }); draw(); });
  mon.dice = [];
  { let at = mon.dots.length * .05 + .8, gap = .42;
    mon.dots.forEach((p, i) => { mon.cans.push({ state: 'wait', x: p.x, y: p.y, s: 0, rot: 0, a: 1, delay: i * .05, flyAt: at, dot: p, sp: p.sp, wt: p.sp ? 2 : 1, tx: N * (.44 + Math.random() * .12), ty: N * .4 }); at += gap; gap = Math.max(.14, gap * .955); }); }
  const total = mon.cans.reduce((a, k) => a + k.wt, 0), bigCans = mon.cans.filter(k => k.sp).length;
  await new Promise(res => {
    let lastT = performance.now(), el = 0;
    function f(now) {
      const dt = Math.max(0, Math.min(.033, (now - lastT) / 1000)); lastT = now; el += dt; let busyCans = false;
      mon.pouring = false;
      mon.cans.forEach(k => {
        const e0 = el - k.delay;
        if (k.state === 'wait') { busyCans = true; if (e0 >= 0) { k.state = 'grow'; k.t = 0; k.dot.gone = true; popSound(); } }
        else if (k.state === 'grow') { busyCans = true; k.t += dt / .3; k.s = easeOut(Math.min(1, k.t)); if (k.t >= 1) { k.state = 'sit'; k.t = 0; } }
        else if (k.state === 'sit') { busyCans = true; k.rot = Math.sin(el * 6 + k.x) * .08; if (el >= k.flyAt) { k.state = 'fly'; k.t = 0; k.sx = k.x; k.sy = k.y; whoosh(false); } }
        else if (k.state === 'fly') { busyCans = true; k.t += dt / .5; const u = easeInOut(Math.min(1, k.t)); k.x = lerp(k.sx, k.tx, u); k.y = lerp(k.sy, k.ty, u) - Math.sin(u * Math.PI) * N * .12; k.rot = u * Math.PI * .8; if (k.t >= 1) { k.state = 'pour'; k.t = 0; tick(.5, 2400); } }
        else if (k.state === 'pour') { busyCans = true; mon.pouring = true; k.t += dt / .4; mon.flow = (mon.flow || 0) + dt / .4; if (k.t >= 1) { k.state = 'fade'; k.t = 0; mon.poured += k.wt; } }
        else if (k.state === 'fade') { busyCans = true; k.t += dt / .3; k.a = 1 - k.t; k.y -= N * .1 * dt; if (k.t >= 1) k.state = 'gone'; }
      });
      // the level climbs with the stream, not in jumps
      const target = mon.poured + mon.cans.filter(k => k.state === 'pour').reduce((a, k) => a + Math.min(1, k.t) * k.wt, 0);
      mon.fill += (target - mon.fill) * Math.min(1, dt * 6);
      draw();
      if (busyCans || Math.abs(mon.poured - mon.fill) > .05) requestAnimationFrame(f); else res();
    }
    requestAnimationFrame(f);
  });
  mon.fill = total; draw();
  const lvl = TANK_LEVELS.reduce((a, l) => total >= l.at ? l : a, TANK_LEVELS[0]);
  ting(); buzz([60, 40, 120]); Music.sting(4);
  setVerdict({ eyebrow: 'Final answer', title: `€${$m(lvl.v)}`, body: `The Monster tank filled to the €${$m(lvl.v)} line${bigCans ? `, with ${bigCans} big can${bigCans > 1 ? 's' : ''} from the special dice` : ''}. That is your bonus. Collect it before the next spin.`, steps: steps.slice(), q: quote() });
  speak(['Final answer', ...spokenMoves(steps), `The Monster tank pays ${$m(lvl.v)} euro`, roomAct('monster')]);
  $('#caption').textContent = 'Tap Spin to go back to the top';
  logMove(`Bonus · Monster tank · €${$m(lvl.v)}`);
}
