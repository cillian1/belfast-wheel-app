// ---------- drawing ----------
// Owns main canvas drawing and stage layout.
function drawScaled(img, r, sc) { ctx.save(); ctx.translate(c, c); ctx.scale(sc, sc); ctx.rotate(r); ctx.drawImage(img, -c, -c); ctx.restore(); }
let domeBulge = 0;
const diceDrawOrder = [];
function compareDiceHeight(a, b) { return (a.z || 0) - (b.z || 0); }
function visibleDrawLoop(render) {
  let raf = 0, active = true;
  const schedule = () => { if (active && !document.hidden && !raf) raf = requestAnimationFrame(frame); };
  function frame() {
    raf = 0;
    if (!active || document.hidden) return;
    render();
    schedule();
  }
  const visibility = () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else schedule();
  };
  document.addEventListener('visibilitychange', visibility);
  if (!document.hidden) render();
  schedule();
  return () => {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', visibility);
  };
}
function drawDice(sc) {
  ctx.save(); ctx.translate(c, c); ctx.scale(sc, sc);
  const s0 = R * .13;
  // shadows on the felt first, so airborne dice float over them
  dice.forEach(d => {
    if (d.gone || d.born === 0) return;
    const z = d.z || 0, sh = s0 * (1 - Math.min(.4, z * .5)) * (d.born ?? 1);
    ctx.save(); ctx.translate(d.x * R + z * R * .12, d.y * R + z * R * .2); ctx.rotate(d.a);
    ctx.fillStyle = `rgba(0,0,0,${.45 - Math.min(.3, z * .4)})`; rrect(ctx, -sh / 2, -sh / 2, sh, sh, sh * .25); ctx.fill(); ctx.restore();
  });
  wellBalls.forEach(b => { const r = R * .028 * (b.kind ? 1.25 : 1); ctx.drawImage(ballImg(b), b.x * R - r, b.y * R - r, r * 2, r * 2); });
  dice.forEach(d => {
    return; // no numbers: it stays mysterious
    ctx.save(); ctx.globalAlpha = Math.min(1, d.label * 1.5);
    ctx.font = `700 ${R * .1}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9a8'; ctx.fillText('+' + d.v, d.x * R, d.y * R - (1 - d.label) * R * .12); ctx.restore();
  });
  diceDrawOrder.length = 0;
  for (let i = 0; i < dice.length; i++) diceDrawOrder.push(dice[i]);
  diceDrawOrder.sort(compareDiceHeight);
  for (let i = 0; i < diceDrawOrder.length; i++) {
    const d = diceDrawOrder[i];
    if (d.gone) continue;
    const s = s0 * (1 + (d.z || 0) * .9 + (d.swell || 0) * .35) * (d.born ?? 1);
    if (s <= 0) continue;
    if (!d.M) { d.M = snapRot(randRot()); d.v = topValue(d.M); }
    if (d.glow > 0 && !Perf.low) { const gr = ctx.createRadialGradient(d.x * R, d.y * R, 0, d.x * R, d.y * R, s * 1.2); gr.addColorStop(0, d.sp === 'W' ? `rgba(255,215,90,${.8 * d.glow})` : `rgba(180,110,255,${.8 * d.glow})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(d.x * R, d.y * R, s * 1.2, 0, TAU); ctx.fill(); }
    drawDie3D(ctx, d.x * R, d.y * R, s * .82, d.M, d.sp);
  }
  // the clear pop-up dome over the dice
  const dr = R * .5 * (1 + domeBulge * .05);
  ctx.beginPath(); ctx.arc(0, 0, dr, 0, TAU);
  if (Perf.low) ctx.fillStyle = 'rgba(255,255,255,.06)';
  else {
    const dg = ctx.createRadialGradient(-dr * .35, -dr * .45, 0, 0, 0, dr);
    dg.addColorStop(0, 'rgba(255,255,255,.22)'); dg.addColorStop(.35, 'rgba(255,255,255,.05)'); dg.addColorStop(.85, 'rgba(255,255,255,.03)'); dg.addColorStop(1, 'rgba(255,255,255,.14)');
    ctx.fillStyle = dg;
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5 * D / sc; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, dr * .86, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = R * .02; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
// Go deeper slices breathe a blue-violet glow with sparks drifting toward the centre
function drawDeepGlow(sc) {
  if (Perf.low) return;
  const t = performance.now() / 1000, seg = TAU / MAIN.length;
  ctx.save(); ctx.translate(c, c); ctx.scale(sc, sc); ctx.rotate(rot[0]); ctx.globalCompositeOperation = 'lighter';
  MAIN.forEach((s, i) => {
    if (!s.deep) return;
    const a0 = BASE + i * seg, a1 = a0 + seg, pulse = .5 + .5 * Math.sin(t * 2.6 + i);
    ctx.beginPath(); ctx.arc(0, 0, R * .93, a0, a1); ctx.arc(0, 0, R * .55, a1, a0, true); ctx.closePath();
    const gr = ctx.createRadialGradient(0, 0, R * .55, 0, 0, R * .93);
    gr.addColorStop(0, `rgba(150,110,255,${.28 + .25 * pulse})`); gr.addColorStop(1, `rgba(80,160,255,${.06 + .1 * pulse})`);
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = `rgba(190,170,255,${.35 + .45 * pulse})`; ctx.lineWidth = 2 * D; ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const f = mod(t * .35 + k / 5 + i * .13, 1), rr = lerp(R * .9, R * .57, f), aa = a0 + seg * (.2 + .6 * ((k * 7 + i * 3) % 5) / 4);
      ctx.beginPath(); ctx.arc(Math.cos(aa) * rr, Math.sin(aa) * rr, D * (1.2 + 1.3 * Math.sin(f * Math.PI)), 0, TAU);
      ctx.fillStyle = `rgba(220,210,255,${Math.sin(f * Math.PI) * .9})`; ctx.fill();
    }
  });
  ctx.restore();
}
let lastIdle = 0;
let idleRaf = 0;
function idle(now) {
  idleRaf = 0;
  if (document.hidden) return;
  idleRaf = requestAnimationFrame(idle);
  // Keep the nested rim lights moving when a run pauses between wheel spins.
  if (scene === 'nested' && now - lastIdle > (Perf.low ? 33 : 40) && (busy ? performance.now() - lastDraw > 30 : zoom === 1)) {
    lastIdle = now;
    if (liveK < 0 && zoom === 1) { liveK = 0; draw(); liveK = -1; } else draw();
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && idleRaf) { cancelAnimationFrame(idleRaf); idleRaf = 0; }
  else if (!document.hidden && !idleRaf) idleRaf = requestAnimationFrame(idle);
});
if (!document.hidden) idleRaf = requestAnimationFrame(idle);
var liveK = -1;
let navCache = null, evenA = 1;
function navCacheMatches(cache) {
  if (!cache || cache.N !== N || cache.DEPTH !== DEPTH || cache.zoom !== zoom || cache.liveK !== liveK) return false;
  if (cache.rotations.length !== rot.length) return false;
  for (let k = 0; k < rot.length; k++) if (cache.rotations[k] !== (k === liveK ? '' : rot[k].toFixed(5))) return false;
  if (cache.deadTo.length !== deadTo.length || cache.deadFrom.length !== deadFrom.length || cache.deadA.length !== deadA.length) return false;
  for (let k = 0; k < deadTo.length; k++) if (cache.deadTo[k] !== deadTo[k] || cache.deadFrom[k] !== deadFrom[k] || cache.deadA[k] !== deadA[k]) return false;
  if (liveK === DEPTH) return cache.dice === null;
  if (!cache.dice || cache.dice.length !== dice.length) return false;
  for (let i = 0; i < dice.length; i++) if (cache.dice[i] !== dice[i].x + dice[i].y + (dice[i].gone ? 1 : 0)) return false;
  return true;
}
function snapshotNavCache() {
  return {
    N, DEPTH, zoom, liveK,
    rotations: rot.map((r, k) => k === liveK ? '' : r.toFixed(5)),
    deadTo: deadTo.slice(), deadFrom: deadFrom.slice(), deadA: deadA.slice(),
    dice: liveK === DEPTH ? null : dice.map(d => d.x + d.y + (d.gone ? 1 : 0)),
  };
}
function drawLayer(g, k, sc) {
  const sv = ctx; ctx = g;
  const ga = ctx.globalAlpha; if (k === MAXD && evenA < 1) ctx.globalAlpha = ga * evenA;
  if (k > 0) drawScaled(faces.wall, 0, sc);
  drawScaled(faces.layers[k], rot[k], sc);
  if (boostA[k] > 0 && faces['boost' + k]) { ctx.globalAlpha = boostA[k]; drawScaled(faces['boost' + k], rot[k], sc); ctx.globalAlpha = 1; }
  if (k && deadFrom[k]) drawScaled(deadFace(deadFrom[k], k), rot[k], sc);
  if (k && deadA[k] > 0 && deadTo[k]) { ctx.globalAlpha = deadA[k]; drawScaled(deadFace(deadTo[k], k), rot[k], sc); ctx.globalAlpha = 1; }
  if (k > 0 && LAYERS[k].some(it => it.up || it.deep === 2)) { // the chevrons flash in a wave
    const ph = performance.now() / 180, n = LAYERS[k].length;
    ctx.save(); ctx.translate(c, c); ctx.scale(sc, sc); ctx.rotate(rot[k]); ctx.translate(-c, -c); ctx.globalCompositeOperation = 'lighter';
    LAYERS[k].forEach((it, i) => {
      const am = BASE + (i + .5) * TAU / n;
      if (it.up) upChevrons(ctx, am, 1, ph, it.wild || it.bonus ? [R * .6, R * .67] : undefined, it.up === 2);
      if (it.deep === 2) downChevrons(ctx, am, 1, ph, undefined, true);
    });
    ctx.restore();
  }
  if (k === 0 && sc < 1.6) drawDeepGlow(sc);
  if (k === DEPTH) { drawScaled(faces.well, 0, sc); drawDice(sc); }
  else if (k === MAXD - 1 && evenA < 1) { ctx.globalAlpha = 1 - evenA; drawScaled(faces.well, 0, sc); ctx.globalAlpha = 1; } // the old well fades as the fifth wheel rises
  if (k > 0) {
    ctx.globalCompositeOperation = 'overlay'; drawScaled(faces.light, 0, sc); ctx.globalCompositeOperation = 'source-over';
    drawScaled(faces.pbevel, 0, sc);
  }
  ctx.globalAlpha = ga;
  ctx = sv;
}
function layerVisible(k) {
  const sc = Math.pow(S, k) * zoom;
  if (k < DEPTH && R * .55 * sc > R * .95) return 0;
  if (R * .93 * sc < 3) return -1;
  return sc;
}
function drawNested() {
  // the static wheels under and over the moving one are cached, so a spin redraws one wheel, not five
  let cache = null;
  if (liveK >= 0) {
    if (!navCacheMatches(navCache)) {
      const mkc = () => { const k2 = mk(); return { cv: k2, g: k2.getContext('2d') }; };
      const u = navCache && navCache.N === N ? navCache.u : mkc(), o = navCache && navCache.N === N ? navCache.o : mkc();
      u.g.clearRect(0, 0, N, N); o.g.clearRect(0, 0, N, N);
      u.g.drawImage(faces.dart, 0, 0); u.g.drawImage(faces.base, 0, 0);
      [u.g, o.g].forEach(g => { g.save(); g.beginPath(); g.arc(c, c, R * .93, 0, TAU); g.clip(); });
      for (let k = 0; k <= DEPTH; k++) {
        if (k === liveK) continue;
        const sc = layerVisible(k); if (sc < 0) break; if (!sc) continue;
        drawLayer(k < liveK ? u.g : o.g, k, sc);
      }
      [u.g, o.g].forEach(g => g.restore());
      navCache = { ...snapshotNavCache(), u, o };
    }
    cache = navCache;
  }
  if (cache) {
    ctx.drawImage(cache.u.cv, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, R * .93, 0, TAU); ctx.clip();
    const sc = layerVisible(liveK); if (sc > 0) drawLayer(ctx, liveK, sc);
    ctx.drawImage(cache.o.cv, 0, 0);
  } else {
    ctx.drawImage(faces.dart, 0, 0);
    ctx.drawImage(faces.base, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.arc(c, c, R * .93, 0, TAU); ctx.clip();
    for (let k = 0; k <= DEPTH; k++) {
      const sc = layerVisible(k); if (sc < 0) break; if (!sc) continue;
      drawLayer(ctx, k, sc);
    }
  }
  ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(faces.sheen, 0, 0); ctx.globalCompositeOperation = 'source-over';
  drawWinGlow();
  const tNow = performance.now();
  sweepA = Math.max(0, Math.min(1, sweepA + (sweepOn ? .06 : -.04)));
  if (sweepA > 0 && faces.sweep) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sweepA; drawScaled(faces.sweep, tNow / 420, 1); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  if (streak > 0) {
    ctx.save(); ctx.translate(c, c);
    for (let i = 0; i < 48; i++) {
      const a = i * TAU / 48 + Math.sin(i * 12.9) * .05, r0 = R * (.35 + ((i * 37) % 10) / 20), r1 = r0 + R * .5 * streak;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.strokeStyle = `rgba(255,236,190,${.22 * streak})`; ctx.lineWidth = D * 1.5; ctx.stroke();
    }
    ctx.restore();
  }
  drawPointer(faces.pointer, 1);
}
var photoZoom = 0, photoDone = false;
function drawPhoto() {
  ctx.save();
  if (photoZoom > 0 && hi !== null) {
    const am = BASE + (hi + .5) * TAU / PHOTO_N, fx = c + Math.cos(am) * R * .55, fy = c + Math.sin(am) * R * .55, z = 1 + photoZoom * 1.7;
    ctx.translate(c, c); ctx.scale(z, z); ctx.translate(-lerp(c, fx, photoZoom), -lerp(c, fy, photoZoom));
  }
  ctx.drawImage(faces.dart, 0, 0);
  ctx.drawImage(faces.base, 0, 0);
  if (faces.photo) drawScaled(faces.photo, rotP, 1);
  ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(faces.sheen, 0, 0); ctx.globalCompositeOperation = 'source-over';
  if (hi !== null && hiA > 0) {
    const seg = TAU / PHOTO_N, a0 = BASE + hi * seg, r = R * .93;
    ctx.save(); ctx.translate(c, c); ctx.rotate(rotP);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0 + seg, a0, true); ctx.closePath();
    ctx.fillStyle = `rgba(5,6,8,${.72 * hiA})`; ctx.fill('evenodd');
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a0 + seg); ctx.closePath();
    ctx.strokeStyle = `rgba(236,196,108,${hiA})`; ctx.lineWidth = 3 * D; ctx.stroke();
    ctx.restore();
  }
  if (!photoZoom) drawPointer(faces.pointer, 1);
  ctx.restore();
}
function hopper() { return { cx: c, cy: lerp(c, N * .17, flatT), sx: lerp(1, .68, flatT), sy: lerp(1, .68 * .3, flatT) }; }
function drawFinal() {
  ctx.drawImage(faces.boardBg, 0, 0);
  if (flatT > 0) { ctx.globalAlpha = flatT; ctx.drawImage(faces.board, 0, 0); ctx.globalAlpha = 1; }
  if (winner >= 0) {
    const x = B.m + B.w * winner, s = FINAL[winner];
    ctx.fillStyle = s.tint[1] + '33'; ctx.fillRect(x, B.slotTop, B.w, B.floor - B.slotTop);
    ctx.strokeStyle = s.tint[1]; ctx.lineWidth = 3 * D; ctx.strokeRect(x + 1.5 * D, B.slotTop, B.w - 3 * D, B.floor - B.slotTop);
  }
  const H = hopper();
  const rOn = lerp(R * .03, ballR, flatT);
  balls.forEach(b => {
    if (!b.free && !b.hold) {
      const a = b.phi + rotF * b.lag;
      b.x = H.cx + Math.cos(a) * b.rr * R * H.sx; b.y = H.cy + Math.sin(a) * b.rr * R * H.sy;
    }
    const r = b.free ? ballR : rOn;
    if (!b.hidden) { const rr = b.kind ? r * 1.2 : r; ctx.drawImage(ballImg(b), b.x - rr, b.y - rr, rr * 2, rr * 2); }
  });
  if (counts) {
    ctx.font = `700 ${N * .032}px ${LABEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    counts.forEach((n, j) => {
      const x = B.m + B.w * (j + .5), y = B.slotTop - N * .028;
      ctx.beginPath(); ctx.arc(x, y, N * .024, 0, TAU); ctx.fillStyle = j === winner ? FINAL[j].tint[1] : 'rgba(10,12,15,.85)'; ctx.fill();
      ctx.strokeStyle = FINAL[j].tint[1]; ctx.lineWidth = 1.5 * D; ctx.stroke();
      
    });
  }
  if (banner) {
    ctx.font = `${N * .03}px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = (N * .006) + 'px'; } catch (e) {}
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(banner, c, N * .3 + 2 * D);
    ctx.fillStyle = '#f3cf6e'; ctx.fillText(banner, c, N * .3);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
}
// the flapper: a peg drags it, it lets go and springs back with a little give
let pAng = 0, pVel = 0, pLast = 0;
function flap(dir) { pVel -= dir * 5.5; }
function updatePointer(now) {
  const dt = pLast ? Math.max(0, Math.min(.05, (now - pLast) / 1000)) : 0; pLast = now;
  for (let i = 0; i < 4; i++) { const h = dt / 4; pVel += (-260 * pAng - 15 * pVel) * h; pAng += pVel * h; }
  if (pAng > .42) { pAng = .42; pVel = 0; } if (pAng < -.42) { pAng = -.42; pVel = 0; }
}
function drawPointer(img, sc) {
  const py = c - R * .985 * sc;
  ctx.save(); ctx.translate(c, py); ctx.rotate(pAng); ctx.translate(-c, -py);
  if (sc === 1) ctx.drawImage(img, 0, 0); else drawScaled(img, 0, sc);
  ctx.restore();
}
let lastDraw = performance.now();
function draw() {
  const perfScene = scene, perfStart = Perf.begin(perfScene);
  try {
    lastDraw = performance.now();
    if (!N) return;
    updatePointer(performance.now());
    ctx.clearRect(0, 0, N, N);
    const zoomWheel = scene === 'nested' && wheelZoom !== 1;
    if (zoomWheel) { ctx.save(); ctx.translate(c, c); ctx.scale(wheelZoom, wheelZoom); ctx.translate(-c, -c); }
    try {
      const now = performance.now();
      if (scene === 'final') drawFinal(); else if (scene === 'photo') drawPhoto();
      else if (scene === 'intro') drawIntro(now); else if (scene === 'building') drawBuilding(now);
      else if (scene === 'hall') drawHall(); else if (scene === 'stank') drawStank(now);
      else if (scene === 'pipes') drawPipes(); else if (scene === 'farm') drawFarm(now);
      else if (scene === 'coaster') drawCoaster(now); else if (scene === 'planet') drawPlanetScene(now); else if (scene === 'monster') drawMonster(now);
      else if (scene === 'pyramid' && pyr) drawPyramid(now); else if (scene === 'god' && god) drawGodRoom(now); else if (scene === 'zena' && zena) drawZena(now);
      else if (scene === 'roul' && roul) drawRoul(now); else if (scene === 'vault' && vault) drawVault(now);
      else if (scene === 'pyramid' || scene === 'god' || scene === 'zena' || scene === 'roul' || scene === 'vault') {}
      else drawNested();
      if (snapA > 0 && snap) { ctx.globalAlpha = snapA; ctx.drawImage(snap, 0, 0); ctx.globalAlpha = 1; }
      if (scene === 'pipes' && pipes) pipes.balls.forEach(b => { if (b.state === 'pre') ctx.drawImage(ballImg(b), b.x - b.pr, b.y - b.pr, b.pr * 2, b.pr * 2); });
      if (ghost && scene !== 'pyramid' && scene !== 'god' && scene !== 'zena') { drawGhost(); if (ghostSay) bubble(ctx, ghostSay, ghost.x, ghost.y - R * .22); }
      for (let i = 0; i < godParts.length; i++) {
        if (Perf.low && i % 2) continue;
        const p = godParts[i], sz = p.s;
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.drawImage(p.img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
      }
      for (let i = 0; i < dots.length; i++) {
        if (Perf.low && i % 2) continue;
        const p = dots[i]; // die pips on their way to becoming chickens
        if (p.hide) continue;
        const r = p.r * (1 + p.glow * .6);
        if (!Perf.low) {
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2); gr.addColorStop(0, `rgba(255,240,190,${.7 * p.glow})`); gr.addColorStop(1, 'rgba(255,200,90,0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = p.red ? '#d0202f' : (p.glow > .5 ? '#fff6dc' : '#1b1a19'); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      }
    } finally {
      if (zoomWheel) ctx.restore();
    }
    if (fade > 0) { ctx.fillStyle = `rgba(10,12,15,${fade})`; ctx.fillRect(0, 0, N, N); }
  } finally {
    Perf.end(perfScene, perfStart);
  }
}
// everything fits on one screen: the wheel takes whatever height the rest of the page leaves
function fitStage() {
  if (typeof viewing !== 'undefined' && viewing) return;
  const st = $('.stage'), app = $('.app'); if (!st || !app) return;
  const cs = getComputedStyle(document.body), gap = parseFloat(getComputedStyle(app).rowGap) || 0;
  let used = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom), n = 0;
  [...app.children].forEach(el => { if (el === st || getComputedStyle(el).display === 'none' || /^(fixed|absolute)$/.test(getComputedStyle(el).position)) return; used += el.offsetHeight; n++; });
  used += gap * n;
  const h = (window.visualViewport ? visualViewport.height : innerHeight) - used;
  const sw = Math.max(220, Math.min(innerWidth - 4, 600, h)); st.style.width = sw + 'px'; st.style.marginLeft = st.style.marginRight = sw > app.clientWidth ? (app.clientWidth - sw) / 2 + 'px' : 'auto';
}
addEventListener('resize', fitStage); if (window.visualViewport) visualViewport.addEventListener('resize', fitStage);
function syncCanvasQuality(preserve = true) {
  if (!N) return;
  const scale = Perf.dpr(D) / D, size = Math.max(1, Math.round(N * scale));
  if (cv.width !== size || cv.height !== size) {
    let previous = null;
    if (preserve && cv.width && cv.height) {
      previous = document.createElement('canvas');
      previous.width = cv.width; previous.height = cv.height;
      previous.getContext('2d').drawImage(cv, 0, 0);
    }
    cv.width = cv.height = size;
    if (previous) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(previous, 0, 0, size, size);
    }
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
Perf.onCanvasQualityChange(syncCanvasQuality);
function resize() {
  const w = cv.clientWidth; if (!w) return;
  if (typeof viewing !== 'undefined' && viewing) return;
  D = Math.min(2, window.devicePixelRatio || 1);
  const n = Math.round(w * D); if (n === N) { syncCanvasQuality(false); return; }
  const old = B ? { N } : null;
  N = n; c = N / 2; R = N / 2 * .935 * .82;
  syncCanvasQuality(false);
  build(); if (old) rescaleBalls(old); draw();
}
