// ---------- UI ----------
const spinBtn = $('#spinBtn'), plate = $('#verdict');
function setVerdict({ eyebrow = 'The wheel says', title, body = '', steps = null, q = null, show = false, photo = false, flash = true }) {
  $('#vEyebrow').textContent = eyebrow; $('#vTitle').textContent = title;
  $('#vBody').textContent = body; $('#vBody').hidden = !body;
  const ol = $('#vSteps'); ol.innerHTML = '';
  if (steps && steps.length) {
    ol.hidden = false;
    steps.forEach(s => { const li = document.createElement('li'); li.textContent = s.text; if (s.dest) li.className = 'dest'; ol.appendChild(li); });
  } else ol.hidden = true;
  $('#vObj').hidden = !q; if (q) $('#oQuote').textContent = q;
  $('#showActions').hidden = !show; $('#photoActions').hidden = !photo;
  if (plate.classList.contains('need') !== (show || photo)) { plate.classList.toggle('need', show || photo); fitStage(); }
  if (flash) { plate.classList.remove('landed'); void plate.offsetWidth; plate.classList.add('landed'); }
}
function setBtn(text, disabled) { spinBtn.textContent = text; spinBtn.disabled = disabled; }

async function backToMain() {
  winGlow = null; ghost = null; ghostSay = ''; doorPick = null; tapPick = null; $('.stage').classList.remove('pick');
  hideFinal(); sayLast = null; try { speechSynthesis.cancel(); } catch (e) {}
  if (scene !== 'nested' && scene !== 'photo') {
    // the room keeps drawing while it fades out, so its state is only cleared once the main wheel is back
    try { await fadeTo(1, 400); } catch (e) { fade = 1; }
    pyr = null; god = null; zena = null; roul = null; vault = null; clearSpecialDice();
    Music.setLevel(0); Music.setMode('egypt'); Music.duck(1);
    scene = 'nested'; pickIdx = -1; prize = null; bingo = []; zoom = 1 / Math.pow(S, DEPTH); balls = []; counts = null; winner = -1; flatT = 0; banner = '';
    await fadeTo(0, 350);
  }
  if (zoom !== 1) await zoomTo(1, 1500);
  if (DEPTH !== MAXD - 1) { DEPTH = MAXD - 1; navCache = null; draw(); }
}

