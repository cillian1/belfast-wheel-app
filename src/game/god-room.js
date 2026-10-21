// ---------- the God room: Phelan's electronic waste shop ----------
// Owns God room visuals and shop interactions.
// Ghost Phelan shows you round his e-waste shop, picks a bit of scrap that bursts into a deck, five cards of higher or lower,
// and four right in a row gets you onto his God wheel, which he spins himself
const SCRAP = [
  { name: 'Nokia', back: '#1d4d7a', glyph: '♠' },
  { name: 'CRT telly', back: '#6b1d1d', glyph: '♥' },
  { name: 'keyboard', back: '#24402a', glyph: '♣' },
  { name: 'game pad', back: '#4a2a6b', glyph: '♦' },
  { name: 'toaster', back: '#5a4a1d', glyph: '♠' },
];
const GOD_PRIZES = [30, 50, 30, 100, 30, 75, 30, 1500, 30, 50, 30, 150, 30, 40, 30, 300, 30, 60, 30, 500, 40, 30, 200, 30];
const RANKS = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const MOCK = [
  "Ha. Knew you'd bottle it.",
  "Lower? LOWER? Mark would've got that.",
  "That's the e-waste pile for you, lads.",
  "Unlucky. I'm keeping the toaster.",
];
let god = null, tapPick = null, ghostSay = '';
const GOD_PICK_BUTTONS = [['hi', 'HIGHER ▲', '#2f7a3b'], ['lo', 'LOWER ▼', '#8e2a20']];
function buildGodWheel(items) {
  const k = mk(), g = k.getContext('2d'), n = items.length, seg = TAU / n, r0 = R * .18, r1 = R * .93;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#1a1206'; g.fill();
  chromeRim(g, r1, R);
  items.forEach((v, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg, big = v >= 100;
    wedgePath(g, a0, a1, r0, r1); g.fillStyle = wedgeFill(g, a0, a1, r0, r1, big ? GOD_A : i % 2 ? GOLD_B : [[0, '#2a2a2e'], [.4, '#d9dde2'], [.6, '#8a9098'], [1, '#2a2a2e']]); g.fill();
  });
  ridges(g, n, r0, r1);
  items.forEach((v, i) => wedgeText(g, BASE + (i + .5) * seg, R * .62, ['€' + $m(v)], R * (v >= 100 ? .07 : .06), R * .5, v >= 100 ? 'light' : i % 2 ? 'light' : 'dark'));
  eyeOfHorus(g, c, c, -Math.PI / 2, R * .3);
  return k;
}
function drawCard(g, x, y, w, card, up, back) {
  const h = w * 1.4;
  g.save(); g.translate(x, y); g.rotate(card && card.rot || 0);
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = w * .12; g.shadowOffsetY = w * .05;
  rrect(g, -w / 2, -h / 2, w, h, w * .08); g.fillStyle = up ? '#fbf7ee' : back; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  if (up && card) {
    const red = card.s === '♥' || card.s === '♦'; g.fillStyle = red ? '#c0261c' : '#1a1a1a';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${w * .5}px ${LABEL_FONT}`; g.fillText(RANKS[card.r], 0, -h * .1);
    g.font = `${w * .4}px serif`; g.fillText(card.s, 0, h * .22);
    g.font = `700 ${w * .18}px ${LABEL_FONT}`; g.fillText(RANKS[card.r], -w * .32, -h * .4);
  } else {
    g.strokeStyle = 'rgba(255,230,160,.6)'; g.lineWidth = w * .03; rrect(g, -w * .4, -h * .42, w * .8, h * .84, w * .05); g.stroke();
    eyeOfHorus(g, 0, 0, -Math.PI / 2, w * .5);
  }
  g.restore();
}
function drawScrap(g, it, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.lineWidth = .04; g.strokeStyle = '#111';
  if (it === 0) { rrect(g, -.15, -.32, .3, .64, .06); g.fillStyle = '#3a4a5a'; g.fill(); g.stroke(); g.fillStyle = '#9fd18a'; g.fillRect(-.1, -.24, .2, .18); g.fillStyle = '#222'; for (let j = 0; j < 9; j++) g.fillRect(-.09 + (j % 3) * .07, .02 + Math.floor(j / 3) * .07, .045, .04); }
  else if (it === 1) { rrect(g, -.4, -.32, .8, .58, .08); g.fillStyle = '#6d6a60'; g.fill(); g.stroke(); g.fillStyle = '#1d2a2a'; rrect(g, -.32, -.25, .52, .44, .1); g.fill(); g.fillStyle = '#444'; g.fillRect(.25, -.2, .08, .08); g.fillRect(.25, -.05, .08, .08); }
  else if (it === 2) { rrect(g, -.48, -.14, .96, .28, .04); g.fillStyle = '#d8d2c0'; g.fill(); g.stroke(); g.fillStyle = '#aaa294'; for (let j = 0; j < 24; j++) g.fillRect(-.43 + (j % 12) * .073, -.09 + Math.floor(j / 12) * .09, .055, .07); }
  else if (it === 3) { g.fillStyle = '#2b2b33'; g.beginPath(); g.ellipse(-.2, 0, .2, .17, 0, 0, TAU); g.ellipse(.2, 0, .2, .17, 0, 0, TAU); g.fill(); g.fillRect(-.2, -.17, .4, .25); g.fillStyle = '#c33'; g.beginPath(); g.arc(.22, -.03, .04, 0, TAU); g.fill(); g.fillStyle = '#3a7'; g.beginPath(); g.arc(.3, .04, .04, 0, TAU); g.fill(); g.fillStyle = '#888'; g.fillRect(-.28, -.04, .14, .05); g.fillRect(-.235, -.09, .05, .14); }
  else { rrect(g, -.35, -.22, .7, .44, .1); g.fillStyle = '#b9bcc2'; g.fill(); g.stroke(); g.fillStyle = '#222'; g.fillRect(-.22, -.24, .14, .04); g.fillRect(.05, -.24, .14, .04); g.fillStyle = '#7a7d82'; g.fillRect(.24, -.05, .1, .04); }
  g.restore();
}
function bubble(g, text, x, y) {
  g.save(); g.font = `600 ${N * .034}px ${LABEL_FONT}`; const w = Math.min(N * .62, g.measureText(text).width + N * .05), h = N * .075;
  const bx = Math.max(N * .03, Math.min(N * .97 - w, x - w / 2));
  rrect(g, bx, y - h, w, h, N * .02); g.fillStyle = 'rgba(245,250,248,.95)'; g.fill();
  g.beginPath(); g.moveTo(x - N * .02, y); g.lineTo(x, y + N * .03); g.lineTo(x + N * .015, y); g.fill();
  g.fillStyle = '#16211e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, bx + w / 2, y - h / 2, w - N * .03);
  g.restore();
}
function hlRects() { return { hi: { x: N * .1, y: N * .8, w: N * .36, h: N * .12 }, lo: { x: N * .54, y: N * .8, w: N * .36, h: N * .12 } }; }
function drawGodRoom(now) {
  const g = ctx, G = god;
  g.save(); rrect(g, D, D, N - 2 * D, N - 2 * D, N * .05); g.clip();
  if (G.ph === 'wheel') {
    g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#120c04'], [1, '#2b1d0a']]); g.fillRect(0, 0, N, N);
    const rg = g.createRadialGradient(c, c, R * .5, c, c, N * .75); rg.addColorStop(0, 'rgba(255,220,120,.25)'); rg.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = rg; g.fillRect(0, 0, N, N);
    drawScaled(faces.godWheel, G.rot, 1); drawPointer(faces.pointer, 1);
  } else {
    // the shop: a back wall of dead tellies, a sign, scrap all over the floor
    g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#1d2224'], [.55, '#2c3436'], [.56, '#3b3328'], [1, '#221c14']]); g.fillRect(0, 0, N, N);
    for (let j = 0; j < 6; j++) { const x = N * (.06 + j * .155), y = N * .2 + (j % 2) * N * .03; rrect(g, x, y, N * .13, N * .1, N * .015); g.fillStyle = '#4a4a44'; g.fill(); g.fillStyle = j === 2 ? `rgba(120,200,255,${.3 + .2 * Math.sin(now / 90)})` : '#141a1a'; g.fillRect(x + N * .015, y + N * .015, N * .1, N * .07); }
    g.fillStyle = '#0d0f10'; g.fillRect(N * .2, N * .06, N * .6, N * .09); g.font = `700 ${N * .045}px ${DISPLAY_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = `rgba(120,255,160,${.75 + .25 * Math.sin(now / 300)})`; g.fillText("PHELAN'S E-WASTE", c, N * .105, N * .56);
    G.floor.forEach(f => { if (!f.lifted) drawScrap(g, f.it, f.x, f.y, f.s, f.r); });
    if (G.item) drawScrap(g, G.item.it, G.item.x, G.item.y, G.item.s, G.item.r);
    G.parts.forEach(p => { g.save(); g.globalAlpha = p.a; g.fillStyle = p.col; g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); g.restore(); });
    if (G.cards.length) {
      g.fillStyle = 'rgba(8,10,12,.62)'; g.fillRect(0, N * .17, N, N * .83);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (G.label) { g.font = `700 ${N * .026}px ${LABEL_FONT}`; g.fillStyle = 'rgba(255,240,200,.85)'; g.fillText('THIS CARD', N * .3, N * .29); g.fillText('NEXT CARD', N * .55, N * .29); g.fillStyle = 'rgba(255,240,200,.55)'; g.fillText('DECK', N * .82, N * .29); }
      if (G.banner) { g.font = `700 ${N * .032}px ${LABEL_FONT}`; g.fillStyle = 'rgba(0,0,0,.7)'; g.fillText(G.banner, c, N * .215 + D, N * .92); g.fillStyle = '#fff1c8'; g.fillText(G.banner, c, N * .215, N * .92); }
      G.cards.forEach((cd, j) => { if (cd.x == null) return; drawCard(g, cd.x, cd.y, cd.w, cd, cd.up, G.back); });
      if (G.verdict && G.verdict.a > 0) {
        const v = G.verdict; g.save(); g.globalAlpha = v.a; g.translate(N * .55, N * .66); g.rotate(-.08); g.scale(.6 + .4 * v.a, .6 + .4 * v.a);
        rrect(g, -N * .15, -N * .055, N * .3, N * .11, N * .02); g.fillStyle = v.ok ? 'rgba(30,120,50,.92)' : 'rgba(150,30,25,.92)'; g.fill(); g.strokeStyle = '#fff6e0'; g.lineWidth = 3 * D; g.stroke();
        g.font = `800 ${N * .06}px ${LABEL_FONT}`; g.fillStyle = '#fff6e0'; g.fillText(v.ok ? '✓ RIGHT' : '✗ WRONG', 0, 0); g.restore();
      }
      if (G.pick) { const r = hlRects(), p = .5 + .5 * Math.sin(now / 200);
        GOD_PICK_BUTTONS.forEach(([k, t, col]) => { const b = r[k]; rrect(g, b.x, b.y, b.w, b.h, N * .03); g.fillStyle = col; g.fill(); g.strokeStyle = `rgba(255,240,200,${.4 + .4 * p})`; g.lineWidth = 3 * D; g.stroke(); g.font = `700 ${N * .045}px ${LABEL_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff6e0'; g.fillText(t, b.x + b.w / 2, b.y + b.h / 2); });
      }
      for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(c - N * .09 + j * N * .06, N * .755, N * .014, 0, TAU); g.fillStyle = j < G.right ? '#f3c34e' : 'rgba(255,255,255,.18)'; g.fill(); }
    }
  }
  if (ghost) drawGhost();
  if (ghost && G.hand) { g.save(); g.strokeStyle = 'rgba(235,250,245,.95)'; g.lineWidth = R * .03; g.lineCap = 'round'; g.beginPath(); g.moveTo(ghost.x + R * .1, ghost.y); g.lineTo(G.hand.x, G.hand.y); g.stroke(); g.restore(); }
  if (G.say) bubble(g, G.say, ghost ? ghost.x : c, (ghost ? ghost.y : c) - R * .2);
  if (G.flash > 0) { g.fillStyle = `rgba(255,250,225,${G.flash})`; g.fillRect(0, 0, N, N); }
  g.restore();
}
async function ghostTo(x, y, dur) { const x0 = ghost.x, y0 = ghost.y; await animate(dur, t => { const e = easeInOut(t); ghost.x = lerp(x0, x, e); ghost.y = lerp(y0, y, e) + Math.sin(t * Math.PI * 2) * N * .01; draw(); }); }
function waitTap(test) { const st = $('.stage'); st.classList.add('pick'); return new Promise(res => { tapPick = (x, y) => { const v = test(x, y); if (v != null) { tapPick = null; st.classList.remove('pick'); res(v); } }; }); }
async function godRoom(steps) {
  roomHit = true; Music.setMode('god'); playSfx('god'); buzz([100, 50, 100, 50, 300]); Music.sting(4);
  const floor = [];
  for (let j = 0; j < 14; j++) floor.push({ it: j % 5, x: N * (.08 + Math.random() * .84), y: N * (.6 + Math.random() * .33), s: N * (.1 + Math.random() * .05), r: (Math.random() - .5) * 1.2 });
  floor.sort((a, b) => a.y - b.y);
  god = { ph: 'shop', floor, parts: [], cards: [], right: 0, flash: 0, rot: 0 };
  $('#caption').textContent = '';
  setVerdict({ eyebrow: 'The God slice', title: 'Phelan’s shop', body: '', steps: steps.slice() });
  await crossTo(() => { scene = 'god'; ghost = { x: -N * .2, y: N * .42, a: .95, side: 1 }; }, 900);
  await ghostTo(N * .3, N * .42, 1400);
  god.say = 'Welcome to the shop, lads.'; draw(); await wait(1800);
  god.say = "Let's see what's in the pile."; draw(); await wait(1400); god.say = '';
  // he picks a bit of scrap and it bursts into cards
  const f = pick(floor), deck = SCRAP[f.it];
  await ghostTo(f.x - R * .15, f.y - R * .3, 1200);
  f.lifted = true; god.item = { ...f }; god.hand = { x: f.x, y: f.y }; tick(1, 600);
  await animate(1000, t => { god.item.y = lerp(f.y, N * .4, easeOut(t)); god.item.s = lerp(f.s, N * .2, t); god.item.r = Math.sin(t * 30) * .15 * t; god.hand = { x: god.item.x, y: god.item.y }; draw(); });
  god.hand = null; god.back = deck.back;
  god.say = `The ${deck.name}. Classic.`; draw(); await wait(1200); god.say = '';
  for (let j = 0; j < 40; j++) { const a = Math.random() * TAU, sp = N * (.2 + Math.random() * .6); god.parts.push({ x: god.item.x, y: god.item.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0, vr: (Math.random() - .5) * 10, s: N * (.012 + Math.random() * .02), a: 1, col: pick(['#888', '#3a7', '#c33', '#ddd', '#555', deck.back]) }); }
  god.item = null; whoosh(true); buzz([40, 30, 80]); popSound && popSound();
  // a deck of five, no two in a row the same, so every guess has an answer
  const cards = []; while (cards.length < 5) { const r = 2 + Math.floor(Math.random() * 13); if (!cards.length || r !== cards[cards.length - 1].r) cards.push({ r, s: pick(['♠', '♥', '♦', '♣']), up: false }); }
  god.cards = cards;
  // the live card on the left, the next card in the middle, the rest of the deck face down on the right
  const cw = N * .19, pos = j => ({ x: j === 0 ? N * .3 : j === 1 ? N * .55 : N * .82 + (j - 2) * N * .006, y: N * .47 - (j > 1 ? (j - 2) * N * .006 : 0) });
  const deckSpot = q => pos(2 + (4 - q)), rowSpot = q => ({ x: N * (.07 + q * .07), y: N * .66 });
  let last = performance.now();
  await animate(1100, t => {
    const now = performance.now(), dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
    god.parts.forEach(p => { p.vy += N * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.a = Math.max(0, p.a - dt * .9); });
    cards.forEach((cd, j) => { const e = easeOut(Math.min(1, t * 1.6)), to = j === 0 ? pos(0) : deckSpot(j); cd.x = lerp(c, to.x, e); cd.y = lerp(N * .4, to.y, e); cd.w = (j ? cw * .82 : cw) * e; cd.rot = (1 - e) * (j - 2) * .6; });
    draw();
  });
  god.parts = [];
  cards[0].up = true; ting(); draw();
  ghostTo(N * .9, N * .1, 900);
  setBtn('Higher or lower', true); $('#caption').textContent = 'Higher or lower?';
  const stopPulse = visibleDrawLoop(draw);
  let lost = false;
  for (let j = 1; j < 5; j++) {
    const prev = cards[j - 1], nx = cards[j];
    // Phelan draws the next card off the deck, face down, and lays it next to the live one
    god.label = true; god.banner = `Card ${j + 1} of 5 · drawing…`; whoosh(false); tick(.8, 900);
    const d0 = { x: nx.x, y: nx.y, w: nx.w };
    await animate(550, t => { const e = easeInOut(t); nx.x = lerp(d0.x, pos(1).x, e); nx.y = lerp(d0.y, pos(1).y, e) - Math.sin(t * Math.PI) * N * .05; nx.w = lerp(d0.w, cw, e); nx.rot = Math.sin(t * Math.PI) * .25; draw(); });
    nx.rot = 0;
    god.banner = `Card ${j + 1} of 5 · is it higher or lower than ${RANKS[prev.r]}?`;
    god.pick = true;
    const r = hlRects();
    const guess = await waitTap((x, y) => { const inR = b => x > b.x && x < b.x + b.w && y > b.y - N * .02 && y < b.y + b.h + N * .02; return inR(r.hi) ? 'hi' : inR(r.lo) ? 'lo' : null; });
    god.pick = false; tick(1, 1200);
    god.banner = `You said ${guess === 'hi' ? 'HIGHER' : 'LOWER'}…`; draw(); await wait(450);
    await animate(500, t => { nx.w = cw * Math.abs(Math.cos(t * Math.PI)); if (t > .5) nx.up = true; draw(); });
    nx.w = cw;
    const ok = guess === 'hi' ? nx.r > prev.r : nx.r < prev.r;
    god.verdict = { ok, a: 0, text: `${RANKS[nx.r]} is ${nx.r > prev.r ? 'higher' : 'lower'} than ${RANKS[prev.r]}` };
    god.banner = ok ? `Right! ${god.verdict.text}` : `Wrong. ${god.verdict.text}`;
    if (ok) { god.right = j; ting(); buzz([30, 30, 60]); Music.sting(j); } else buzz([200]);
    await animate(350, t => { god.verdict.a = easeOut(t); draw(); });
    await wait(ok ? 900 : 1400);
    await animate(250, t => { god.verdict.a = 1 - t; draw(); });
    god.verdict = null;
    if (!ok) { lost = true; break; }
    if (j < 4) { // the old card slides down into the row, the new one becomes the live card
      const a0 = { x: prev.x, y: prev.y, w: prev.w }, b0 = { x: nx.x, y: nx.y }, rs = rowSpot(j - 1);
      await animate(500, t => { const e = easeInOut(t); prev.x = lerp(a0.x, rs.x, e); prev.y = lerp(a0.y, rs.y, e); prev.w = lerp(a0.w, N * .06, e); nx.x = lerp(b0.x, pos(0).x, e); nx.y = lerp(b0.y, pos(0).y, e); draw(); });
    }
  }
  god.banner = ''; god.label = false;
  stopPulse();
  if (lost) {
    const cons = 0;
    await ghostTo(N * .62, N * .4, 700);
    god.say = pick(MOCK); draw(); await wait(2600); god.say = `Here. €${$m(cons)} for your trouble.`; draw(); await wait(1800);
    setVerdict({ eyebrow: 'Final answer · €' + $m(cons), title: 'Phelan keeps the rest', body: '', steps: steps.slice(), q: quote() });
    speak(['Final answer', ...spokenMoves(steps), `Phelan gives you ${$m(cons)} euro for your trouble`, roomAct('god')]);
    return;
  }
  god.say = 'Fair play. Come on, the big one.'; draw(); Music.sting(4); buzz([80, 50, 80, 50, 250]); await wait(1800); god.say = '';
  // the God wheel: Phelan grabs the rim and hauls it round himself
  if (!faces.godWheel || faces.godWheel.width !== N) faces.godWheel = buildGodWheel(GOD_PRIZES);
  await crossTo(() => { god.ph = 'wheel'; god.rot = 0; ghost.x = c + R * .95; ghost.y = c + R * .35; }, 900);
  $('#caption').textContent = 'The God wheel';
  const n = GOD_PRIZES.length, tg = target(n), seg = TAU / n;
  // wind-up: he pulls it back a touch, then throws it
  await animate(900, t => { god.rot = -Math.sin(t * Math.PI / 2) * .35; const a = god.rot + .5; ghost.x = c + Math.cos(a) * R * 1.0; ghost.y = c + Math.sin(a) * R * 1.0; draw(); });
  whoosh(true); buzz([60]);
  const s0 = god.rot, e0 = s0 + 7 * TAU + mod(-tg.a - s0, TAU);
  let lastS = sliceAt(s0, n), g0 = { x: ghost.x, y: ghost.y };
  await animate(8000, t => {
    god.rot = s0 + (e0 - s0) * easeOut(t);
    if (t < .12) { const a = god.rot + .5; ghost.x = c + Math.cos(a) * R; ghost.y = c + Math.sin(a) * R; g0 = { x: ghost.x, y: ghost.y }; }
    else { const u = Math.min(1, (t - .12) / .3); ghost.x = lerp(g0.x, N * .86, easeOut(u)); ghost.y = lerp(g0.y, N * .2, easeOut(u)); }
    const sl = sliceAt(god.rot, n); if (sl !== lastS) { lastS = sl; tick(1, 1700); pegBuzz(); }
    draw();
  });
  god.rot = mod(god.rot, TAU);
  const prize = GOD_PRIZES[tg.i];
  ting(); Music.sting(4); buzz(prize >= 100 ? [100, 50, 100, 50, 400] : [40, 40, 80]);
  god.say = prize >= 100 ? `€${$m(prize)}. Don't tell Mark.` : `€${$m(prize)}. Better than a toaster.`; draw();
  setVerdict({ eyebrow: 'Final answer · €' + $m(prize), title: 'The God wheel pays €' + $m(prize), body: '', steps: steps.slice(), q: quote() });
  await wait(1600);
  speak(['Final answer', ...spokenMoves(steps), `The God wheel pays ${$m(prize)} euro`, roomAct('god')]);
}
