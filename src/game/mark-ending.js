// ---------- the Mark ending: pipes, dice, chickens, fire arrows, the farm, Mark's wheel ----------
// Owns the Mark ending, farm simulation, and Mark's wheel.
const MARK_QS = [
  { lbl: ['WHY KICK', 'PHELAN OUT?'], t: 'Ask Mark why he really kicked Phelan out' },
  { lbl: ["PHELAN'S", 'ROOM SMELL'], t: "Ask Mark to describe the smell of Phelan's old room" },
  { lbl: ['DONEGAL', 'OUT OF 10'], t: 'Ask Mark to rate Donegal out of ten, honestly' },
  { lbl: ['TEACH US', 'PORTUGUESE'], t: 'Ask Mark to teach you a phrase in Portuguese' },
  { lbl: ['WHAT DOES HE', 'SEE IN YOU?'], t: 'Ask Mark what his boyfriend sees in him' },
  { lbl: ['BRAZIL', 'MATES FIGHT'], t: 'Ask Mark which of his Brazilian mates would win in a fight' },
  { lbl: ['BEST NIGHT', 'EVER'], t: 'Ask Mark about the best night out he has ever had' },
  { lbl: ['€500', 'WHAT NOW?'], t: 'Ask Mark what he would do with €500 right now' },
  { lbl: ['CRIED AT', 'A FILM'], t: 'Ask Mark which film made him cry' },
  { lbl: ['JAMES IN', '3 WORDS'], t: 'Ask Mark to describe James in three words' },
  { lbl: ['3AM', 'PHONE CALL'], t: 'Ask Mark who he would ring at 3am' },
  { lbl: ["PHELAN'S", 'NEXT SONG'], t: "Ask Mark what Phelan's next country song should be about" },
  { lbl: ['MARK PICKS', 'THE PUB'], t: 'Ask Mark to pick the next pub. No arguing' },
  { lbl: ['MOST', 'EMBARRASSING'], t: 'Ask Mark for his most embarrassing moment' },
  { lbl: ["AUSTIN'S", 'DANCING'], t: "Ask Mark to rate Austin's dancing out of ten" },
  { lbl: ['CLEANING', 'THAT ROOM'], t: "Ask Mark for the worst thing he found cleaning Phelan's room" },
];
// Mark's questions that follow on from where the chart sent you (keyed by destination title)
const q = (a, b, t) => ({ lbl: [a, b], t });
const MARK_BY_DEST = {
  'The pub': [q('TOAST TO', 'PHELAN'), q('PUB WHO', 'IS PHELAN?'), q('MARK', 'PICKS PINTS')],
  'The slot house': [q("MARK'S", 'LUCKY NUMBER'), q('BIGGEST', 'GAMBLE'), q('WHAT IF', 'MARK WINS?')],
  'The chippy': [q("MARK'S", 'CHIPPY ORDER'), q('SPICE BAG', 'OR NOT?'), q('FEED', 'PHELAN?')],
  'Live music': [q('NAME', 'THIS BAND'), q("MARK'S", 'FIRST GIG'), q('SING', 'PHELAN SONG')],
  'Snooker hall': [q('MARK VS', 'PHELAN'), q('TRICK', 'SHOT'), q('WHO TAUGHT', 'MARK?')],
  'Taxi lotto': [q('ASK THE', 'DRIVER'), q("MARK'S", 'DREAM TRIP'), q('WORST', 'TAXI EVER')],
  'Somewhere high': [q('WHAT CAN', 'MARK SEE?'), q('SCARED OF', 'HEIGHTS?'), q('SHOUT', 'IT OUT')],
  'The corner shop': [q('MARK PICKS', 'A GIFT'), q('BRAZIL', 'SNACK'), q('PHELAN', 'SHOPPING')],
  'Karaoke': [q("MARK'S", 'SONG'), q('DUET', 'WITH MARK'), q('PHELAN', 'ANTHEM')],
  'The arcade': [q('MARK', 'HIGH SCORE'), q('RACING', 'GAMES'), q('CLAW', 'MACHINE')],
  'Trad session': [q('NAME THE', 'TUNE'), q('IRISH', 'OR BRAZIL?'), q('MARK', 'DANCES')],
  'The kebab shop': [q('KEBAB', 'RANKING'), q('3AM', 'KEBAB STORY'), q('GARLIC', 'OR CHILLI?')],
  'A hotel lobby': [q('MARK', 'CHECKS IN'), q('HONEYMOON', 'HOTEL'), q('POSH', 'VOICE')],
  'Black taxi tour': [q('MARK', 'THE GUIDE'), q('BELFAST', 'FACT'), q('DRIVER', 'QUESTION')],
  'A late café': [q("MARK'S", 'COFFEE'), q('LATE NIGHT', 'TRUTH'), q('BRAZIL', 'COFFEE')],
  'Rooftop bar': [q('VIEW', 'OUT OF 10'), q('COCKTAIL', 'FOR MARK'), q('MARK', 'MAKES A WISH')],
};
const MARK_BY_DEST_T = {
  'The pub': ['Ask Mark to stand up and give a toast to Phelan', 'Ask Mark who in this pub looks most like Phelan', 'Ask Mark to pick the next round for everyone'],
  'The slot house': ["Ask Mark for his lucky number and play it", 'Ask Mark about the biggest gamble he ever took', 'Ask Mark what he would do if he won here tonight'],
  'The chippy': ["Ask Mark for his perfect chippy order and get it", 'Ask Mark if a spice bag counts as a meal', 'Ask Mark what he would buy Phelan from here'],
  'Live music': ['Ask Mark to guess the name of this band', "Ask Mark about the first gig he ever went to", 'Ask Mark to hum a verse of a Phelan country song'],
  'Snooker hall': ['Ask Mark who would win at snooker, him or Phelan', 'Ask Mark to call a trick shot and try it', 'Ask Mark who taught him to play'],
  'Taxi lotto': ['Ask Mark to ask the driver for their best Belfast story', "Ask Mark where he would go if the taxi could drive anywhere", 'Ask Mark about the worst taxi ride of his life'],
  'Somewhere high': ['Ask Mark to describe the view like a tour guide', 'Ask Mark what he is actually scared of', 'Ask Mark to shout one secret off the top'],
  'The corner shop': ['Ask Mark to pick a present for Phelan in here', 'Ask Mark which snack from Brazil this shop is missing', 'Ask Mark what Phelan would buy in here'],
  'Karaoke': ["Ask Mark which song he would sing and hold him to it", 'Ask Mark who he would pick for a duet', "Ask Mark to pick Phelan's karaoke anthem"],
  'The arcade': ["Ask Mark for his best ever high score", "Ask Mark how many hours Phelan spent on racing games", 'Ask Mark to pick the prize in the claw machine'],
  'Trad session': ['Ask Mark to name the tune that is playing', 'Ask Mark which is better, Irish music or Brazilian', 'Ask Mark to show you one dance move'],
  'The kebab shop': ['Ask Mark to rank every kebab shop he knows', 'Ask Mark for his best 3am kebab story', 'Ask Mark garlic or chilli, and why'],
  'A hotel lobby': ['Ask Mark to ask reception what a room costs', 'Ask Mark where he would take his boyfriend for a fancy weekend', 'Ask Mark to do his poshest voice'],
  'Black taxi tour': ['Ask Mark to be the tour guide for one street', 'Ask Mark for one fact about Belfast he actually knows', 'Ask Mark to pick one question for the driver'],
  'A late café': ["Ask Mark how he takes his coffee and order it", 'Ask Mark for one late night truth', 'Ask Mark if Brazilian coffee is really better'],
  'Rooftop bar': ['Ask Mark to rate the view out of ten', 'Ask Mark to pick a cocktail for you', 'Ask Mark to make a wish over the city'],
};
Object.keys(MARK_BY_DEST).forEach(k => MARK_BY_DEST[k].forEach((it, i) => it.t = MARK_BY_DEST_T[k][i]));
const LEAVE = { lbl: ['LEAVE MARK', 'ALONE'], t: 'Leave Mark alone', b: 'No question for Mark this time. He gets away with it.', special: 'leave' };
const OWNWAY = { lbl: ['GO YOUR', 'OWN WAY'], t: 'Reject all commands, go your own way', b: 'Forget everything the wheels said. Go wherever you like.', special: 'own' };