async function runMain() {
  setBtn('Wheels turning', true);
  Music.setLevel(0); Music.setMode('egypt'); Music.duck(1); setWilds(0); clearSpecialDice();
  for (let k = 1; k <= DEPTH; k++) if (runOrders[k - 1].join() !== BASE_ORDERS[k - 1].join()) setLayerOrder(k, BASE_ORDERS[k - 1]);
  if (deadA.some(v => v) || deadTo.some(v => v)) { deadA.fill(0); deadTo.fill(''); deadFrom.fill(''); draw(); }
  const i0 = await spinLayer(0, 7500, 1);
  const slice = MAIN[i0];
  if (slice.show) {
    setVerdict({ eyebrow: 'Show me · just for fun, no prize', title: 'Show me', body: "Face forward and take one picture of what’s in front of you. The wheel decides what happens to it. Wherever it lands, that’s where you’re walking.", q: quote(), show: true });
    logMove('Show me');
    return;
  }
  if (!slice.deep) {
    const r = slice.go();
    setVerdict({ eyebrow: 'Final answer', title: r.t, body: r.b, q: quote() });
    speak(['Final answer', r.t, r.b]);
    logMove(r.t);
    return;
  }
  // Go deeper: three move wheels, ten dice, the ball drop
  const steps = []; let wilds = 0, bonus = 0;
  setVerdict({ eyebrow: 'The wheel says', title: 'Go deeper', body: 'Hold on.' });
  let wMiss = 0, bMiss = 0, ups = 0, godHit = false;
  if (Math.random() < GOLDEN_CHANCE) await goldenRun();
  else if (store.get('hope', false)) { store.set('hope', false); await wait(400); await boostRun('W', 0); }
  for (let k = 1; k <= DEPTH; k++) {
    await wait(450);
    $('#caption').textContent = '';
    await dive(1 / Math.pow(S, k));
    const idx = await spinLayer(k, 4300, k % 2 ? -1 : 1);
    const it = (deadTo[k] ? DEAD_LAYERS[deadTo[k]] : LAYERS)[k][idx];
    const wildLive = wMiss < 2, bonusLive = bMiss < 2;
    if (it.up) { // back out one wheel and spin that one again; everything collected stays
      if (it.wild || it.bonus) { // the hybrid ones pay out first
        if (it.wild) wilds++; else bonus++;
        buzz([20, 30, 20, 30, 80]); Music.sting(Math.max(wilds, bonus)); Music.setLevel(Math.max(wilds, bonus));
        steps.push({ text: cap(it.go()) }); setTiles(wilds, bonus);
      }
      if (ups++ < 3) {
        setVerdict({ eyebrow: 'Going deeper', title: it.wild ? 'Wild, go back up' : it.bonus ? 'Bonus, go back up' : 'Go back up', body: '', steps: steps.slice(), flash: true });
        Music.sting(1); buzz([30, 30, 30]); await wait(500);
        await dive(1 / Math.pow(S, k - 1));
        k -= 2; continue;
      }
      continue;
    }
    if (it.even) { // Go even deeper: a fifth wheel rises out of the dice well, and the well sinks into its centre (not a direction, so not a step)
      if (DEPTH < MAXD) {
        setVerdict({ eyebrow: 'Going deeper', title: 'Go even deeper', body: 'There is another wheel under this one.', steps: steps.slice(), flash: true });
        $('#caption').textContent = 'Even deeper'; Music.sting(4); buzz([60, 40, 60, 40, 200]); whoosh(true);
        DEPTH = MAXD; evenA = 0; navCache = null;
        await animate(1500, t => { evenA = easeInOut(t); draw(); const f = Math.sin(t * Math.PI) * .35; ctx.fillStyle = `rgba(150,170,255,${f})`; ctx.fillRect(0, 0, N, N); });
        evenA = 1; draw();
      }
      continue;
    }
    if (it.boost) {
      await boostRun(it.boost, k);
      steps.push({ text: cap(it.go()) });
      continue;
    }
    if (it.wild) { wilds++; buzz([20, 30, 20, 30, 80]); Music.sting(wilds); Music.setLevel(wilds); }
    else if (wildLive) wMiss++;
    if (it.bonus) { bonus++; buzz([20, 30, 20, 30, 80]); Music.sting(bonus); Music.setLevel(Math.max(wilds, bonus)); }
    else if (bonusLive) bMiss++;
    if (it.god) { // only on the last wheel now: it opens Phelan's shop once the wheels are done
      godHit = true; Music.sting(4); buzz([60, 40, 60, 40, 200]);
      await animate(700, t => { draw(); ctx.fillStyle = `rgba(255,250,225,${Math.sin(t * Math.PI) * .8})`; ctx.fillRect(0, 0, N, N); });
      setVerdict({ eyebrow: 'Going deeper', title: 'The God slice', body: '', steps: steps.slice(), flash: true });
      $('#caption').textContent = 'Something cold is waiting';
      continue;
    }
    steps.push({ text: cap(it.go()) });
    setTiles(wilds, bonus);
    // a full set never ends the run early: every wheel still spins, and the rooms only open after the last one
    if ((it.wild && wilds === 3) || (it.bonus && bonus === 3)) {
      setVerdict({ eyebrow: 'Going deeper', title: it.wild ? 'Three wilds' : 'Three ankhs', body: '', steps: steps.slice(), flash: true });
      $('#caption').textContent = wilds >= 3 && bonus >= 3 ? 'All six' : it.wild ? 'The Wild room is open' : 'The Bonus room is open';
      continue;
    }
    if ((it.wild && wilds > 3) || (it.bonus && bonus > 3)) {
      setVerdict({ eyebrow: 'Going deeper', title: it.wild ? 'An extra Wild' : 'An extra ankh', body: '', steps: steps.slice(), flash: true });
      $('#caption').textContent = 'Extras carry into the bonus rooms';
      continue;
    }
    // Wilds and ankhs never grey out: any you collect without reaching three become special chickens
    setVerdict({ eyebrow: 'Going deeper', title: it.wild ? 'Wild' : it.bonus ? 'Bonus' : steps[steps.length - 1].text, body: k < DEPTH ? '' : 'Something is waking up underneath.', steps: steps.slice(), flash: it.wild || it.bonus });
  }
  if (wilds >= 3 && bonus >= 3) { await pyramidRun(steps); return; }
  if (godHit) {
    await godRoom(steps);
    // a full set you were holding still gets its room once Phelan's shop is done
    if (wilds >= 3 || bonus >= 3) {
      await wait(5000);
      try { speechSynthesis.cancel(); } catch (e) {}
      hideFinal(); ghost = null; ghostSay = '';
      if (window.wolNextRoom) wolNextRoom(); // the next room's prize is paid on top of the God room's
      setVerdict({ eyebrow: 'Not finished', title: wilds >= 3 ? 'Your Wilds are still lit' : 'Your ankhs are still lit', body: '', steps: steps.slice(), flash: true });
      $('#caption').textContent = wilds >= 3 ? 'The Wild room is still open' : 'The Bonus room is still open';
      Music.sting(3); buzz([60, 40, 60, 40, 200]);
      await wait(1800);
      god = null;
      if (wilds >= 3) await bonusRun(steps, wilds, bonus); else await monsterRun(steps, wilds, bonus);
    }
    return;
  }
  if (wilds >= 3) { await bonusRun(steps, wilds, bonus); return; }
  if (bonus >= 3) { await monsterRun(steps, wilds, bonus); return; }
  await wait(500);
  $('#caption').textContent = '';
  dice.forEach(d => { d.glow = 0; d.toBall = false; });
  // the special dice drop into the well now: one per Wild and ankh you're holding
  const spec = addSpecialDice([...Array(wilds).fill('W'), ...Array(bonus).fill('B')]);
  if (spec.length) {
    $('#caption').textContent = [wilds && `${wilds} gold ${wilds > 1 ? 'dice' : 'die'}`, bonus && `${bonus} purple ${bonus > 1 ? 'dice' : 'die'}`].filter(Boolean).join(' and ');
    setTiles(wilds, bonus); liveK = DEPTH;
    try { for (const d of spec) { Music.sting(1); tick(1.2, 1800); buzz(20); await animate(450, t => { d.born = easeOut(t); d.glow = Math.sin(t * Math.PI) * .9; draw(); }); d.born = 1; d.glow = 0; } } finally { liveK = -1; }
    await wait(350);
  }
  const total = await rollDice();
  // the gold and purple dice: their coloured face adds a Wild or an ankh, which can still open a room (or the Pyramid)
  const hits = dice.filter(d => d.sp && d.v === 6);
  for (const d of hits) {
    if (d.sp === 'W') wilds++; else bonus++;
    setTiles(wilds, bonus); Music.sting(Math.max(wilds, bonus)); buzz([20, 30, 20, 30, 80]);
    setVerdict({ eyebrow: 'Going deeper', title: d.sp === 'W' ? 'The gold die' : 'The purple die', body: '', steps: steps.slice(), flash: true });
    $('#caption').textContent = d.sp === 'W' ? 'A Wild from the dice' : 'An ankh from the dice';
    await animate(900, t => { d.glow = Math.sin(t * Math.PI) * .6 + .4; draw(); });
  }
  if (hits.length) {
    await wait(500);
    if (wilds >= 3 && bonus >= 3) { await pyramidRun(steps); return; }
    if (wilds >= 3) { await bonusRun(steps, wilds, bonus); return; }
    if (bonus >= 3) { await monsterRun(steps, wilds, bonus); return; }
    // nothing opened: the Wild or ankh stays in your collection (it becomes a chicken later) and the die also rides the plinko as a gold or purple ball
    hits.forEach(d => { d.toBall = true; });
    $('#caption').textContent = '';
  }
  setVerdict({ eyebrow: 'Going deeper', title: 'Keep watching', body: 'It isn’t finished with you yet.', steps: steps.slice() });
  await burstDice();
  // the balls leave the dice well and pour straight onto the board, no wheel and no blackout
  dealFinal(); buildBoard();
  rotF = 0; flatT = 1; counts = null; winner = -1; banner = '';
  const total2 = wellBalls.length || total;
  ballR = Math.max(N * .011, Math.min(N * .019, N * .017 * Math.sqrt(42 / total2)));
  balls = wellBalls.map(b => ({
    hold: true, free: false, wx: b.x, wy: b.y, x: 0, y: 0, vx: 0, vy: 0, kind: b.kind,
    hx: c + (Math.random() - .5) * N * .62, hy: N * (.07 + Math.random() * .17), lift: N * (.08 + Math.random() * .16), d: Math.random() * .35,
  }));
  wellBalls = [];
  whoosh(true);
  // dive into the dice circle: it swells to fill the screen and the plinko board is what's inside it
  const z0 = zoom, grow = (N * .75) / (R * .5 * Math.pow(S, DEPTH) * z0);
  await animate(2000, t => {
    const e = easeInOut(t); zoom = z0 * Math.pow(grow, e);
    const sc = Math.pow(S, DEPTH) * zoom, wr = R * .5 * sc;
    draw();
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, wr, 0, TAU); ctx.clip();
    ctx.globalAlpha = Math.min(1, e * 1.6); ctx.drawImage(faces.boardBg, 0, 0); ctx.drawImage(faces.board, 0, 0); ctx.globalAlpha = 1;
    ctx.restore();
    if (wr < N * .72) { ctx.beginPath(); ctx.arc(c, c, wr, 0, TAU); ctx.strokeStyle = `rgba(220,230,240,${.5 * (1 - e)})`; ctx.lineWidth = 3 * D; ctx.stroke(); }
    balls.forEach(b => {
      const u = easeInOut(Math.max(0, Math.min(1, (t - .15 - b.d * .6) / .7))), sx = c + b.wx * R * sc, sy = c + b.wy * R * sc;
      b.x = lerp(sx, b.hx, u); b.y = lerp(sy, b.hy, u) - Math.sin(u * Math.PI) * b.lift;
      const r = lerp(Math.min(R * .028 * sc, ballR * 2.2), ballR, u) * (b.kind ? 1.2 : 1);
      ctx.drawImage(ballImg(b), b.x - r, b.y - r, r * 2, r * 2);
    });
  });
  scene = 'final';
  wellBalls = []; dice.forEach(d => { d.gone = false; d.label = 0; d.glow = 0; d.toBall = false; });
  const order = balls.map((_, i) => i).sort(() => Math.random() - .5);
  order.forEach((bi, k) => balls[bi].rel = 60 + (k / balls.length) * 1500);
  await runDrop(16000);
  counts = countSlots();
  let max = Math.max(...counts), tied = counts.map((n, j) => n === max ? j : -1).filter(j => j >= 0);
  let tries = 0;
  while (tied.length > 1 && tries < 6) {
    tries++;
    banner = 'THE GOLD BALL DECIDES'; draw();
    setVerdict({ eyebrow: 'Going deeper', title: 'Tie', body: `${tied.map(j => FINAL[j].t).join(' and ')} can’t be separated. Something gold is coming.`, steps: steps.slice(), flash: false });
    await wait(1100);
    balls.push({ gold: true, free: true, x: lerp(B.m + B.w, N - B.m - B.w, Math.random()), y: N * .27, vx: 0, vy: 0 });
    banner = '';
    await runDrop(9000);
    counts = countSlots(); max = Math.max(...counts); tied = counts.map((n, j) => n === max ? j : -1).filter(j => j >= 0);
  }
  winner = tied.length === 1 ? tied[0] : pick(tied);
  draw(); ting(); buzz([40, 50, 80]);
  const dest = FINAL[winner];
  steps.push({ text: cap(dest.b), dest: true });
  setVerdict({ eyebrow: 'The wheels say', title: dest.t, body: 'Some of them go on. The rest are forgotten.', steps: steps.slice() });
  await wait(2000);
  let m = await markChain(steps, dest, { W: wilds, B: bonus });
  if (m.revenge) m = await phelanRevenge();
  const moves = steps.filter(s => !s.dest && !/^(Wild|Bonus|More)/.test(s.text));
  let finalSteps, said;
  if (m.special === 'own') {
    finalSteps = [{ text: m.t, dest: true }];
    said = ['Final answer', 'Reject all commands', 'Go your own way'];
  } else if (m.race) {
    finalSteps = [...steps, { text: m.t, dest: true }];
    said = ['Final answer', 'Chicken Race', `${m.name} wins`, `That one is worth ${$m(m.prize)} euro`];
  } else {
    finalSteps = [...steps, { text: m.t, dest: true }];
    said = ['Final answer', ...moves.map((s, i) => (i === 0 ? 'First, ' : 'Then, ') + s.text.toLowerCase()), (moves.length ? 'Then, ' : '') + dest.b.replace(/^and /, ''), m.special === 'leave' ? 'And leave Mark alone' : 'And ' + m.t.charAt(0).toLowerCase() + m.t.slice(1)];
    if (m.prize) said.push(`That one is worth ${$m(m.prize)} euro`);
    if (m.phelan) said.push(m.b);
  }
  chainNote = '';
  setVerdict({ eyebrow: m.prize ? `Final answer · €${$m(m.prize)}` : 'Final answer', title: m.t, body: m.b || 'Go and ask him. No backing out.', steps: finalSteps, q: quote() });
  $('#caption').textContent = 'Tap Spin to go back to the top';
  speak(said);
  $('#caption').textContent = 'Tap Spin to go back to the top';
  logMove(steps.map(s => s.text.replace(/^And /, '')).join(' · '));
}

