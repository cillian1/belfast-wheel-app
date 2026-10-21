// ---------- faces ----------
function buildBase() {
  const k = mk(), g = k.getContext('2d');
  g.save(); g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = R * .09; g.shadowOffsetY = R * .045;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#0c0e11'; g.fill(); g.restore();
  chromeRim(g, R * .93, R);
  weather(g, R * .93, R);
  // the rim reads as a rounded tube: dark at both edges, lit along the crown, a hot highlight where the light hits
  const tube = g.createRadialGradient(c, c, R * .93, c, c, R);
  tube.addColorStop(0, 'rgba(0,0,0,.55)'); tube.addColorStop(.28, 'rgba(0,0,0,0)'); tube.addColorStop(.5, 'rgba(255,255,255,.16)'); tube.addColorStop(.72, 'rgba(0,0,0,0)'); tube.addColorStop(1, 'rgba(0,0,0,.6)');
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.arc(c, c, R * .93, 0, TAU, true); g.fillStyle = tube; g.fill('evenodd');
  g.save(); g.lineCap = 'round'; g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = R * .03;
  g.beginPath(); g.arc(c, c, R * .962, -2.55, -1.75); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = R * .012; g.stroke();
  g.beginPath(); g.arc(c, c, R * .962, .55, .95); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = R * .008; g.stroke();
  g.restore();
  for (let i = 0; i < 24; i++) { const a = i * TAU / 24; stud(g, c + Math.cos(a) * R * .965, c + Math.sin(a) * R * .965, R * .012); }
  return k;
}
// a soft beam of light that sweeps round the wheel while it spins
function buildSweep() {
  const k = mk(), g = k.getContext('2d'), r = R * .93;
  g.save(); g.translate(c, c);
  for (let j = -24; j <= 24; j++) { // a bell-shaped fan of thin wedges
    const a = j * .018, w = Math.exp(-(j * j) / 120);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a - .0095, a + .0095); g.closePath();
    g.fillStyle = `rgba(255,244,214,${.32 * w})`; g.fill();
  }
  g.restore();
  g.globalCompositeOperation = 'destination-in'; // brightest toward the rim, nothing at the hub
  const fadeIn = g.createRadialGradient(c, c, R * .2, c, c, r);
  fadeIn.addColorStop(0, 'rgba(0,0,0,0)'); fadeIn.addColorStop(.55, 'rgba(0,0,0,.6)'); fadeIn.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fadeIn; g.fillRect(0, 0, N, N);
  return k;
}
// Go back up: three chevrons pointing out toward the wheel above
function upChevrons(g, am, a, ph = -1, rs = [R * .66, R * .75, R * .84]) {
  const tx = -Math.sin(am), ty = Math.cos(am), w = R * .045;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  rs.forEach((r, j) => {
    const al = ph < 0 ? a : a * (.25 + .75 * Math.max(0, Math.sin(ph - j * 1.1)));
    const tip = r + R * .03, bx = c + Math.cos(am) * r, by = c + Math.sin(am) * r;
    g.strokeStyle = `rgba(150,255,225,${al})`; g.shadowColor = 'rgba(80,255,200,.9)'; g.shadowBlur = ph < 0 ? 0 : R * .04; g.lineWidth = R * .016;
    g.beginPath(); g.moveTo(bx + tx * w, by + ty * w); g.lineTo(c + Math.cos(am) * tip, c + Math.sin(am) * tip); g.lineTo(bx - tx * w, by - ty * w); g.stroke();
  });
  g.restore();
}
function buildRing(items, pal) {
  const k = mk(), g = k.getContext('2d'), n = items.length, seg = TAU / n, r0 = R * .55, r1 = R * .93;
  // crowded wheels get smaller text and emblems so nothing spills over its slice
  const fsFor = (lines, rm) => Math.min(R * .062, seg * rm * .85 / (1.12 * lines.length)), icon = Math.min(1, seg * R * .675 * 1.5 / (R * .2));
  items.forEach((s, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg;
    wedgePath(g, a0, a1, r0, r1);
    g.fillStyle = wedgeFill(g, a0, a1, r0, r1, s.dead ? GREYED : s.boost === 'W' ? BOOST_W : s.boost === 'B' ? BOOST_B : s.up && !s.wild && !s.bonus ? UP_A : s.god ? GOD_A : s.wild ? GOLD_A : s.bonus ? PURPLE_A : s.show ? TITANIUM : s.deep ? PORTAL : (i % 2 ? pal.dark : pal.light));
    g.fill();
  });
  const sh = g.createRadialGradient(c, c, r0, c, c, r1);
  sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(.35, 'rgba(0,0,0,0)'); sh.addColorStop(.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
  wedgePath(g, 0, TAU - 1e-4, r0, r1); g.fillStyle = sh; g.fill();
  hairlines(g, [.6, .86]);
  ridges(g, n, r0, r1);
  weather(g, r0, r1);
  bevel(g, r0, true);
  items.forEach((s, i) => {
    if (s.deep) { // a little nested-rings mark on the portal slices
      const am = BASE + (i + .5) * seg, x = c + Math.cos(am) * R * .62, y = c + Math.sin(am) * R * .62;
      [.035, .022, .011].forEach((rr, j) => { g.beginPath(); g.arc(x, y, R * rr, 0, TAU); g.strokeStyle = j ? 'rgba(170,190,240,.8)' : 'rgba(230,236,245,.9)'; g.lineWidth = D * 1.1; g.stroke(); });
    }
    if (s.dead) { // the ghost of the Wild or Bonus that was
      const am = BASE + (i + .5) * seg; g.save(); g.globalAlpha = .18;
      if (s.dead === 'bonus') ankh(g, c + Math.cos(am) * R * .675, c + Math.sin(am) * R * .675, am, R * .17 * icon, true);
      else cleopatra(g, c + Math.cos(am) * R * .675, c + Math.sin(am) * R * .675, am, R * .2 * icon);
      g.restore();
      wedgeText(g, am, R * .725, s.lbl, fsFor(s.lbl, R * .725), R * .27, 'dark');
      return;
    }
    if (s.boost) { // More Wilds / More Bonus: copper or orchid, a stack of three small emblems and chevrons pouring inward
      const am = BASE + (i + .5) * seg, tx = -Math.sin(am), ty = Math.cos(am), sz = R * .072 * Math.min(1, icon * 1.3);
      const at = (r, t) => [c + Math.cos(am) * r + tx * t, c + Math.sin(am) * r + ty * t];
      [R * .85, R * .755, R * .66].forEach(r => {
        const [x, y] = at(r, 0);
        if (s.boost === 'W') cleopatra(g, x, y, am, sz * 1.15); else ankh(g, x, y, am, sz);
      });
      g.save(); g.strokeStyle = s.boost === 'W' ? 'rgba(255,226,190,.9)' : 'rgba(255,214,250,.9)'; g.lineWidth = D * 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
      [R * .615, R * .585].forEach(r => {
        const w = R * .022 * icon, [lx, ly] = at(r + R * .016, -w), [mx, my] = at(r, 0), [rx, ry] = at(r + R * .016, w);
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(mx, my); g.lineTo(rx, ry); g.stroke();
      });
      g.restore();
      return;
    }
    if (s.up && (s.wild || s.bonus)) { // half Wild or ankh, half Go back up
      const am = BASE + (i + .5) * seg;
      if (s.wild) cleopatra(g, c + Math.cos(am) * R * .8, c + Math.sin(am) * R * .8, am, R * .15 * icon); else ankh(g, c + Math.cos(am) * R * .8, c + Math.sin(am) * R * .8, am, R * .13 * icon);
      upChevrons(g, am, .55, -1, [R * .6, R * .67]); return;
    }
    if (s.up) { upChevrons(g, BASE + (i + .5) * seg, .55); return; }
    if (s.god) {
      const am = BASE + (i + .5) * seg;
      eyeOfHorus(g, c + Math.cos(am) * R * .68, c + Math.sin(am) * R * .68, am, R * .15 * icon);
      wedgeText(g, am, R * .86, s.lbl, R * .05, R * .1, 'light');
      return;
    }
    if (s.bonus) {
      const am = BASE + (i + .5) * seg;
      ankh(g, c + Math.cos(am) * R * .72, c + Math.sin(am) * R * .72, am, R * .19 * icon);
      return;
    }
    if (s.wild) {
      const am = BASE + (i + .5) * seg;
      cleopatra(g, c + Math.cos(am) * R * .72, c + Math.sin(am) * R * .72, am, R * .22 * icon);
      return;
    }
    wedgeText(g, BASE + (i + .5) * seg, s.deep ? R * .76 : R * .725, s.lbl, fsFor(s.lbl, R * .725), s.deep ? R * .2 : R * .27, s.show || s.deep ? 'dark' : (i % 2 ? 'dark' : 'light'));
  });
  for (let i = 0; i < n; i++) { const a = BASE + i * seg; stud(g, c + Math.cos(a) * R * .895, c + Math.sin(a) * R * .895, R * .019); }
  return k;
}
// static pieces of a raised platter (light fixed at top-left), drawn at each nested wheel's scale
function buildWall() {
  const k = mk(), g = k.getContext('2d'), r1 = R * .93;
  g.save(); g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = R * .1; g.shadowOffsetX = R * .035; g.shadowOffsetY = R * .06;
  g.beginPath(); g.arc(c + R * .01, c + R * .03, r1 + R * .02, 0, TAU); g.fillStyle = '#16191d'; g.fill(); g.restore();
  g.beginPath(); g.arc(c + R * .008, c + R * .026, r1 + R * .014, 0, TAU);
  g.fillStyle = grad(g, c - r1, c, c + r1, c, [[0, '#3a4148'], [.3, '#c9d0d6'], [.5, '#6a737c'], [.7, '#dde3e8'], [1, '#2c3238']]);
  g.fill();
  return k;
}
function buildLight() {
  const k = mk(), g = k.getContext('2d'), r1 = R * .93;
  g.beginPath(); g.arc(c, c, r1, 0, TAU); g.clip();
  const hl = g.createRadialGradient(c - r1 * .45, c - r1 * .55, 0, c - r1 * .2, c - r1 * .25, r1 * 1.25);
  hl.addColorStop(0, 'rgba(255,255,255,.5)'); hl.addColorStop(.35, 'rgba(255,255,255,.1)'); hl.addColorStop(.7, 'rgba(0,0,0,0)'); hl.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = hl; g.fillRect(0, 0, N, N);
  g.fillStyle = grad(g, c - r1, c - r1, c + r1 * .2, c + r1 * .2, [[0, 'rgba(255,255,255,0)'], [.42, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.26)'], [.56, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, N, N);
  return k;
}
function buildPlatterBevel() {
  const k = mk(), g = k.getContext('2d'), r1 = R * .93;
  g.beginPath(); g.arc(c, c, r1 - 2.5 * D, 0, TAU);
  g.strokeStyle = grad(g, c - r1, c - r1, c + r1, c + r1, [[0, 'rgba(255,255,255,.95)'], [.45, 'rgba(255,255,255,.25)'], [.6, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,.85)']]);
  g.lineWidth = 5 * D; g.stroke();
  g.beginPath(); g.arc(c, c, r1, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = D * 1.5; g.stroke();
  return k;
}
function buildWell() {
  const k = mk(), g = k.getContext('2d'), r = R * .53;
  const w = g.createRadialGradient(c - R * .1, c - R * .12, R * .05, c, c, r);
  w.addColorStop(0, '#20262e'); w.addColorStop(.8, '#0d1014'); w.addColorStop(1, '#050607');
  g.beginPath(); g.arc(c, c, r, 0, TAU); g.fillStyle = w; g.fill();
  const sh = g.createRadialGradient(c + R * .02, c + R * .03, r * .7, c, c, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.8)');
  g.fillStyle = sh; g.fill();
  g.font = `${R * .032}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  try { g.letterSpacing = (R * .01) + 'px'; } catch (e) {}
  g.fillStyle = 'rgba(160,172,186,.45)'; /* no engraving: keep it mysterious */
  bevel(g, r, true);
  return k;
}
function buildSheen() {
  const k = mk(), g = k.getContext('2d');
  g.beginPath(); g.arc(c, c, R * .93, 0, TAU); g.clip();
  g.fillStyle = grad(g, c - R, c - R, c + R, c + R, [
    [0, 'rgba(255,255,255,0)'], [.27, 'rgba(255,255,255,0)'], [.34, 'rgba(255,255,255,.55)'], [.41, 'rgba(255,255,255,0)'],
    [.55, 'rgba(0,0,0,.25)'], [.65, 'rgba(255,255,255,0)'], [.71, 'rgba(255,255,255,.3)'], [.76, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']
  ]);
  g.fillRect(0, 0, N, N);
  const lip = g.createRadialGradient(c, c, R * .84, c, c, R * .93);
  lip.addColorStop(0, 'rgba(0,0,0,0)'); lip.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = lip; g.fillRect(0, 0, N, N);
  return k;
}
// a stalk of wheat for the farm wheel: ear of grain at the bottom pointing in, stalk above
function buildWheatPointer() {
  const k = mk(), g = k.getContext('2d'), top = c - R * 1.13, tip = c - R * .83;
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = R * .025; g.shadowOffsetY = R * .012;
  g.beginPath(); g.moveTo(c, top); g.quadraticCurveTo(c + R * .015, (top + tip) / 2, c, tip + R * .14);
  g.strokeStyle = '#b58a2a'; g.lineWidth = R * .016; g.lineCap = 'round'; g.stroke();
  for (let i = 0; i < 7; i++) { // grains, in pairs down the ear
    const y = tip + R * .02 + i * R * .022, sz = R * (.018 + .004 * Math.min(i, 3));
    [-1, 1].forEach(sd => {
      g.save(); g.translate(c + sd * R * .014, y); g.rotate(sd * -.5);
      g.beginPath(); g.ellipse(0, 0, sz * .55, sz, 0, 0, TAU);
      g.fillStyle = grad(g, -sz, -sz, sz, sz, [[0, '#ffe6a0'], [.5, '#e0b04a'], [1, '#9a6a1a']]); g.fill();
      g.strokeStyle = 'rgba(90,60,10,.6)'; g.lineWidth = D * .8; g.stroke(); g.restore();
      g.beginPath(); g.moveTo(c + sd * R * .02, y - sz * .6); g.lineTo(c + sd * R * .07, y - R * .07); g.strokeStyle = 'rgba(230,200,120,.8)'; g.lineWidth = D * .8; g.stroke();
    });
  }
  g.beginPath(); g.ellipse(c, tip + R * .005, R * .011, R * .02, 0, 0, TAU); g.fillStyle = '#e0b04a'; g.fill();
  g.restore();
  return k;
}
function buildPointer() {
  const k = mk(), g = k.getContext('2d');
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = R * .03; g.shadowOffsetY = R * .015;
  const tip = c - R * .83, top = c - R * 1.035, crown = c - R * 1.07, hw = R * .065;
  const outline = () => { g.beginPath(); g.moveTo(c, tip); g.lineTo(c - hw, top); g.quadraticCurveTo(c, crown, c + hw, top); g.closePath(); };
  outline(); g.fillStyle = '#20252b'; g.fill(); g.restore(); // the drop shadow, under both faces
  // two bevelled faces meeting at a ridge: the left catches the light, the right falls into shade
  g.beginPath(); g.moveTo(c, tip); g.lineTo(c - hw, top); g.quadraticCurveTo(c - hw * .5, crown + R * .008, c, crown + R * .012); g.closePath();
  g.fillStyle = grad(g, c - hw, top, c, tip, [[0, '#ffffff'], [.45, '#dfe5ea'], [1, '#8f99a3']]); g.fill();
  g.beginPath(); g.moveTo(c, tip); g.lineTo(c + hw, top); g.quadraticCurveTo(c + hw * .5, crown + R * .008, c, crown + R * .012); g.closePath();
  g.fillStyle = grad(g, c + hw, top, c, tip, [[0, '#5a636d'], [.5, '#8b959f'], [1, '#3a4148']]); g.fill();
  g.beginPath(); g.moveTo(c, tip + R * .01); g.lineTo(c, crown + R * .014); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = D; g.stroke();
  outline(); g.strokeStyle = 'rgba(164,126,224,.9)'; g.lineWidth = 1.3 * D; g.stroke();
  // the jewel on the pivot
  const jy = c - R * .985, jr = R * .024;
  stud(g, c, jy, jr * 1.25);
  const gem = g.createRadialGradient(c - jr * .35, jy - jr * .4, 0, c, jy, jr);
  gem.addColorStop(0, '#f6e8ff'); gem.addColorStop(.3, '#b98cf0'); gem.addColorStop(.75, '#5b2a96'); gem.addColorStop(1, '#2a0f4a');
  g.beginPath(); g.arc(c, jy, jr, 0, TAU); g.fillStyle = gem; g.fill();
  g.beginPath(); g.arc(c - jr * .3, jy - jr * .35, jr * .28, 0, TAU); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
  return k;
}
function buildFinal() {
  const k = mk(), g = k.getContext('2d'), n = FINAL.length, seg = TAU / n, r0 = R * .16, r1 = R * .93;
  g.save(); g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = R * .08; g.shadowOffsetY = R * .04;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#0c0e11'; g.fill(); g.restore();
  chromeRim(g, r1, R);
  FINAL.forEach((s, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg;
    wedgePath(g, a0, a1, r0, r1); g.fillStyle = wedgeFill(g, a0, a1, r0, r1, tintStops(s.tint)); g.fill();
  });
  const sh = g.createRadialGradient(c, c, r0, c, c, r1);
  sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(.62, 'rgba(0,0,0,.05)'); sh.addColorStop(.7, 'rgba(0,0,0,.45)'); sh.addColorStop(.88, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
  wedgePath(g, 0, TAU - 1e-4, r0, r1); g.fillStyle = sh; g.fill();
  hairlines(g, [.64, .9]);
  ridges(g, n, r0, r1);
  weather(g, r0, r1, .7);
  FINAL.forEach((s, i) => wedgeText(g, BASE + (i + .5) * seg, R * .43, s.lbl, R * .06, R * .3, 'dark'));
  const dome = g.createRadialGradient(c - R * .04, c - R * .05, 0, c, c, R * .16);
  dome.addColorStop(0, '#ffffff'); dome.addColorStop(.3, '#d9dfe4'); dome.addColorStop(.7, '#6b737c'); dome.addColorStop(1, '#262a30');
  g.beginPath(); g.arc(c, c, R * .16, 0, TAU); g.fillStyle = dome; g.fill();
  return k;
}
function ballImg(b) { return b.kind === 'W' ? faces.wildBall : b.kind === 'B' ? faces.bonusBall : b.gold ? faces.gold : faces.ball; }
function buildBall(gold) {
  const s = Math.max(16, Math.ceil(R * .08)), k = mk(s, s), g = k.getContext('2d'), r = s / 2;
  const gr = g.createRadialGradient(r * .7, r * .6, 0, r, r, r);
  if (gold === 'W') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, '#ffe27a'); gr.addColorStop(.7, '#d99a1e'); gr.addColorStop(1, '#5a3a06'); }
  else if (gold === 'B') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, '#d8b0ff'); gr.addColorStop(.7, '#7b3fc4'); gr.addColorStop(1, '#2a0e4a'); }
  else if (gold) { gr.addColorStop(0, '#fffbe8'); gr.addColorStop(.3, '#f3cf6e'); gr.addColorStop(.8, '#8a5a12'); gr.addColorStop(1, '#3e2806'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, '#d5dce2'); gr.addColorStop(.75, '#5a626b'); gr.addColorStop(1, '#1d2126'); }
  g.beginPath(); g.arc(r, r, r - .5, 0, TAU); g.fillStyle = gr; g.fill();
  return k;
}

// plinko board in canvas pixels
let B = null;
function buildBoard() {
  const m = N * .045, w = (N - 2 * m) / FINAL.length;
  B = { m, w, slotTop: N * .66, floor: N * .9, pr: N * .0085, dw: N * .004, pegs: [], divs: [] };
  const rows = 7, y0 = N * .34, y1 = N * .6;
  for (let r = 0; r < rows; r++) {
    const y = lerp(y0, y1, r / (rows - 1));
    if (r % 2 === 0) for (let j = 0; j < FINAL.length; j++) B.pegs.push({ x: m + w * (j + .5), y });
    else for (let j = 1; j < FINAL.length; j++) B.pegs.push({ x: m + w * j, y });
  }
  for (let j = 1; j < FINAL.length; j++) B.divs.push(m + w * j);

  const bg = mk(), g = bg.getContext('2d');
  rrect(g, D, D, N - 2 * D, N - 2 * D, N * .05);
  g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#1c2128'], [1, '#0d1013']]); g.fill();
  g.strokeStyle = grad(g, 0, 0, N, N, [[0, '#eef2f5'], [.5, '#59616a'], [1, '#c9d0d6']]); g.lineWidth = 2 * D; g.stroke();
  faces.boardBg = bg;

  const k = mk(), b = k.getContext('2d');
  FINAL.forEach((s, j) => {
    const x = m + w * j;
    b.fillStyle = s.tint[0] + '55'; b.fillRect(x, B.slotTop, w, B.floor - B.slotTop);
    b.fillStyle = grad(b, x, 0, x + w, 0, tintStops(s.tint)); b.fillRect(x, B.floor, w, N * .012);
    b.font = `700 ${N * .025}px ${LABEL_FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillStyle = s.tint[1];
    s.lbl.forEach((l, li) => b.fillText(l, x + w / 2, N * .937 + (li - (s.lbl.length - 1) / 2) * N * .03));
  });
  B.divs.forEach(x => {
    b.fillStyle = grad(b, x - B.dw, 0, x + B.dw, 0, [[0, '#4d555e'], [.5, '#f2f5f8'], [1, '#3b4249']]);
    rrect(b, x - B.dw, B.slotTop - B.dw, B.dw * 2, B.floor - B.slotTop + B.dw, B.dw); b.fill();
  });
  b.fillStyle = grad(b, 0, B.floor, 0, B.floor + 3 * D, [[0, '#cfd6dc'], [1, '#3b4249']]); b.fillRect(m, B.floor, N - 2 * m, 2 * D);
  B.pegs.forEach(p => stud(b, p.x, p.y, B.pr));
  faces.board = k;
}

let photoImg = null;
function buildPhoto() {
  const k = mk(), g = k.getContext('2d'), r = R * .93, seg = TAU / PHOTO_N;
  g.save(); g.beginPath(); g.arc(c, c, r, 0, TAU); g.clip();
  const iw = photoImg.naturalWidth, ih = photoImg.naturalHeight, s = Math.min(iw, ih);
  g.drawImage(photoImg, (iw - s) / 2, (ih - s) / 2, s, s, c - r, c - r, 2 * r, 2 * r);
  for (let i = 0; i < PHOTO_N; i++) {
    const a = BASE + i * seg;
    g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3 * D; g.stroke();
    g.strokeStyle = 'rgba(235,240,245,.85)'; g.lineWidth = 1.1 * D; g.stroke();
  }
  for (let i = 0; i < PHOTO_N; i++) {
    const a = BASE + (i + .5) * seg, x = c + Math.cos(a) * R * .83, y = c + Math.sin(a) * R * .83;
    g.beginPath(); g.arc(x, y, R * .05, 0, TAU); g.fillStyle = 'rgba(10,12,15,.72)'; g.fill();
    g.strokeStyle = 'rgba(227,232,237,.7)'; g.lineWidth = D; g.stroke();
    g.font = `700 ${R * .05}px ${LABEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#eef2f6';
    g.fillText(String(i + 1), x, y + D * .5);
  }
  g.restore();
  bevel(g, r, false);
  return k;
}

const LAYERS = [MAIN, ...LAYER_ORDERS.map(o => o.map(key => MOVE_DEFS[key]))];
const DEAD_LAYERS = {};
DEAD_KEYS.forEach(v => DEAD_LAYERS[v] = [MAIN, ...DEAD_ORDERS[v].map(o => o.map(key => /[*#]$/.test(key) ? { ...MOVE_DEFS[key.slice(0, -1)], dead: key.endsWith('*') ? 'wild' : 'bonus' } : MOVE_DEFS[key]))]);
// per wheel: which dead variant shows (to), what it was before (from), and the fade between them
const deadA = Array(MAXD + 1).fill(0), deadTo = Array(MAXD + 1).fill(''), deadFrom = Array(MAXD + 1).fill('');
// greyed-out rings are only built when needed; spare moments after load build them ahead of time
const BASE_ORDERS = LAYER_ORDERS.map(o => o.slice()), runOrders = BASE_ORDERS.map(o => o.slice());
function deadOrderOf(o, k, v) { let j = (k - 1) * 3; return o.map(key => (key === 'WD' && v.includes('W')) || (key === 'BN' && v.includes('B')) ? REPLACE[j++ % REPLACE.length] + (key === 'WD' ? '*' : '#') : key); }
function itemsOf(order) { return order.map(key => /[*#]$/.test(key) ? { ...MOVE_DEFS[key.slice(0, -1)], dead: key.endsWith('*') ? 'wild' : 'bonus' } : MOVE_DEFS[key]); }
const ringCache = new Map(); // built rings, keyed by palette and slice order, so a restored wheel costs nothing
function ringFor(k, order) { const key = k + '|' + order.join(); if (!ringCache.has(key)) ringCache.set(key, buildRing(itemsOf(order), PALS[k])); return ringCache.get(key); }
function setLayerOrder(k, order) {
  runOrders[k - 1] = order.slice();
  LAYERS[k] = itemsOf(order);
  DEAD_KEYS.forEach(v => DEAD_LAYERS[v][k] = itemsOf(deadOrderOf(order, k, v)));
  faces.layers[k] = ringFor(k, order);
  navCache = null;
}
function deadFace(v, k) { return ringFor(k, deadOrderOf(runOrders[k - 1], k, v)); }
function ensureStank() { if (!faces.stank) { faces.stank = buildStank(); faces.goldPointer = buildGoldPointer(); faces.stankBg = buildStankBg(); faces.bingo = buildBingoSprites(); } }
let warmTimer = 0;
function warmUp() {
  clearTimeout(warmTimer);
  const jobs = [];
  DEAD_KEYS.forEach(v => { for (let k = 1; k <= DEPTH; k++) jobs.push(() => deadFace(v, k)); });
  const next = () => { if (!jobs.length) return; if (busy && jobs.length) { warmTimer = setTimeout(next, 400); return; } jobs.shift()(); warmTimer = setTimeout(next, 60); };
  warmTimer = setTimeout(next, 1200);
}
function build() {
  faces.dart = buildDart(); faces.base = buildBase(); faces.pointer = buildPointer(); faces.sheen = buildSheen(); faces.sweep = buildSweep();
  ringCache.clear(); faces.layers = LAYERS.map((items, k) => k ? ringFor(k, runOrders[k - 1]) : buildRing(items, PALS[k]));
  faces.wheat = buildWheatPointer();
  faces.wall = buildWall(); faces.light = buildLight(); faces.pbevel = buildPlatterBevel(); faces.well = buildWell();
  faces.ball = buildBall(false); faces.gold = buildBall(true); faces.wildBall = buildBall('W'); faces.bonusBall = buildBall('B');
  faces.stank = faces.cosmic = faces.can = faces.farm = null; navCache = null;
  warmUp();
  buildBoard();
  if (photoImg) faces.photo = buildPhoto();
}