let pipes = null, carried = [], d6 = [], d6Sum = 0, chickens = [], arrows = [], fires = [], feathers = [], camX = 0, markItems = [], rotM = 0, formT = [], showMark = 0, chainNote = '', raceLine = 0, markSpinning = false, markWin = null;

// the pipes: one tube drops the balls into a pinball pit (bumpers and flippers, all physics),
// then three chutes catch them. Only the green chute counts.
function setupPipes(n) {
  const green = Math.floor(Math.random() * 3), xs = [N * .2, N * .5, N * .8];
  const rb = N * .017, fl = N * .17;
  const flippers = [
    { px: N * .2, py: N * .5, rest: .5, up: -.38, dir: 1 },
    { px: N * .8, py: N * .5, rest: Math.PI - .5, up: Math.PI + .38, dir: -1 },
    { px: N * .36, py: N * .3, rest: .45, up: -.3, dir: 1, short: true },
    { px: N * .64, py: N * .3, rest: Math.PI - .45, up: Math.PI + .3, dir: -1, short: true },
  ].map(f => ({ ...f, ang: f.rest, w: 0, hold: 0, cool: Math.random() * .6, len: f.short ? fl * .62 : fl }));
  const bumpers = [{ x: N * .5, y: N * .4, r: N * .04 }, { x: N * .22, y: N * .34, r: N * .032 }, { x: N * .78, y: N * .34, r: N * .032 }, { x: N * .5, y: N * .55, r: N * .028 }].map(b => ({ ...b, flash: 0 }));
  const bs = []; for (let i = 0; i < n; i++) bs.push({ state: 'tube', x: c, y: -N * .05 - i * N * .1, vx: 0, vy: 0, a: 1, br: -1 });
  pipes = { green, xs, balls: bs, tray: [], rb, flippers, bumpers, top: N * .2, mouth: N * .66, wallL: N * .05, wallR: N * .95, divs: [N * .35, N * .65], el: 0 };
}
function chuteX(i) { return pipes.xs[i]; }
// the pinball room's static backdrop: a dark arcade cabinet with chrome rails, starfield and a soft floor glow (built once)
function buildPipeBg() {
  const k = mk(), g = k.getContext('2d');
  g.fillStyle = grad(g, 0, 0, 0, N, [[0, '#0b0f1c'], [.55, '#121a2e'], [1, '#07090f']]); g.fillRect(0, 0, N, N);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(200,220,255,${.08 + Math.random() * .25})`; g.beginPath(); g.arc(Math.random() * N, Math.random() * N * .6, D * (.5 + Math.random()), 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(90,140,255,.07)'; g.lineWidth = D; // faint grid on the playfield
  for (let x = 0; x <= N; x += N / 14) { g.beginPath(); g.moveTo(x, N * .2); g.lineTo(x, N * .66); g.stroke(); }
  for (let y = N * .2; y <= N * .66; y += N / 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
  const fl = g.createRadialGradient(c, N * .95, 0, c, N * .95, N * .6); fl.addColorStop(0, 'rgba(80,120,255,.18)'); fl.addColorStop(1, 'rgba(80,120,255,0)'); g.fillStyle = fl; g.fillRect(0, N * .4, N, N * .6);
  [N * .05, N * .95].forEach(x => { g.fillStyle = grad(g, x - N * .012, 0, x + N * .012, 0, [[0, '#3a4048'], [.45, '#e8edf2'], [1, '#4a525c']]); g.fillRect(x - N * .01, N * .18, N * .02, N * .5); });
  return k;
}
function drawPipes() {
  const P = pipes, w = N * .07, now = performance.now() / 1000;
  if (!faces.pipeBg || faces.pipeBg.width !== N) faces.pipeBg = buildPipeBg();
  ctx.drawImage(faces.pipeBg, 0, 0);
  // three chutes: wide funnel mouths narrowing into pipes, with chevrons that chase downward and flare as a ball goes through
  const edges = [P.wallL, P.divs[0], P.divs[1], P.wallR];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const green = i === P.green, col = green ? '40,200,110' : '210,60,50', x = chuteX(i), fl = (P.cf && P.cf[i]) || 0;
    ctx.beginPath(); ctx.moveTo(edges[i] + N * .004, P.mouth); ctx.lineTo(edges[i + 1] - N * .004, P.mouth); ctx.lineTo(x + w / 2, N * .74); ctx.lineTo(x + w / 2, N * .8); ctx.lineTo(x - w / 2, N * .8); ctx.lineTo(x - w / 2, N * .74); ctx.closePath();
    ctx.fillStyle = grad(ctx, 0, P.mouth, 0, N * .8, [[0, `rgba(${col},${.32 + fl * .3})`], [1, `rgba(${col},${.12 + fl * .2})`]]); ctx.fill();
    ctx.strokeStyle = `rgba(${col},${.75 + fl * .25})`; ctx.lineWidth = 2 * D; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let j = 0; j < 4; j++) {
      const y = P.mouth + N * (.035 + j * .032), hw = lerp((edges[i + 1] - edges[i]) * .28, w * .32, j / 3);
      const a = (green ? .22 : .12) + (green ? .55 : .3) * Math.max(0, Math.sin(now * 5 - j * 1.3)) + fl * .8;
      ctx.strokeStyle = `rgba(${col},${Math.min(1, a) * .35})`; ctx.lineWidth = N * .016; ctx.beginPath(); ctx.moveTo(x - hw, y - N * .012); ctx.lineTo(x, y + N * .006); ctx.lineTo(x + hw, y - N * .012); ctx.stroke();
      ctx.strokeStyle = `rgba(${green ? '190,255,210' : '255,190,180'},${Math.min(1, a)})`; ctx.lineWidth = N * .005; ctx.stroke();
    }
    ctx.restore();
    ctx.font = `700 ${N * .032}px ${LABEL_FONT}`; ctx.fillStyle = green ? '#8ef0b0' : '#f08a80'; ctx.fillText(green ? '✓' : '✗', x, N * .77);
  }
  P.divs.forEach(x => { ctx.beginPath(); ctx.moveTo(x, P.mouth - N * .06); ctx.lineTo(x, P.mouth); ctx.strokeStyle = '#c9d0d6'; ctx.lineWidth = 3 * D; ctx.lineCap = 'round'; ctx.stroke(); });
  // the tube
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(c, N * .01); ctx.lineTo(c, P.top); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = w + 4 * D; ctx.stroke();
  ctx.strokeStyle = 'rgba(200,210,220,.35)'; ctx.lineWidth = w; ctx.stroke();
  // bumpers
  P.bumpers.forEach(b => {
    const gr = ctx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, b.r * .1, b.x, b.y, b.r);
    gr.addColorStop(0, b.flash > 0 ? '#fff4c0' : '#ff8a7a'); gr.addColorStop(.6, b.flash > 0 ? '#ffb347' : '#c0182c'); gr.addColorStop(1, '#5a0a12');
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = b.r * .22; ctx.strokeStyle = b.flash > 0 ? `rgba(255,240,180,${.6 + b.flash * .4})` : '#c9d0d6'; ctx.stroke();
    if (b.flash > 0) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.3 + (1 - b.flash) * .6), 0, TAU); ctx.strokeStyle = `rgba(255,220,120,${b.flash * .6})`; ctx.lineWidth = 2 * D; ctx.stroke(); }
  });
  // flippers
  P.flippers.forEach(f => {
    const tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len, t0 = N * .018, t1 = N * .009;
    const nx = -Math.sin(f.ang), ny = Math.cos(f.ang);
    ctx.beginPath(); ctx.moveTo(f.px + nx * t0, f.py + ny * t0); ctx.lineTo(tx + nx * t1, ty + ny * t1);
    ctx.arc(tx, ty, t1, f.ang + Math.PI / 2, f.ang - Math.PI / 2, true); ctx.lineTo(f.px - nx * t0, f.py - ny * t0);
    ctx.arc(f.px, f.py, t0, f.ang - Math.PI / 2, f.ang + Math.PI / 2, true); ctx.closePath();
    const g = ctx.createLinearGradient(f.px, f.py - t0, f.px, f.py + t0); g.addColorStop(0, '#fbe3a0'); g.addColorStop(1, '#b57a1c');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3d2706'; ctx.lineWidth = 1.5 * D; ctx.stroke();
    ctx.beginPath(); ctx.arc(f.px, f.py, t0 * .4, 0, TAU); ctx.fillStyle = '#eef2f6'; ctx.fill();
  });
  const gx = P.xs[P.green];
  rrect(ctx, gx - N * .14, N * .82, N * .28, N * .15, N * .02); ctx.fillStyle = 'rgba(40,170,90,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(98,212,138,.7)'; ctx.lineWidth = 2 * D; ctx.stroke();
  P.balls.forEach(b => { if (b.state === 'gone' || b.state === 'pre') return; const rr = (b.pr || P.rb) * (b.kind ? 1.2 : 1); ctx.globalAlpha = b.a; ctx.drawImage(ballImg(b), b.x - rr, b.y - rr, rr * 2, rr * 2); });
  ctx.globalAlpha = 1;
  d6.forEach(d => { if (d.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(d.x + d.z * N * .03, d.y + d.z * N * .05, N * .04, N * .03, 0, 0, TAU); ctx.fill(); } });
  d6.forEach(d => { ctx.globalAlpha = d.a ?? 1; drawDie3D(ctx, d.x, d.y - d.z * N * .02, N * .075 * (1 + d.z * .5) * d.grow, d.M); ctx.globalAlpha = 1; });
  if (chainNote) {
    ctx.font = `700 ${N * .07}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(chainNote, c, N * .14 + 2 * D); ctx.fillStyle = '#ffe9a8'; ctx.fillText(chainNote, c, N * .14);
  }
}
function flipSound() {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + .08);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
  o.connect(g); g.connect(effectsOutput()); o.start(t); o.stop(t + .11);
}
function pinStep(P, h) {
  const rb = P.rb, G = N * 1.5, play = P.balls.filter(b => b.state === 'play');
  // flippers: fire when a ball drops onto them, plus the odd random flick
  P.flippers.forEach(f => {
    f.cool -= h;
    const near = play.some(b => { const dx = b.x - f.px, dy = b.y - f.py, along = (dx * Math.cos(f.rest) + dy * Math.sin(f.rest)); return along > 0 && along < f.len && Math.abs(-dx * Math.sin(f.rest) + dy * Math.cos(f.rest)) < N * .06 && b.vy > -N * .1; });
    if (f.hold <= 0 && f.cool <= 0 && (near || Math.random() < h * .25)) { f.hold = .16; f.cool = .45 + Math.random() * .3; flipSound(); }
    const goal = f.hold > 0 ? f.up : f.rest, prev = f.ang, sp = f.hold > 0 ? 22 : 9;
    f.hold -= h;
    const d = goal - f.ang; f.ang += Math.sign(d) * Math.min(Math.abs(d), sp * h); f.w = (f.ang - prev) / h;
  });
  P.bumpers.forEach(b => b.flash = Math.max(0, b.flash - h * 3));
  play.forEach(b => {
    b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
    const sp = Math.hypot(b.vx, b.vy), cap = N * 2.4; if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
    if (b.x < P.wallL + rb) { b.x = P.wallL + rb; b.vx = Math.abs(b.vx) * .6; }
    if (b.x > P.wallR - rb) { b.x = P.wallR - rb; b.vx = -Math.abs(b.vx) * .6; }
    P.bumpers.forEach(u => {
      const dx = b.x - u.x, dy = b.y - u.y, d = Math.hypot(dx, dy), rr = rb + u.r;
      if (d < rr && d > 1e-3) {
        const nx = dx / d, ny = dy / d; b.x = u.x + nx * rr; b.y = u.y + ny * rr;
        const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
        b.vx += nx * N * .55; b.vy += ny * N * .55; u.flash = 1; tick(1.2, 2600);
      }
    });
    P.flippers.forEach(f => {
      const ex = Math.cos(f.ang) * f.len, ey = Math.sin(f.ang) * f.len, rx = b.x - f.px, ry = b.y - f.py;
      const t = Math.max(0, Math.min(1, (rx * ex + ry * ey) / (f.len * f.len))), qx = f.px + ex * t, qy = f.py + ey * t;
      const thick = lerp(N * .018, N * .009, t), dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy), rr = rb + thick;
      if (d < rr && d > 1e-3) {
        const nx = dx / d, ny = dy / d; b.x = qx + nx * rr; b.y = qy + ny * rr;
        const svx = -f.w * (qy - f.py), svy = f.w * (qx - f.px); // the flipper's own speed where it hits
        const vx = b.vx - svx, vy = b.vy - svy, vn = vx * nx + vy * ny;
        if (vn < 0) { b.vx -= 1.45 * vn * nx; b.vy -= 1.45 * vn * ny; if (-vn > N * .9) tick(.9, 1500); }
      }
    });
    P.divs.forEach(x => {
      const y0 = P.mouth - N * .06, qy = Math.max(y0, Math.min(P.mouth, b.y)), dx = b.x - x, dy = b.y - qy, d = Math.hypot(dx, dy), rr = rb + 1.5 * D;
      if (d < rr && d > 1e-3) { const nx = dx / d, ny = dy / d; b.x = x + nx * rr; b.y = qy + ny * rr; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; } }
    });
    if (b.y < P.top + rb && b.vy < 0 && Math.abs(b.x - c) > N * .05) { b.y = P.top + rb; b.vy = Math.abs(b.vy) * .5; }
  });
  for (let i = 0; i < play.length; i++) for (let j = i + 1; j < play.length; j++) {
    const a = play[i], b = play[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
    if (d2 >= 4 * rb * rb || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * rb - d) / 2;
    a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { const jn = -.9 * vn; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; }
  }
}
function runPipes() {
  return new Promise(res => {
    const P = pipes, sp = N * .7, gx = P.xs[P.green]; let last = performance.now(), el = 0;
    function f(now) {
      const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now; let busyBalls = false; el += dt;
      if (snapA > 0) snapA = Math.max(0, 1 - easeInOut(Math.min(1, el / 1.2)));
      P.balls.forEach(b => {
        if (b.state === 'pre') { // rising out of the chart's winning slot up to the mouth of the tube
          busyBalls = true;
          const u = Math.max(0, Math.min(1, (el - b.delay) / .8)), e = easeInOut(u);
          b.x = lerp(b.px, c, e) + Math.sin(u * Math.PI) * (b.px - c) * .25; b.y = lerp(b.py, N * .02, e);
          b.pr = lerp(ballR, P.rb, e);
          if (u >= 1) { b.state = 'tube'; b.pr = 0; tick(.6, 1300); }
        } else if (b.state === 'tube') {
          busyBalls = true; b.x = c; b.y += sp * dt;
          if (b.y >= P.top) { b.state = 'play'; b.vx = (Math.random() - .5) * N * .5; b.vy = sp * .6; b.born = el; }
        } else if (b.state === 'play') {
          busyBalls = true;
          // a ball that has bounced around too long gets let through
          if (el - b.born > 9) { b.vy = Math.max(b.vy, N * .4); }
          if (b.y > P.mouth) {
            b.br = b.x < P.divs[0] ? 0 : b.x < P.divs[1] ? 1 : 2;
            b.state = 'chute'; b.vy = Math.max(N * .4, b.vy * .5); tick(.7, b.br === P.green ? 2200 : 900); (P.cf || (P.cf = [0, 0, 0]))[b.br] = 1;
          }
        } else if (b.state === 'chute') {
          busyBalls = true; const x = chuteX(b.br);
          b.x = lerp(b.x, x, Math.min(1, dt * 9)); b.y += b.vy * dt;
          if (b.y > N * .8) {
            if (b.br === P.green) { const k = P.tray.length; P.tray.push(b); b.state = 'tray'; b.tx = gx + ((k % 5) - 2) * N * .045; b.ty = N * .93 - Math.floor(k / 5) * N * .04; ting(); }
            else { b.state = 'fall'; b.vy = N * .4; tick(1, 300); }
          }
        } else if (b.state === 'tray') { b.x = lerp(b.x, b.tx, .2); b.y = lerp(b.y, b.ty, .2); }
        else if (b.state === 'fall') { busyBalls = true; b.vy += N * 2 * dt; b.y += b.vy * dt; b.a = Math.max(0, b.a - dt * 1.6); if (b.a <= 0) b.state = 'gone'; }
      });
      if (P.cf) P.cf = P.cf.map(v => Math.max(0, v - dt * 1.8));
      const steps = 6; for (let s = 0; s < steps; s++) pinStep(P, dt / steps);
      draw();
      if (busyBalls) requestAnimationFrame(f); else setTimeout(res, 500);
    }
    requestAnimationFrame(f);
  });
}
async function rollD6() {
  const P = pipes;
  P.specials = P.tray.filter(b => b.kind).map(b => b.kind);
  d6 = P.tray.filter(b => !b.kind).map(b => ({ x: b.x, y: b.y, z: 0, vz: 0, vx: 0, vy: 0, M: randRot(), w: [0, 0, 0], grow: 0 }));
  await animate(600, t => { d6.forEach(d => d.grow = easeOut(t)); P.tray.forEach(b => { if (!b.kind) b.a = 1 - t; }); draw(); });
  P.tray.forEach(b => { if (!b.kind) b.state = 'gone'; });
  // gold and purple balls stay on the tray, and are still there on the farm until they hatch
  carried = P.tray.filter(b => b.kind).map(b => ({ x: b.x, y: b.y, kind: b.kind, r: (b.pr || P.rb) * 1.2, s: 1, glow: .5 }));
  tick(1.4, 900); buzz(25);
  d6.forEach(d => { const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, sp = N * (.5 + Math.random() * .6); d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp; d.vz = 2 + Math.random() * 1.2; d.w = [(Math.random() - .5) * 30, (Math.random() - .5) * 30, (Math.random() - .5) * 12]; });
  const x0 = N * .08, x1 = N * .92, y0 = N * .1, y1 = N * .92, rad = N * .045;
  let last = performance.now(), calm = 0, el = 0;
  await new Promise(res => {
    function f(now) {
      const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now; el += dt;
      for (let k = 0; k < 4; k++) {
        const h = dt / 4;
        d6.forEach(d => {
          d.vz -= 6 * h; d.z += d.vz * h; d.x += d.vx * h; d.y += d.vy * h; d.M = spinRot(d.M, d.w, h);
          if (d.z <= 0) {
            d.z = 0;
            if (d.vz < -.5) { d.vz = -d.vz * .48; d.w = d.w.map(x => x * .7 + (Math.random() - .5) * 8); tick(.9, 1400 + Math.random() * 400); }
            else d.vz = 0;
            d.vx *= .94; d.vy *= .94; d.w = d.w.map(x => x * .97);
          }
          if (d.x < x0 + rad) { d.x = x0 + rad; d.vx = Math.abs(d.vx) * .6; } if (d.x > x1 - rad) { d.x = x1 - rad; d.vx = -Math.abs(d.vx) * .6; }
          if (d.y < y0 + rad) { d.y = y0 + rad; d.vy = Math.abs(d.vy) * .6; } if (d.y > y1 - rad) { d.y = y1 - rad; d.vy = -Math.abs(d.vy) * .6; }
        });
        for (let i = 0; i < d6.length; i++) for (let j = i + 1; j < d6.length; j++) {
          const a = d6[i], b = d6[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= 4 * rad * rad || d2 < 1e-6) continue;
          const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd, ov = (2 * rad - dd) / 2;
          a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { const jn = -.8 * vn; a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny; }
        }
      }
      const still = d6.every(d => d.z === 0 && d.vz === 0 && Math.hypot(d.vx, d.vy) < N * .02 && Math.hypot(...d.w) < 1.5);
      calm = still ? calm + 1 : 0; draw();
      if (calm > 10 || el > 7) res(); else requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  });
  const from = d6.map(d => d.M), to = d6.map(d => snapRot(d.M));
  await animate(260, t => { d6.forEach((d, i) => d.M = lerpRot(from[i], to[i], easeOut(t))); draw(); });
  d6.forEach((d, i) => { d.M = to[i]; d.v = topValue(d.M); });
  d6Sum = d6.reduce((a, d) => a + d.v, 0);
  draw(); ting();
  return d6Sum;
}

// farm: the world is two screens wide, the field on the left and the farm on the right
function buildFarm() {
  const k = mk(N * 2, N), g = k.getContext('2d');
  g.fillStyle = grad(g, 0, 0, 0, N * .6, [[0, '#2a1d3a'], [.5, '#b0563a'], [1, '#f0a25a']]); g.fillRect(0, 0, N * 2, N * .6);
  g.beginPath(); g.arc(N * 1.5, N * .5, N * .1, 0, TAU); g.fillStyle = 'rgba(255,214,140,.8)'; g.fill();
  g.fillStyle = '#3d4a2a'; g.beginPath(); g.moveTo(0, N * .56);
  for (let x = 0; x <= N * 2; x += N * .1) g.lineTo(x, N * (.5 + .05 * Math.sin(x / N * 5)));
  g.lineTo(N * 2, N); g.lineTo(0, N); g.fill();
  g.fillStyle = grad(g, 0, N * .56, 0, N, [[0, '#4f7a2e'], [1, '#2e4f1c']]); g.fillRect(0, N * .58, N * 2, N * .42);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '120,170,60' : '30,60,20'},.5)`; g.fillRect(Math.random() * N * 2, N * .58 + Math.random() * N * .42, D, D * 3); }
  // barn
  const bx = N * 1.55, by = N * .3, bw = N * .34, bh = N * .3;
  g.fillStyle = '#8e2a20'; g.fillRect(bx, by, bw, bh);
  g.beginPath(); g.moveTo(bx - N * .02, by); g.lineTo(bx + bw / 2, by - N * .12); g.lineTo(bx + bw + N * .02, by); g.fillStyle = '#5a1a14'; g.fill();
  g.strokeStyle = '#f2ead6'; g.lineWidth = 3 * D; g.strokeRect(bx + bw * .3, by + bh * .35, bw * .4, bh * .65);
  g.beginPath(); g.moveTo(bx + bw * .3, by + bh * .35); g.lineTo(bx + bw * .7, by + bh); g.moveTo(bx + bw * .7, by + bh * .35); g.lineTo(bx + bw * .3, by + bh); g.stroke();
  // fence
  g.fillStyle = '#d8c7a0';
  for (let x = N * 1.02; x < N * 2; x += N * .07) g.fillRect(x, N * .55, N * .012, N * .08);
  g.fillRect(N * 1.02, N * .57, N * .98, N * .01); g.fillRect(N * 1.02, N * .6, N * .98, N * .01);
  // hay
  [[1.2, .6], [1.3, .62], [1.92, .64]].forEach(([x, y]) => { rrect(g, N * x, N * y, N * .09, N * .06, N * .015); g.fillStyle = '#d9b44a'; g.fill(); });
  // scattered corn
  for (let i = 0; i < 160; i++) { g.fillStyle = '#f1d36a'; g.fillRect(N * (1.08 + Math.random() * .84), N * (.66 + Math.random() * .3), D * 1.5, D * 1.5); }
  return k;
}
function drawChicken(g, x, y, s, dir, ph, peck, flash, kind) {
  const body = kind === 'W' ? '#f3c94a' : kind === 'B' ? '#9b5de5' : '#fbf7ee', wing = kind === 'W' ? '#c9962a' : kind === 'B' ? '#6a2fb0' : '#e6dcc6';
  g.save(); g.translate(x, y); g.scale(dir * s, s);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, .3, .32, .07, 0, 0, TAU); g.fill();
  g.strokeStyle = '#e0a030'; g.lineWidth = .06; g.lineCap = 'round'; const l = Math.sin(ph) * .12;
  g.beginPath(); g.moveTo(-.08, .05); g.lineTo(-.08 + l, .3); g.moveTo(.08, .05); g.lineTo(.08 - l, .3); g.stroke();
  if (kind) { g.save(); g.shadowColor = kind === 'W' ? 'rgba(255,215,90,.95)' : 'rgba(170,110,255,.95)'; g.shadowBlur = 14; }
  g.fillStyle = body; g.beginPath(); g.ellipse(0, -.05, .32, .24, 0, 0, TAU); g.fill();
  if (kind) g.restore();
  g.beginPath(); g.moveTo(-.26, -.1); g.lineTo(-.44, -.36); g.lineTo(-.2, -.24); g.fill();
  g.fillStyle = wing; g.beginPath(); g.ellipse(-.04, -.04, .17, .1, -.2, 0, TAU); g.fill();
  const hx = .24 + peck * .1, hy = -.3 + peck * .3;
  g.fillStyle = body; g.beginPath(); g.arc(hx, hy, .13, 0, TAU); g.fill();
  g.fillStyle = '#d62a20'; [[-.04, -.13], [.03, -.15], [.09, -.12]].forEach(([a, b]) => { g.beginPath(); g.arc(hx + a, hy + b, .05, 0, TAU); g.fill(); });
  g.beginPath(); g.ellipse(hx + .1, hy + .1, .03, .05, 0, 0, TAU); g.fill();
  g.fillStyle = '#f0a020'; g.beginPath(); g.moveTo(hx + .11, hy - .03); g.lineTo(hx + .25, hy + .01); g.lineTo(hx + .11, hy + .05); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(hx + .05, hy - .03, .022, 0, TAU); g.fill();
  if (flash) { g.globalAlpha = flash; g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(0, -.1, .55, 0, TAU); g.fill(); g.globalAlpha = 1; }
  g.restore();
}
const MARK_COLS = i => i % 2 ? ['#8e2a20', 'dark'] : ['#efe4c8', 'light'];
function markWedgeStyle(it, i) { return it.kind === 'W' ? ['#d9a628', 'light'] : it.kind === 'B' ? ['#7b3fc4', 'dark'] : it.special === 'leave' ? ['#2f7a3b', 'dark'] : it.special === 'own' ? ['#141414', 'dark'] : MARK_COLS(i); }
const chickenDrawOrder = [];
function compareChickenY(a, b) { return a.y - b.y; }
function buildMarkWheel(items) {
  const k = mk(), g = k.getContext('2d'), n = items.length, seg = TAU / n, r0 = R * .16, r1 = R * .93;
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = R * .08; g.shadowOffsetY = R * .04;
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = '#2a1a0e'; g.fill(); g.restore();
  chromeRim(g, r1, R); weather(g, r1, R, .6);
  items.forEach((it, i) => {
    const a0 = BASE + i * seg, a1 = a0 + seg, [col] = markWedgeStyle(it, i);
    wedgePath(g, a0, a1, r0, r1); g.fillStyle = col; g.fill();
    // painted-wood grain
    g.save(); g.clip(); for (let j = 0; j < 30; j++) { g.beginPath(); g.arc(c, c, lerp(r0, r1, Math.random()), a0, a1); g.strokeStyle = `rgba(0,0,0,${.05 + Math.random() * .07})`; g.lineWidth = D; g.stroke(); } g.restore();
  });
  ridges(g, n, r0, r1);
  items.forEach((it, i) => wedgeText(g, BASE + (i + .5) * seg, R * .56, it.lbl, R * (n > 10 ? .045 : .055), R * .62, markWedgeStyle(it, i)[1]));
  const dome = g.createRadialGradient(c - R * .04, c - R * .05, 0, c, c, R * .16);
  dome.addColorStop(0, '#f6e7c4'); dome.addColorStop(1, '#8a6a3a');
  g.beginPath(); g.arc(c, c, R * .16, 0, TAU); g.fillStyle = dome; g.fill();
  drawChicken(g, c - R * .01, c + R * .02, R * .2, 1, 0, 0, 0);
  return k;
}
function drawMarkWedge(i, n, x, y, sc) {
  const seg = TAU / n, a0 = BASE + i * seg, it = markItems[i], [col] = markWedgeStyle(it, i);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.arc(0, 0, R * .93, a0, a0 + seg); ctx.arc(0, 0, R * .16, a0 + seg, a0, true); ctx.closePath();
  if (it.kind) { ctx.shadowColor = it.kind === 'W' ? 'rgba(255,215,90,1)' : 'rgba(190,130,255,1)'; ctx.shadowBlur = R * .12 * sc; }
  ctx.fillStyle = col; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = it.kind ? '#fff6d8' : 'rgba(255,240,200,.8)'; ctx.lineWidth = (it.kind ? 3 : 2) * D / sc; ctx.stroke();
  ctx.restore();
}
// prize slices on the finished wheel pulse with their own light
function drawMarkGlow(now) {
  const n = markItems.length, seg = TAU / n, pulse = .55 + .45 * Math.sin(now / 260);
  ctx.save(); ctx.translate(c, c); ctx.rotate(rotM); ctx.globalCompositeOperation = 'lighter';
  markItems.forEach((it, i) => {
    if (!it.kind) return;
    const a0 = BASE + i * seg, rgb = it.kind === 'W' ? '255,205,80' : '180,110,255';
    ctx.beginPath(); ctx.arc(0, 0, R * .93, a0, a0 + seg); ctx.arc(0, 0, R * .16, a0 + seg, a0, true); ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, R * .16, 0, 0, R * .93);
    g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.6, `rgba(${rgb},${.18 * pulse})`); g.addColorStop(1, `rgba(${rgb},${.45 * pulse})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = `rgba(${rgb},1)`; ctx.shadowBlur = R * .09 * pulse; ctx.strokeStyle = `rgba(${rgb},${.6 + .4 * pulse})`; ctx.lineWidth = 3 * D; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.0, a0 + seg * .08, a0 + seg * .92); ctx.strokeStyle = `rgba(${rgb},${.5 * pulse})`; ctx.lineWidth = R * .05; ctx.stroke();
  });
  ctx.restore();
}
function drawFarm(now) {
  ctx.save(); rrect(ctx, D, D, N - 2 * D, N - 2 * D, N * .05); ctx.clip();
  ctx.drawImage(faces.farm, -camX, 0);
  const t = now / 1000;
  fires.forEach(f => {
    const a = Math.max(0, f.life), fl = .7 + .3 * Math.sin(t * 20 + f.x);
    const gr = ctx.createRadialGradient(f.x - camX, f.y, 0, f.x - camX, f.y - N * .02, N * .06 * fl);
    gr.addColorStop(0, `rgba(255,230,140,${a})`); gr.addColorStop(.5, `rgba(255,110,30,${a * .7})`); gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(f.x - camX - N * .08, f.y - N * .1, N * .16, N * .14);
  });
  if (raceLine) drawRaceLine();
  chickenDrawOrder.length = 0;
  for (let i = 0; i < chickens.length; i++) chickenDrawOrder.push(chickens[i]);
  chickenDrawOrder.sort(compareChickenY);
  for (let i = 0; i < chickenDrawOrder.length; i++) {
    const ch = chickenDrawOrder[i];
    if (!ch.alive || ch.slice || ch.pop <= .01) continue;
    if (ch.glow > 0) { const gr = ctx.createRadialGradient(ch.x - camX, ch.y - N * .01, 0, ch.x - camX, ch.y - N * .01, N * .06); gr.addColorStop(0, ch.special === 'B' ? `rgba(190,140,255,${ch.glow})` : `rgba(255,225,120,${ch.glow})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ch.x - camX, ch.y - N * .01, N * .06, 0, TAU); ctx.fill(); }
    drawChicken(ctx, ch.x - camX, ch.y, N * .055 * ch.pop, ch.dir, ch.ph, ch.peck, ch.flash || 0, ch.special);
    if (ch.tag) drawRaceTag(ch);
  }
  carried.forEach(b => {
    if (b.s <= .01) return;
    const x = b.x - camX, gl = b.glow * (.75 + .25 * Math.sin(t * 6)), gr = ctx.createRadialGradient(x, b.y, 0, x, b.y, b.r * 4);
    gr.addColorStop(0, b.kind === 'B' ? `rgba(200,140,255,${gl})` : `rgba(255,226,130,${gl})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, b.y, b.r * 4, 0, TAU); ctx.fill();
    const r = b.r * b.s; ctx.drawImage(ballImg(b), x - r, b.y - r, r * 2, r * 2);
  });
  feathers.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(p.x - camX, p.y, N * .008, N * .004, p.r, 0, TAU); ctx.fill(); });
  ctx.globalAlpha = 1;
  arrows.forEach(a => {
    if (a.p <= 0 || a.p >= 1) return;
    const x = lerp(a.sx, a.tx, a.p), y = lerp(a.sy, a.ty, a.p) - Math.sin(a.p * Math.PI) * N * .08, ang = Math.atan2(a.ty - a.sy + Math.cos(a.p * Math.PI) * -N * .25, a.tx - a.sx);
    ctx.save(); ctx.translate(x - camX, y); ctx.rotate(ang);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2 * D; ctx.beginPath(); ctx.moveTo(-N * .06, 0); ctx.lineTo(0, 0); ctx.stroke();
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, N * .03); fg.addColorStop(0, 'rgba(255,240,160,1)'); fg.addColorStop(.4, 'rgba(255,120,30,.8)'); fg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, N * .03, 0, TAU); ctx.fill();
    ctx.restore();
  });
  // forming Mark's wheel
  if (markItems.length && formT.length) {
    if (showMark < 1) formT.forEach((ft, i) => {
      if (ft.t <= 0) return; const e = easeInOut(Math.min(1, ft.t));
      drawMarkWedge(ft.idx ?? i, markItems.length, lerp(ft.x - camX, c, e), lerp(ft.y, c, e), lerp(.1, 1, e));
    });
    if (showMark > 0) {
      ctx.globalAlpha = showMark; drawScaled(faces.mark, rotM, 1); drawWheelRim(1); drawMarkGlow(now);
      drawWheelSweep(markSpinning, 1);
      if (markWin) drawWheelSliceGlow(rotM, markItems.length, markWin.i, markWin.t0);
      ctx.globalAlpha = 1; drawPointer(faces.wheat, 1);
    }
  }
  ctx.restore();
  if (chainNote) {
    ctx.font = `700 ${N * .06}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(chainNote, c, N * .1 + 2 * D); ctx.fillStyle = '#fff3d0'; ctx.fillText(chainNote, c, N * .1);
  }
}
function farmLoop(dur, fn) { // runs chicken/arrow/fire/feather updates while fn steers the phase
  return new Promise(res => {
    const t0 = performance.now(); let last = t0;
    function f(now) {
      const dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now; const el = Math.max(0, (now - t0) / 1000);
      const done = fn(dt, el);
      chickens.forEach(ch => { if (ch.pop < 1) ch.pop = Math.min(1, ch.pop + dt * 5); if (ch.glow > 0) ch.glow = Math.max(0, ch.glow - dt * 1.5); });
      fires.forEach(f => f.life -= dt * .5); fires = fires.filter(f => f.life > 0);
      feathers.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += N * .3 * dt; p.vx *= .97; p.r += dt * 4; p.life -= dt * .7; }); feathers = feathers.filter(p => p.life > 0);
      draw();
      if (done || el > dur) res(); else requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  });
}
function walkChicken(ch, dt, speed) {
  const dx = ch.tx - ch.x, dy = ch.ty - ch.y, d = Math.hypot(dx, dy);
  if (d < 2 * D) return true;
  const st = Math.min(d, speed * dt); ch.x += dx / d * st; ch.y += dy / d * st; ch.dir = dx >= 0 ? 1 : -1; ch.ph += dt * 18; ch.peck = 0;
  return false;
}
function planMarkFlights(markItems, alive, n, wheelSize) {
  const spc = alive.filter(ch => ch.special).slice(0, n), plain = alive.filter(ch => !spc.includes(ch)).slice(0, n - spc.length);
  const free = markItems.map((it, j) => j).filter(j => !markItems[j].kind);
  const sliceOf = new Map();
  spc.forEach(ch => { const j = markItems.findIndex((it, q) => it.kind === ch.special && ![...sliceOf.values()].includes(q)); sliceOf.set(ch, j); });
  plain.forEach((ch, q) => sliceOf.set(ch, free[q]));
  const fliers = [...plain, ...spc];
  const formT = fliers.map(ch => ({ x: ch.x, y: ch.y - wheelSize * .02, t: 0, idx: sliceOf.get(ch), kind: ch.special || null }));
  const startAt = fliers.map((ch, i) => i < plain.length ? i * .18 : plain.length * .18 + .6 + (i - plain.length) * 1.1);
  return { spc, fliers, formT, startAt };
}
async function markChain(steps, dest, held = { W: 0, B: 0 }) {
  const ballsIn = counts[winner];
  // 1. the winning slot's balls go up the tube and down the pipes
  $('#caption').textContent = 'Follow the green';
  const slotOf = b => Math.max(0, Math.min(FINAL.length - 1, Math.floor((b.x - B.m) / B.w)));
  const lifted = balls.filter(b => slotOf(b) === winner).sort((a, b) => a.y - b.y);
  setupPipes(lifted.length || ballsIn);
  pipes.balls.forEach((pb, i) => { const src = lifted[i]; pb.kind = src && src.kind; pb.state = 'pre'; pb.px = src ? src.x : c; pb.py = src ? src.y : N * .8; pb.pr = ballR; pb.delay = .35 + i * .32; });
  lifted.forEach(b => b.hidden = true);
  if (!snap || snap.width !== N) snap = mk();
  { const g = snap.getContext('2d'); g.clearRect(0, 0, N, N); draw(); g.drawImage(cv, 0, 0); }
  d6 = []; carried = []; chainNote = ''; scene = 'pipes'; snapA = 1;
  await runPipes();
  if (!pipes.tray.length) return { revenge: true }; // not one in the green: Phelan's revenge
  // 2. green balls become dice
  $('#caption').textContent = '';
  await wait(400);
  const sum = await rollD6();
  setVerdict({ eyebrow: 'Going deeper', title: 'Keep watching', body: 'Something is about to hatch.', steps: steps.slice(), flash: false });
  await wait(1200);
  // 3. every pip on the dice lifts off and flies down to hatch as a chicken
  dots = [];
  d6.forEach(d => {
    const top = DIE_FACES.map(f => ({ f, z: mv(d.M, f.n)[2] })).sort((a, b) => b.z - a.z)[0].f, h = N * .075 * d.grow / 2;
    const C = mv(d.M, top.n.map(k => k * h)), U = mv(d.M, top.u.map(k => k * h)), V = mv(d.M, top.v.map(k => k * h));
    PIPS[top.val].forEach(([a, b]) => dots.push({ x: d.x + C[0] + (U[0] * a + V[0] * b) * .5, y: d.y + C[1] + (U[1] * a + V[1] * b) * .5, r: N * .008, red: top.val === 1, glow: 0 }));
  });
  dots.forEach(p => { p.x0 = p.x; p.y0 = p.y; });
  $('#caption').textContent = '';
  await animate(800, t => { d6.forEach(d => d.a = 1 - t * .85); dots.forEach((p, i) => { const u = Math.min(1, t * 1.4); p.glow = u; p.y = p.y0 - easeOut(u) * N * (.04 + (i % 3) * .015); p.x = p.x0 + Math.sin(i * 2.3) * u * N * .02; }); draw(); });
  if (!faces.farm) faces.farm = buildFarm();
  if (!snap || snap.width !== N) snap = mk();
  { const g = snap.getContext('2d'); g.clearRect(0, 0, N, N); dots.forEach(p => p.hide = true); draw(); g.drawImage(cv, 0, 0); dots.forEach(p => p.hide = false); }
  d6 = []; scene = 'farm'; Music.setMode('farm'); playSfx('farm'); camX = 0; chickens = []; arrows = []; fires = []; feathers = []; markItems = []; formT = []; showMark = 0; chainNote = ''; raceLine = 0; snapA = 1; markSpinning = false; markWin = null;
  dots.forEach((p, i) => {
    p.sx = p.x; p.sy = p.y; p.delay = .1 + (i / Math.max(1, dots.length)) * .5;
    chickens.push({ x: N * (.08 + Math.random() * .84), y: N * (.64 + Math.random() * .28), dir: Math.random() < .5 ? -1 : 1, ph: 0, peck: 0, alive: true, pop: 0 });
  });
  $('#caption').textContent = 'The chickens';
  await animate(1900 + dots.length * 20, t => {
    snapA = 1 - easeInOut(Math.min(1, t * 2.2));
    dots.forEach((p, i) => {
      const ch = chickens[i], u = Math.max(0, Math.min(1, (t - p.delay) / .32)), e = easeInOut(u);
      p.x = lerp(p.sx, ch.x, e); p.y = lerp(p.sy, ch.y - N * .02, e) - Math.sin(u * Math.PI) * N * .12;
      if (u >= 1) { if (!p.done) { p.done = true; tick(.5, 900 + Math.random() * 300); } p.hide = true; ch.pop = Math.min(1, ch.pop + .12); }
    });
    chickens.forEach((ch, i) => ch.peck = Math.max(0, Math.sin(t * 20 + ch.x) * .8));
    draw();
  });
  snapA = 0; dots = []; chickens.forEach(ch => ch.pop = 1);
  const tokens = [...Array(held.W).fill('W'), ...Array(held.B).fill('B'), ...((pipes && pipes.specials) || []).map(k => k.toLowerCase())];
  if (tokens.length) { // the Wilds and ankhs you carried down here turn chickens gold and purple
    await wait(500);
    for (let i = 0; i < tokens.length; i++) { // each one hatches a brand-new chicken
      const kd = tokens[i].toUpperCase(), fromTile = tokens[i] === kd;
      const ch = { x: N * (.12 + Math.random() * .76), y: N * (.66 + Math.random() * .25), dir: Math.random() < .5 ? -1 : 1, ph: 0, peck: 0, alive: true, pop: 0, special: kd };
      chickens.push(ch);
      // the tile itself leaves its slot in the bar, arcs down onto the farm and becomes the chicken
      const ball = fromTile ? null : carried.find(b => b.kind === kd && !b.used);
      if (ball) { // the ball from the green chute bounces over to its spot and turns into the chicken
        ball.used = true; const bx = ball.x, by = ball.y; whoosh();
        await animate(1300, t => {
          const u = Math.min(1, t / .6), v = Math.max(0, (t - .6) / .4), e = easeInOut(u);
          ball.x = lerp(bx, ch.x, e); ball.y = lerp(by, ch.y - N * .03, e) - Math.sin(u * Math.PI) * N * .14;
          ball.s = 1 + Math.sin(u * Math.PI) * .5 + v * 1.2; ball.glow = .5 + .5 * u;
          if (v > 0) { ball.s *= 1 - v; ch.pop = easeOut(v); ch.glow = 1 - v * .6; }
          draw();
        });
        ball.s = 0; ch.pop = 1; ch.glow = 0; ting(); buzz(30);
        continue;
      }
      const tile = fromTile ? [...wildTiles].filter((k, j) => (kd === 'W' ? j < 3 : j >= 3) && k.classList.contains('lit')).pop() : null;
      let fly = null, f0 = null, f1 = null;
      if (tile) {
        const tr = tile.getBoundingClientRect(), cr = cv.getBoundingClientRect(), sz = tr.width;
        fly = document.createElement('canvas'); fly.width = fly.height = 96; fly.getContext('2d').drawImage(tile, 0, 0);
        fly.style.cssText = `position:fixed;left:0;top:0;width:${sz}px;height:${sz}px;border-radius:9px;z-index:20;pointer-events:none;box-shadow:0 0 22px ${tokens[i] === 'W' ? 'rgba(240,190,90,.8)' : 'rgba(155,93,229,.8)'}`;
        f0 = [tr.left, tr.top]; f1 = [cr.left + (ch.x - camX) / N * cr.width - sz / 2, cr.top + (ch.y - N * .03) / N * cr.height - sz / 2];
        fly.style.transform = `translate(${f0[0]}px,${f0[1]}px)`;
        document.body.appendChild(fly);
        tile.classList.remove('lit'); tile.classList.add('gone'); whoosh();
      }
      await animate(fly ? 1300 : 480, t => {
        const u = fly ? Math.min(1, t / .62) : 1, v = fly ? Math.max(0, (t - .62) / .38) : t;
        if (fly) {
          const e = easeInOut(u), x = lerp(f0[0], f1[0], e), y = lerp(f0[1], f1[1], e) - Math.sin(u * Math.PI) * 120;
          fly.style.transform = `translate(${x}px,${y}px) rotate(${u * 540}deg) scale(${1 - v * .7})`;
          fly.style.opacity = String(1 - v);
          if (u >= 1 && !ch.landed) { ch.landed = true; ch.glow = 1; }
        }
        if (!fly || u >= 1) { ch.pop = easeOut(v); ch.glow = 1 - v; }
        draw();
      });
      if (fly) fly.remove();
      ch.pop = 1; ch.glow = 0; ting(); buzz(30);
    }
    setVerdict({ eyebrow: 'Going deeper', title: 'Special chickens', body: 'Gold and purple ones can’t be touched.', steps: steps.slice(), flash: false });
    await wait(700);
  }
  await farmLoop(.6, () => {});
  $('#caption').textContent = 'Fire arrows';
  const nArrows = Math.max(1, Math.round(sum * .6));
  for (let i = 0; i < nArrows; i++) {
    const aim = Math.random() < .65 && chickens.length ? pick(chickens) : null;
    const tx = aim ? aim.x + (Math.random() - .5) * N * .03 : N * (.08 + Math.random() * .84), ty = aim ? aim.y : N * (.64 + Math.random() * .28);
    arrows.push({ tx, ty, sx: tx - N * .4, sy: -N * .1, delay: i * .22 + Math.random() * .15, p: 0, hit: false });
  }
  await farmLoop(nArrows * .22 + 2.2, (dt, el) => {
    arrows.forEach(a => {
      if (el < a.delay) return;
      if (a.p === 0) whoosh(false);
      a.p = Math.min(1, a.p + dt / .65);
      if (a.p >= 1 && !a.hit) {
        a.hit = true; fires.push({ x: a.tx, y: a.ty, life: 1 }); tick(1.2, 220); buzz(15);
        chickens.forEach(ch => {
          if (ch.alive && ch.special && Math.hypot(ch.x - a.tx, (ch.y - a.ty) * 1.4) < N * .05) { ch.glow = 1; }
          else if (ch.alive && Math.hypot(ch.x - a.tx, (ch.y - a.ty) * 1.4) < N * .05) {
            ch.alive = false;
            for (let k = 0; k < 12; k++) feathers.push({ x: ch.x, y: ch.y - N * .02, vx: (Math.random() - .5) * N * .5, vy: -Math.random() * N * .4, r: Math.random() * 3, life: 1, col: Math.random() < .3 ? '#e0a030' : '#fbf7ee' });
          }
        });
      }
    });
    chickens.forEach(ch => { if (ch.alive) ch.peck = Math.max(0, Math.sin(el * 8 + ch.x) * .6); });
  });
  let alive = chickens.filter(ch => ch.alive);
  setVerdict({ eyebrow: 'Going deeper', title: alive.length ? 'Some made it' : 'None of them made it', body: alive.length ? 'They head for the farm.' : 'The fire got every one.', steps: steps.slice(), flash: false });
  if (!alive.length) {
    await wait(1500);
    return LEAVE;
  }
  // 4. march to the farm, then peck about
  $('#caption').textContent = 'Off to the farm';
  alive.forEach((ch, i) => { ch.tx = N * (1.08 + Math.random() * .84); ch.ty = N * (.66 + Math.random() * .27); });
  const cam0 = camX;
  await farmLoop(5.5, (dt, el) => {
    camX = lerp(cam0, N, easeInOut(Math.min(1, el / 3.6)));
    let all = true; alive.forEach(ch => { if (!walkChicken(ch, dt, N * .32)) all = false; });
    if (Math.random() < .05) tick(.3, 1000);
    return all && el > 3.6;
  });
  $('#caption').textContent = 'Pecking';
  alive.forEach(ch => { ch.tx = ch.x; ch.ty = ch.y; ch.wait = Math.random(); });
  await farmLoop(4.5, (dt, el) => {
    alive.forEach(ch => {
      if (ch.wait > 0) { ch.wait -= dt; ch.peck = Math.abs(Math.sin(el * 14 + ch.x)) ; return; }
      if (walkChicken(ch, dt, N * .12)) { ch.wait = .4 + Math.random() * .9; ch.tx = Math.max(N * 1.06, Math.min(N * 1.94, ch.x + (Math.random() - .5) * N * .3)); ch.ty = Math.max(N * .65, Math.min(N * .94, ch.y + (Math.random() - .5) * N * .15)); }
    });
  });
  if (Math.random() < RACE_CHANCE) return await chickenRace(steps, alive);
  // 5. chickens become slices and fly up into Mark's wheel
  const n = Math.min(alive.length, 16);
  // questions about where the chart sent you come first, then the general ones
  const pool = [...(MARK_BY_DEST[dest.t] || []).sort(() => Math.random() - .5), ...[...MARK_QS].sort(() => Math.random() - .5)];
  const specials = alive.filter(ch => ch.special).slice(0, n).map(ch => ch.special);
  const base = n - specials.length >= 2 ? [LEAVE, OWNWAY] : n - specials.length === 1 ? [pick([LEAVE, OWNWAY])] : [];
  const prizes = specials.map(k => { const q = pool.shift(), v = k === 'W' ? 10 : 5; return { lbl: [`€${$m(v)}`, ...q.lbl.slice(0, 2)].slice(0, 3), t: q.t, b: `${k === 'W' ? 'A gold' : 'A purple'} chicken made it: €${$m(v)} if Mark answers properly.`, prize: v, kind: k }; });
  let items = [...prizes, ...base];
  while (items.length < n) items.push(pool.shift());
  if (!items.length) items = [pick([LEAVE, OWNWAY, pool[0]])];
  markItems = items.sort(() => Math.random() - .5);
  faces.mark = buildMarkWheel(markItems);
  // each chicken becomes its own slice: a gold or purple chicken turns into its prize slice, plain ones into the rest
  const { spc, fliers, formT: flights, startAt } = planMarkFlights(markItems, alive, n, N); // special chickens go last, slowly, so you see them turn
  formT = flights;
  $('#caption').textContent = "Mark's wheel";
  setVerdict({ eyebrow: "Mark's wheel", title: 'Mark’s wheel', body: 'Every surviving chicken becomes a slice.', steps: steps.slice(), flash: false });
  await farmLoop(n * .18 + spc.length * 1.1 + 3, (dt, el) => {
    fliers.forEach((ch, i) => {
      const st = startAt[i]; if (el < st) return;
      if (!ch.slice) {
        if (ch.special) { ch.glow = Math.min(1, (el - st) * 2); ch.flash = Math.max(0, (el - st) * 2 - 1) * .6; if (el - st >= .7) { ch.slice = true; ting(); buzz(40); } }
        else { ch.flash = Math.min(1, (el - st) * 4); if (ch.flash >= 1) { ch.slice = true; tick(.8, 1800 + i * 60); } }
      }
      else formT[i].t = Math.min(1, formT[i].t + dt / (ch.special ? 1.3 : .9));
    });
    return formT.every(f => f.t >= 1);
  });
  await animate(500, t => { showMark = t; draw(); });
  ting(); Music.sting(2);
  await wait(700);
  // 6. spin it
  const tg = target(markItems.length), s0 = rotM, e0 = rotM + 6 * TAU + mod(-tg.a - rotM, TAU);
  let lastS = sliceAt(s0, markItems.length);
  markSpinning = true;
  await farmLoop(8, (dt, el) => {
    const p = Math.min(1, el / 7.5); rotM = s0 + (e0 - s0) * easeOut(p);
    const sl = sliceAt(rotM, markItems.length); if (sl !== lastS) { lastS = sl; tick(1, 1500); flap(1); }
    return p >= 1;
  });
  rotM = mod(rotM, TAU); markSpinning = false; markWin = { i: tg.i, t0: performance.now() }; ting(); buzz([40, 50, 80]);
  return markItems[tg.i];
}
