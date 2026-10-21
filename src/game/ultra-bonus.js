// ---------- ultra bonus: 77 Bridgefield and the Stankman's Wheel ----------
// Owns Stank Chamber assets and room behavior.
const INTRO_TEXT = "On a cold winter's eve at 77 Bridgefield, a faint spirit watches over you.";
let introT = 0, camT = 0, hallZ = 0, doorT = 0, flash = 0, rotS = 0;
let bingo = [], ballSpeed = 1, ballPhase = 0, lastBallDraw = 0, pickIdx = -1, handT = 0, liftT = 0, handClosed = false, prize = null;
const STANK_SC = .95;
const SNOW = Array.from({ length: 140 }, () => ({ x: Math.random() * 1600 - 300, y: Math.random() * 1200, s: .6 + Math.random() * 1.6, v: 25 + Math.random() * 45, w: Math.random() * TAU }));
const WINDOWS = []; // building windows in world units (1000 x 1000)
for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) {
  const x = 300 + i * 110, y = 285 + j * 105;
  WINDOWS.push({ x, y, w: 70, h: 80, lit: (i * 7 + j * 3) % 5 === 0, target: i === 2 && j === 1 });
}
const TARGET_WIN = WINDOWS.find(w => w.target);

function buildStank() {
  const k = mk(), g = k.getContext('2d'), n = STANK.length, seg = TAU / n, r0 = R * .17, r1 = R * .93;
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = R * .1; g.shadowOffsetY = R * .05;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#1a1205'; g.fill(); g.restore();
  let rim;
  if (g.createConicGradient) {
    rim = g.createConicGradient(-.3, c, c);
    const st = ['#fff3c4', '#7a5310', '#f2cf73', '#4a3008', '#e8c066', '#8a6118', '#fff8dc', '#5a3c0c'];
    for (let i = 0; i <= 16; i++) rim.addColorStop(i / 16, st[i % 8]);
  } else rim = grad(g, 0, 0, N, N, GOLD_A);
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.arc(c, c, r1, 0, TAU, true); g.fillStyle = rim; g.fill();
  for (let i = 0; i < 28; i++) { const a = i * TAU / 28; stud(g, c + Math.cos(a) * R * .965, c + Math.sin(a) * R * .965, R * .013); }
  STANK.forEach((s, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg;
    wedgePath(g, a0, a1, r0, r1); g.fillStyle = wedgeFill(g, a0, a1, r0, r1, i % 2 ? GOLD_B : GOLD_A); g.fill();
  });
  const sh = g.createRadialGradient(c, c, r0, c, c, r1);
  sh.addColorStop(0, 'rgba(40,20,0,.5)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,20,0,.45)');
  wedgePath(g, 0, TAU - 1e-4, r0, r1); g.fillStyle = sh; g.fill();
  hairlines(g, [.3, .88]);
  ridges(g, n, r0, r1);
  STANK.forEach((s, i) => wedgeText(g, BASE + (i + .5) * seg, R * .57, s.lbl, R * .062, R * .56, 'light'));
  const dome = g.createRadialGradient(c - R * .04, c - R * .05, 0, c, c, R * .17);
  dome.addColorStop(0, '#fffbe6'); dome.addColorStop(.3, '#f3cf6e'); dome.addColorStop(.75, '#8a5a12'); dome.addColorStop(1, '#3e2806');
  g.beginPath(); g.arc(c, c, R * .17, 0, TAU); g.fillStyle = dome; g.fill();
  g.font = `italic 500 ${R * .16}px "Cormorant Garamond",Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,248,214,.7)'; g.fillText('S', c, c + R * .012 + D); g.fillStyle = '#3d2706'; g.fillText('S', c, c + R * .012);
  return k;
}
function buildStankBg() {
  const k = mk(), g = k.getContext('2d');
  const bg = g.createRadialGradient(c, c * .9, 0, c, c, N * .75);
  bg.addColorStop(0, '#3a2708'); bg.addColorStop(.55, '#140d04'); bg.addColorStop(1, '#030201');
  rrect(g, D, D, N - 2 * D, N - 2 * D, N * .05); g.fillStyle = bg; g.fill();
  g.strokeStyle = grad(g, 0, 0, N, N, GOLD_A); g.lineWidth = 2 * D; g.stroke();
  for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(Math.random() * N, Math.random() * N, Math.random() * 1.6 * D, 0, TAU); g.fillStyle = `rgba(255,220,140,${Math.random() * .35})`; g.fill(); }
  return k;
}
function buildBingoSprites() {
  const out = {}, s = Math.max(48, Math.ceil(R * .4));
  [10, 20, 50, 100, 500].forEach(v => {
    const k = mk(s, s), g = k.getContext('2d'), r = s / 2;
    g.save(); g.beginPath(); g.arc(r, r, r - 1, 0, TAU); g.clip();
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, s, s);
    g.fillStyle = PRIZE_COL[v]; g.fillRect(0, r * .52, s, r * .96);
    g.beginPath(); g.arc(r, r, r * .52, 0, TAU); g.fillStyle = '#fbfaf5'; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = r * .03; g.stroke();
    g.fillStyle = '#16191d'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (v === 500) {
      g.font = `700 ${r * .42}px ${LABEL_FONT}`; g.fillStyle = '#c0182c'; g.fillText('♥', r, r - r * .17);
      g.font = `700 ${r * .28}px ${LABEL_FONT}`; g.fillStyle = '#16191d'; g.fillText(("" + '€' + $m(500) + ""), r, r + r * .24);
    } else { g.font = `700 ${r * (v === 100 ? .34 : .4)}px ${LABEL_FONT}`; g.fillText('€' + $m(v), r, r + r * .03); }
    const sh = g.createRadialGradient(r * .65, r * .55, 0, r, r, r);
    sh.addColorStop(0, 'rgba(255,255,255,.75)'); sh.addColorStop(.25, 'rgba(255,255,255,.05)'); sh.addColorStop(.8, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = sh; g.fillRect(0, 0, s, s);
    g.restore();
    out[v] = k;
  });
  return out;
}

function drawIntro(now) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
  const t = now / 1000, gx = c + Math.sin(t * .7) * N * .12, gy = N * .27 + Math.cos(t * .9) * N * .02, a = .14 * Math.min(1, introT * 2);
  const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy + N * .05, N * .17);
  gr.addColorStop(0, `rgba(220,230,255,${a})`); gr.addColorStop(1, 'rgba(220,230,255,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(gx, gy + N * .05, N * .09, N * .16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(0,0,0,${a * 4})`;
  ctx.beginPath(); ctx.ellipse(gx - N * .025, gy, N * .01, N * .016, 0, 0, TAU); ctx.ellipse(gx + N * .025, gy, N * .01, N * .016, 0, 0, TAU); ctx.fill();
  const shown = INTRO_TEXT.slice(0, Math.floor(INTRO_TEXT.length * introT));
  ctx.font = `italic 500 ${N * .062}px "Cormorant Garamond",Georgia,serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = INTRO_TEXT.split(' '), lines = []; let line = '';
  words.forEach(w => { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > N * .8 && line) { lines.push(line); line = w; } else line = tst; });
  lines.push(line);
  let used = 0;
  lines.forEach((l, i) => {
    const vis = shown.slice(used, used + l.length); used += l.length + 1;
    const y = N * .56 + (i - (lines.length - 1) / 2) * N * .085;
    const w = ctx.measureText(l).width;
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(236,238,245,.92)'; ctx.fillText(vis, c - w / 2, y);
  });
}
function drawBuilding(now) {
  const k = N / 1000, e = easeInOut(camT), z = Math.pow(10, e);
  const tx = TARGET_WIN.x + TARGET_WIN.w / 2, ty = TARGET_WIN.y + TARGET_WIN.h / 2;
  ctx.save(); ctx.translate(N / 2, N / 2); ctx.scale(z * k, z * k); ctx.translate(-lerp(500, tx, e), -lerp(560, ty, e));
  const sky = ctx.createLinearGradient(0, -400, 0, 1000); sky.addColorStop(0, '#02040a'); sky.addColorStop(1, '#152033');
  ctx.fillStyle = sky; ctx.fillRect(-1500, -1500, 4000, 4000);
  const mg = ctx.createRadialGradient(820, 150, 0, 820, 150, 160); mg.addColorStop(0, 'rgba(230,236,255,.35)'); mg.addColorStop(1, 'rgba(230,236,255,0)');
  ctx.fillStyle = mg; ctx.fillRect(600, -50, 450, 450);
  ctx.beginPath(); ctx.arc(820, 150, 42, 0, TAU); ctx.fillStyle = '#e9edf5'; ctx.fill();
  ctx.fillStyle = '#0a0e16';
  [[-300, 620, 260, 600], [0, 700, 200, 400], [790, 650, 220, 500], [1010, 560, 300, 600]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
  // 77 Bridgefield
  ctx.fillStyle = grad(ctx, 260, 0, 740, 0, [[0, '#1c1612'], [.5, '#2a211b'], [1, '#17120f']]); ctx.fillRect(260, 230, 480, 800);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
  for (let y = 240; y < 1000; y += 18) { ctx.beginPath(); ctx.moveTo(260, y); ctx.lineTo(740, y); ctx.stroke(); }
  ctx.fillStyle = '#3a312a'; ctx.fillRect(248, 218, 504, 16);
  ctx.fillStyle = 'rgba(240,244,250,.85)'; ctx.fillRect(248, 214, 504, 5);
  WINDOWS.forEach(w => {
    ctx.fillStyle = '#0d0a08'; ctx.fillRect(w.x - 5, w.y - 5, w.w + 10, w.h + 10);
    if (w.lit || w.target) {
      const lg = ctx.createRadialGradient(w.x + w.w / 2, w.y + w.h / 2, 0, w.x + w.w / 2, w.y + w.h / 2, w.w);
      lg.addColorStop(0, w.target ? '#ffe2a0' : '#e9b764'); lg.addColorStop(1, w.target ? '#c98a2e' : '#7a5222');
      ctx.fillStyle = lg;
    } else ctx.fillStyle = '#0f1520';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    if (w.target) { // the faint spirit at the window
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(w.x + w.w * .55, w.y + w.h * .55, 11, 22, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(80,50,20,.6)'; ctx.fillRect(w.x + w.w * .55 - 6, w.y + w.h * .45, 3, 4); ctx.fillRect(w.x + w.w * .55 + 3, w.y + w.h * .45, 3, 4);
    }
    ctx.fillStyle = '#0d0a08'; ctx.fillRect(w.x + w.w / 2 - 2, w.y, 4, w.h); ctx.fillRect(w.x, w.y + w.h * .45, w.w, 4);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(w.x - 6, w.y + w.h + 4, w.w + 12, 3); // snow on the sill
  });
  ctx.fillStyle = '#120d0a'; ctx.fillRect(455, 900, 90, 130);
  ctx.fillStyle = '#e9b764'; ctx.fillRect(463, 908, 74, 30);
  ctx.fillStyle = '#b08a3e'; ctx.fillRect(478, 866, 44, 26);
  ctx.font = '700 20px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2a1a05'; ctx.fillText('77', 500, 880);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-1500, 990, 4000, 600);
  const t = now / 1000;
  SNOW.forEach(f => {
    const y = mod(f.y + t * f.v, 1200) - 100, x = f.x + Math.sin(t + f.w) * 14;
    ctx.beginPath(); ctx.arc(x, y, f.s, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
  });
  ctx.restore();
  if (camT > .8) { ctx.fillStyle = `rgba(255,214,140,${(camT - .8) / .2})`; ctx.fillRect(0, 0, N, N); }
}
function drawHall() {
  const z = 1 + hallZ * 1.6;
  ctx.save(); ctx.translate(c, N * .5); ctx.scale(z, z); ctx.translate(-c, -N * .5);
  ctx.fillStyle = '#0c0807'; ctx.fillRect(-N, -N, 3 * N, 3 * N);
  const L = N * .3, Rr = N * .7, T = N * .2, Bt = N * .72;
  ctx.fillStyle = grad(ctx, 0, 0, L, 0, [[0, '#0f1a14'], [1, '#22342a']]);
  ctx.beginPath(); ctx.moveTo(0, -N * .2); ctx.lineTo(L, T); ctx.lineTo(L, Bt); ctx.lineTo(0, N * 1.2); ctx.fill();
  ctx.fillStyle = grad(ctx, N, 0, Rr, 0, [[0, '#0f1a14'], [1, '#22342a']]);
  ctx.beginPath(); ctx.moveTo(N, -N * .2); ctx.lineTo(Rr, T); ctx.lineTo(Rr, Bt); ctx.lineTo(N, N * 1.2); ctx.fill();
  ctx.fillStyle = grad(ctx, 0, Bt, 0, N, [[0, '#2a1a10'], [1, '#4a2e1a']]);
  ctx.beginPath(); ctx.moveTo(L, Bt); ctx.lineTo(Rr, Bt); ctx.lineTo(N, N * 1.2); ctx.lineTo(0, N * 1.2); ctx.fill();
  ctx.fillStyle = '#0a0706'; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(Rr, T); ctx.lineTo(N, -N * .2); ctx.lineTo(0, -N * .2); ctx.fill();
  ctx.fillStyle = '#2c2119'; ctx.fillRect(L, T, Rr - L, Bt - T);
  const bulb = ctx.createRadialGradient(c, T + N * .03, 0, c, T + N * .2, N * .45);
  bulb.addColorStop(0, 'rgba(255,214,140,.35)'); bulb.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = bulb; ctx.fillRect(0, 0, N, N);
  ctx.beginPath(); ctx.arc(c, T + N * .03, N * .012, 0, TAU); ctx.fillStyle = '#ffe9b8'; ctx.fill();
  // the door
  const dx = N * .41, dy = N * .3, dw = N * .18, dh = Bt - dy;
  const glow = ctx.createRadialGradient(c, dy + dh / 2, 0, c, dy + dh / 2, dh);
  glow.addColorStop(0, '#fff3c4'); glow.addColorStop(.5, '#f2b640'); glow.addColorStop(1, '#6b4510');
  ctx.fillStyle = glow; ctx.fillRect(dx, dy, dw, dh);
  const ow = dw * (1 - doorT * .92);
  ctx.fillStyle = grad(ctx, dx, 0, dx + ow, 0, [[0, '#3a2213'], [.5, '#5a3520'], [1, '#2e1a0e']]); ctx.fillRect(dx, dy, ow, dh);
  if (ow > dw * .3) {
    const f = ow / dw;
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = D * 1.5;
    ctx.strokeRect(dx + dw * .12 * f, dy + dh * .5, dw * .76 * f, dh * .42);
    ctx.fillStyle = grad(ctx, dx, 0, dx + ow, 0, GOLD_A); ctx.fillRect(dx + dw * .1 * f, dy + dh * .14, dw * .8 * f, dh * .14);
    ctx.save(); ctx.translate(dx + dw * .5 * f, dy + dh * .21); ctx.scale(f, 1);
    ctx.font = `700 ${dw * .1}px Georgia,serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2a1a05';
    ctx.fillText('STANK', 0, -dh * .025); ctx.fillText('CHAMBER', 0, dh * .03); ctx.restore();
    ctx.beginPath(); ctx.arc(dx + ow * .86, dy + dh * .55, dw * .035, 0, TAU); ctx.fillStyle = '#e8c066'; ctx.fill();
  }
  ctx.strokeStyle = '#120b06'; ctx.lineWidth = D * 4; ctx.strokeRect(dx, dy, dw, dh);
  ctx.restore();
}
function ballPos(b, i) {
  const a = b.a + ballPhase * b.sp, rr = (b.r + Math.sin(ballPhase * 2.3 + i) * .03) * R;
  return { x: c + Math.cos(a) * rr, y: c + Math.sin(a) * rr * .96 };
}
function drawHand(x, y, closed) {
  const w = N * .075;
  ctx.fillStyle = grad(ctx, x - w / 2, 0, x + w / 2, 0, [[0, '#1a120c'], [.5, '#3a2a1e'], [1, '#140d08']]);
  ctx.fillRect(x - w / 2, y - N * 1.2, w, N * 1.2 - N * .07);
  ctx.fillStyle = grad(ctx, x - w / 2, 0, x + w / 2, 0, GOLD_A); ctx.fillRect(x - w * .56, y - N * .095, w * 1.12, N * .025);
  ctx.fillStyle = '#e3ad86';
  ctx.beginPath(); ctx.ellipse(x, y - N * .045, w * .48, N * .035, 0, 0, TAU); ctx.fill();
  const spread = closed ? .25 : 1;
  for (let f = 0; f < 4; f++) {
    const fx = x + (f - 1.5) * w * .22 * (closed ? .8 : 1.1), len = N * (closed ? .028 : .05);
    ctx.save(); ctx.translate(fx, y - N * .02); ctx.rotate((f - 1.5) * .18 * spread);
    rrect(ctx, -w * .085, 0, w * .17, len, w * .08); ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.translate(x + w * .45, y - N * .05); ctx.rotate(closed ? .3 : -.6);
  rrect(ctx, -w * .08, 0, w * .16, N * .04, w * .08); ctx.fill(); ctx.restore();
}
function drawStank(now) {
  ensureStank();
  const dt = lastBallDraw ? Math.max(0, Math.min(.05, (now - lastBallDraw) / 1000)) : 0; lastBallDraw = now;
  ballPhase += dt * ballSpeed;
  ctx.drawImage(faces.stankBg, 0, 0);
  drawScaled(faces.stank, rotS, STANK_SC); drawWheelRim(STANK_SC);
  ctx.globalCompositeOperation = 'overlay'; drawScaled(faces.sheen, 0, STANK_SC); ctx.globalCompositeOperation = 'source-over';
  drawWheelSweep(bingo.length > 0 && pickIdx < 0, STANK_SC);
  drawPointer(faces.pointer, STANK_SC);
  const br = R * .064;
  bingo.forEach((b, i) => {
    if (i === pickIdx && handT >= 1) return;
    const p = ballPos(b, i);
    ctx.globalAlpha = pickIdx >= 0 && liftT > 0 ? .45 : 1;
    ctx.drawImage(faces.bingo[b.v], p.x - br, p.y - br, br * 2, br * 2);
  });
  ctx.globalAlpha = 1;
  if (pickIdx >= 0) {
    const p = ballPos(bingo[pickIdx], pickIdx);
    const tx = lerp(p.x, c, easeInOut(liftT)), ty = lerp(p.y, c, easeInOut(liftT));
    const hy = handT < 1 ? lerp(-N * .1, p.y - br * .3, easeInOut(handT)) : ty - br * (1 + liftT * 3.2) * .3;
    const hx = handT < 1 ? p.x : tx;
    if (handT >= 1) {
      const s = br * (1 + liftT * 3.2);
      if (liftT >= 1) {
        const glow = ctx.createRadialGradient(c, c, s * .5, c, c, s * 2.2);
        glow.addColorStop(0, 'rgba(255,220,140,.55)'); glow.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, N, N);
      }
      ctx.drawImage(faces.bingo[bingo[pickIdx].v], tx - s, ty - s, s * 2, s * 2);
    }
    drawHand(hx, hy, handClosed);
  }
  if (prize) {
    ctx.font = `700 ${N * .065}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (N * .006) + 'px'; } catch (e) {}
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(prize, c, N * .87 + 2 * D);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(prize, c, N * .87);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
}

// every bonus room still sends you somewhere after its prize (user, Oct 21): the prize is the reward, the activity is the night
const BELFAST_PUBS = ["Kelly's Cellars", 'The Crown Liquor Saloon', 'The Duke of York', 'The Spaniard', 'Bittles Bar', "White's Tavern", 'The Points', "McHugh's", 'The Garrick', 'The Sunflower', "Robinson's", 'The John Hewitt', 'The Dirty Onion', 'The Harp Bar', "Muriel's Cafe Bar", 'Fibber Magees', 'The Errigle Inn', "Lavery's", 'The Hatfield House', "Madden's Bar", 'The National', 'The Morning Star', 'The American Bar', 'The Parlour'];
const ROOM_ACTS = {
  pub: () => `Then head to ${pick(BELFAST_PUBS)}, and the first round there is on the winner`,
  monster: () => pick([
    'Then buy a can of Monster from the nearest shop and get a stranger to cheers you with it',
    'Then find the shop with the most Monster flavours and buy the weirdest one for the group to share',
    'Then swap your next pint for a can of Monster, and finish it before the lads finish theirs',
    'Then get a can of Monster and toast Phelan out loud on the street',
    'Then find a Monster flavour none of you have tried and everyone rates it out of ten',
  ]),
  god: () => pick([
    'Then go to Smithfield Market and find the oddest bit of second-hand tech in there',
    'Then find a phone repair shop and ask what they would give you for an old Nokia',
    'Then find an arcade and win at least one ticket before you leave',
    'Then go into CeX and rate the retro consoles out of ten, like Phelan would',
    'Then find the nearest late chippy and order exactly what Phelan would',
  ]),
  pyramid: () => pick([
    'Then head to the Cathedral Quarter for the best night out in Belfast: start at The Duke of York and keep going',
    "Then get to Kelly's Cellars for trad and stay until they call last orders",
    'Then go to The Dirty Onion and grab a spot in the yard for the night',
    'Then go up to The Perch rooftop bar and toast the pyramid',
    "Then it's a big one: The Spaniard first, then wherever the Cathedral Quarter takes you",
  ]),
};
function roomAct(kind) { return ROOM_ACTS[kind](); }
