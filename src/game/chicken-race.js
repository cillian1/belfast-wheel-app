// ---------- Chicken Race: 1 in 4 farm runs, the survivors dance, then race for the prizes on their tags ----------
// Owns Chicken Race drawing, timing, and winner selection.
const RACE_CHANCE = .25, RACE_MAX = 8, RACE_T = 6;
const RACE_NAMES = ['Clucky', 'Nugget', 'Henrietta', 'Peggy', 'Drumstick', 'Eggbert', 'Feathers', 'Big Bertha', 'Colonel', 'Scrambles', 'Goldie', 'Penny'];
const racePay = v => typeof $m === 'function' ? $m(v) : v;
function drawRaceLine() {
  const x = raceLine - camX, sq = N * .018, y0 = N * .58, y1 = N * .97;
  for (let y = y0, j = 0; y < y1; y += sq, j++) for (let q = 0; q < 2; q++) { ctx.fillStyle = (j + q) % 2 ? '#111' : '#f4f0e4'; ctx.fillRect(x + q * sq - sq, y, sq, Math.min(sq, y1 - y)); }
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - sq * 1.3, y0 - N * .06, sq * .3, N * .06); ctx.fillRect(x + sq * 1, y0 - N * .06, sq * .3, N * .06);
  ctx.fillStyle = '#d62a20'; ctx.fillRect(x - sq * 1.3, y0 - N * .065, sq * 2.6, N * .022);
  ctx.font = `800 ${N * .016}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff3d0'; ctx.fillText('FINISH', x, y0 - N * .054);
}
function drawRaceTag(ch) {
  const tg = ch.tag; if (!tg || !(tg.a > 0)) return;
  const w = N * (tg.special ? .145 : .1), h = N * .034, x = ch.x - camX - N * .045 - w / 2, y = ch.y - N * .035, sc = 1 + (ch.won || 0) * .3;
  const spc = tg.special === 'W' ? '#ffd76a' : '#c9a0ff';
  ctx.save(); ctx.globalAlpha = tg.a; ctx.translate(x + w / 2, y); ctx.scale(sc, sc);
  if (ch.won) { ctx.shadowColor = 'rgba(255,215,90,1)'; ctx.shadowBlur = N * .03; }
  rrect(ctx, -w / 2, -h / 2, w, h, h * .4);
  ctx.fillStyle = tg.big ? '#d9a21b' : 'rgba(30,20,10,.85)'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = (tg.special ? 2.5 : 1.5) * D; ctx.strokeStyle = tg.special ? spc : 'rgba(255,240,200,.7)'; ctx.stroke();
  ctx.font = `800 ${N * .022}px ${LABEL_FONT}`; ctx.textBaseline = 'middle';
  const txt = `€${racePay(tg.v)}`;
  if (tg.special) {
    ctx.textAlign = 'left'; ctx.fillStyle = tg.big ? '#2a1a05' : '#fff3d0'; ctx.fillText(txt, -w / 2 + N * .01, D);
    ctx.font = `800 ${N * .016}px ${LABEL_FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = tg.big ? '#2a1a05' : spc; ctx.fillText('1.5×', w / 2 - N * .01, D);
  } else { ctx.textAlign = 'center'; ctx.fillStyle = tg.big ? '#2a1a05' : '#fff3d0'; ctx.fillText(txt, 0, D); }
  ctx.restore();
}
async function chickenRace(steps, alive) {
  Music.setMode('race');
  const racers = [...alive.filter(ch => ch.special), ...alive.filter(ch => !ch.special)].slice(0, RACE_MAX), rest = alive.filter(ch => !racers.includes(ch));
  const names = [...RACE_NAMES].sort(() => Math.random() - .5);
  const vals = [5, 8, 10, 12, 15, 20, 25, 30].sort(() => Math.random() - .5), bigAt = Math.floor(Math.random() * racers.length);
  racers.forEach((ch, i) => {
    const base = i === bigAt ? pick([80, 100, 120]) : vals[i % vals.length];
    ch.name = names[i % names.length];
    ch.tag = { v: ch.special ? Math.round(base * 1.5) : base, big: i === bigAt, special: ch.special || null, a: 0 };
  });
  setVerdict({ eyebrow: 'Something’s up', title: 'Chicken Race', body: 'The chickens won’t sit still.', steps: steps.slice(), flash: true });
  $('#caption').textContent = 'Chicken Race';
  playSfx('farm'); Music.sting(2); buzz([30, 40, 30, 40, 60]);
  // 1. they dance; the ones who don't make the line-up wander off
  rest.forEach(ch => { ch.tx = N * 2.3; ch.ty = ch.y; });
  racers.forEach(ch => { ch.by = ch.y; });
  await farmLoop(2.4, (dt, el) => {
    racers.forEach((ch, i) => {
      const b = el * 9 + i * 1.3; ch.y = ch.by - Math.abs(Math.sin(b)) * N * .02; ch.peck = Math.max(0, Math.sin(b * 2)) * .6;
      ch.dir = Math.sin(el * 3.5 + i) > 0 ? 1 : -1; ch.ph += dt * 10;
      if (Math.random() < .02) ch.glow = .5;
    });
    rest.forEach(ch => walkChicken(ch, dt, N * .45));
    if (Math.random() < .08) tick(.4, 1200 + Math.random() * 800);
  });
  rest.forEach(ch => ch.alive = false);
  // 2. into the lanes, tags up
  const startX = N * 1.22; raceLine = N * 1.84;
  const lanes = racers.map((ch, i) => N * (.63 + (racers.length > 1 ? i / (racers.length - 1) : .5) * .32));
  [...racers].sort((a, b) => a.y - b.y).forEach((ch, i) => { ch.tx = startX; ch.ty = lanes[i]; });
  setVerdict({ eyebrow: 'Chicken Race', title: 'Take your marks', body: 'Each chicken carries its prize. The winner’s is yours.', steps: steps.slice(), flash: false });
  await farmLoop(3, (dt, el) => {
    let all = true; racers.forEach(ch => { if (!walkChicken(ch, dt, N * .4)) all = false; });
    return all && el > .8;
  });
  racers.forEach(ch => { ch.dir = 1; ch.peck = 0; });
  await farmLoop(1.2, (dt, el) => { racers.forEach((ch, i) => { const u = Math.max(0, Math.min(1, (el - i * .1) * 3)); if (ch.tag.a < 1 && u >= 1) tick(.6, 1600 + i * 80); ch.tag.a = u; }); });
  for (const n of ['3', '2', '1']) { chainNote = n; playSfx('countdown'); tick(1, 900); buzz(20); await farmLoop(.7, () => {}); }
  chainNote = 'Go!'; playSfx('go'); ting(); buzz(50);
  // 3. the race: the winner's finish time is fixed; Ghost Phelan sometimes trips a faster chicken near the line
  const w = Math.floor(Math.random() * racers.length), win = racers[w];
  const others = racers.filter(ch => ch !== win), decoy = others.length && Math.random() < .35 ? pick(others) : null;
  racers.forEach(ch => { ch.T = ch === win ? RACE_T : ch === decoy ? RACE_T - .55 : RACE_T + .25 + Math.random() * 1.1; ch.wob = Math.random() * TAU; ch.p = 0; ch.done = false; });
  const tripP = .88, tripAt = decoy ? tripP * decoy.T : 99, STUN = 1.3;
  let leaderNoted = null;
  await farmLoop(RACE_T + 3.5, (dt, el) => {
    if (el > .9 && chainNote === 'Go!') chainNote = '';
    racers.forEach(ch => {
      let p;
      if (ch === decoy && el >= tripAt) {
        p = el < tripAt + STUN ? tripP : Math.min(1, tripP + (el - tripAt - STUN) / ch.T);
        if (!ch.tripped) {
          ch.tripped = true; ch.flash = .8; ghostSay = 'Whoops'; phelanSay(ghostSay); playSfx('trip'); whoosh(); buzz([40, 30, 80]);
          for (let k = 0; k < 14; k++) feathers.push({ x: ch.x, y: ch.y - N * .02, vx: (Math.random() - .5) * N * .5, vy: -Math.random() * N * .4, r: Math.random() * 3, life: 1, col: ch.special === 'W' ? '#f3c94a' : ch.special === 'B' ? '#9b5de5' : '#fbf7ee' });
        }
        if (el < tripAt + STUN) { ch.peck = .9; ch.dir = Math.sin(el * 14) > 0 ? 1 : -1; ch.flash = Math.max(0, (ch.flash || 0) - dt); }
        else { ch.dir = 1; ch.flash = 0; }
      } else {
        const u = Math.min(1, el / ch.T);
        p = u + .035 * Math.sin(u * Math.PI) * Math.sin(el * 2.4 + ch.wob);
      }
      p = Math.max(ch.p, Math.min(1, p));
      if (!(ch === decoy && el >= tripAt && el < tripAt + STUN)) ch.ph += dt * (p < 1 ? 22 : 4);
      ch.p = p; ch.x = lerp(startX, raceLine, p);
      if (ch.done) { ch.post = (ch.post || 0) + dt; ch.x = raceLine + N * .07 * (1 - Math.exp(-ch.post * 2.5)); } // they run on past the line and slow down
      if (p >= 1 && !ch.done) { ch.done = true; if (ch === win) { playSfx('finish'); ting(); buzz([40, 50, 80]); chainNote = `${ch.name} wins!`; ch.glow = 1; ch.won = 1; } else tick(.8, 1400); }
    });
    // the ghost drifts in over the chicken he's about to trip, then floats off
    if (decoy) {
      const gx = decoy.x - camX, gy = decoy.y - N * .14, t0 = tripAt - 1;
      if (el >= t0 && el < tripAt + 1.6) {
        if (!ghost) ghost = { x: N * 1.15, y: gy, a: 0, side: 1 };
        if (el < tripAt) { const e = easeOut((el - t0) / 1); ghost.x = lerp(N * 1.15, gx + N * .04, e); ghost.y = gy; ghost.a = Math.min(1, e * 2); }
        else { const e = (el - tripAt) / 1.6; ghost.x = gx + N * .04 - e * N * .2; ghost.y = gy - e * N * .1; ghost.a = 1 - e; }
      } else if (ghost && el >= tripAt + 1.6) { ghost = null; ghostSay = ''; }
    }
    const lead = racers.reduce((a, b) => b.p > a.p ? b : a);
    if (lead !== leaderNoted && el > 1 && el < RACE_T - .3 && !win.done) { leaderNoted = lead; $('#caption').textContent = `${lead.name} leads`; }
    return racers.every(ch => ch.done) && el > RACE_T + .6;
  });
  ghost = null; ghostSay = '';
  win.glow = 1; $('#caption').textContent = `${win.name} wins`;
  await farmLoop(1.6, (dt, el) => { win.y = win.ty - Math.abs(Math.sin(el * 8)) * N * .025; win.peck = Math.max(0, Math.sin(el * 16)) * .6; win.glow = Math.max(win.glow, .6); });
  const v = win.tag.v;
  return {
    t: `Chicken Race: ${win.name} wins`,
    b: `${win.special ? (win.special === 'W' ? 'A gold' : 'A purple') + ' chicken, 1.5× on the tag. ' : ''}${decoy ? `Ghost Phelan tripped ${decoy.name} at the line. ` : ''}${win.name} carried €${racePay(v)}.`,
    prize: v, race: true, name: win.name,
  };
}
