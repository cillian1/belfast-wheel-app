// ---------- Show me ----------
// Owns spin controls, photo flow, tiles, and auto-spin.
function enterPhoto(img) {
  photoImg = img; scene = 'photo'; rotP = 0; hi = null; hiA = 0; photoZoom = 0; photoDone = false;
  $('.stage').classList.add('photo');
  faces.photo = buildPhoto(); draw();
  setBtn('Spin the picture', false);
  $('#caption').textContent = '';
  setVerdict({ eyebrow: 'Show me', title: 'Picture locked in', body: 'Spin it. The slice it lands on shows which part of the picture you walk toward.', photo: true });
}
function leavePhoto() {
  scene = 'nested'; hi = null; hiA = 0; photoZoom = 0; photoDone = false;
  $('.stage').classList.remove('photo');
  draw();
  setBtn('Spin', false);
  $('#caption').textContent = 'Land on Go deeper if you dare.';
  setVerdict({ title: 'Back on the wheel', body: 'Spin when you get there.' });
}
async function spinPhoto() {
  setBtn('Wheels turning', true);
  hi = null; hiA = 0;
  const p = target(PHOTO_N), k = 4 + Math.floor(Math.random() * 2);
  const s = rotP, e = rotP + k * TAU + mod(-p.a - rotP, TAU);
  let last = sliceAt(rotP, PHOTO_N);
  await animate(6000, t => {
    rotP = s + (e - s) * easeOut(t);
    const sl = sliceAt(rotP, PHOTO_N); if (sl !== last) { last = sl; tick(.9, 1600); flap(1); }
    draw();
  });
  ting(); buzz([30, 40, 60]);
  hi = p.i;
  await animate(450, t => { hiA = t; draw(); });
  await wait(500);
  const from = rotP, to = Math.round(rotP / TAU) * TAU;
  await animate(1700, t => { rotP = from + (to - from) * easeInOut(t); draw(); });
  rotP = 0; draw();
  await wait(300); whoosh(true);
  await animate(1800, t => { photoZoom = easeInOut(t); draw(); });
  const clock = Math.round(((p.i + .5) * 360 / PHOTO_N) / 30) % 12 || 12;
  const title = `Head toward ${clock} o'clock`;
  setVerdict({ eyebrow: 'Final answer', title, body: 'Whatever is in that slice of the picture, that is where you are going. Walk toward it until you reach it or something stops you. That is your turn done.', q: quote() });
  speak(['Final answer', `Head toward ${clock} o'clock`, 'Whatever is in that slice of the picture, that is where you are going']);
  photoDone = true;
  logMove(title);
}

// one run at a time: button, wheel and photo controls stay locked until every wheel, die and ball has finished
function lock(on) {
  busy = on; spinBtn.disabled = on;
  pauseRoom(on);
  document.body.classList.toggle('locked', on);
  if (on) runsStarted++; else { resetAsking(false); autoNext(); }
  spinBtn.setAttribute('aria-busy', on ? 'true' : 'false');
  if (on) lastDraw = performance.now();
}
// watchdog: a run that stops drawing for 25 seconds (and isn't waiting on a tap) is stuck, so hand control back
setInterval(() => {
  if (!busy || tapPick || doorPick || document.hidden) { if (document.hidden) lastDraw = performance.now(); return; }
  if (performance.now() - lastDraw < 25000) return;
  console.error('watchdog: run stalled in scene ' + scene);
  lock(false); $('.stage').classList.remove('pick');
  setBtn(scene === 'nested' || scene === 'photo' ? 'Spin' : 'Back to the top', false);
  $('#caption').textContent = 'That one got stuck. Tap to start again.';
}, 3000);
async function spin() {
  if (busy) return; lock(true); audio(); Music.start();
  if ($('.stage').classList.contains('done')) { hideFinal(); sayLast = null; try { speechSynthesis.cancel(); } catch (e) {} await wait(700); }
  try {
    if (scene === 'photo' && !photoDone) { await spinPhoto(); setBtn('Spin', false); }
    else {
      setBtn('Wheels turning', true);
      // a new spin never needs the photo buttons
      $('#showActions').hidden = true; $('#photoActions').hidden = true;
      if (plate.classList.contains('need')) { plate.classList.remove('need'); fitStage(); }
      if (scene === 'photo') {
        scene = 'nested'; photoZoom = 0; hi = null; hiA = 0;
        $('.stage').classList.remove('photo');
      }
      await backToMain();
      $('#caption').textContent = 'Land on Go deeper if you dare.';
      roomHit = false;
      await runMain();
      if (!(scene === 'photo' || ($('#showActions') && !$('#showActions').hidden))) hopeAfterRun();
      setBtn(scene === 'nested' || scene === 'photo' ? 'Spin' : 'Back to the top', false);
    }
  } catch (err) {
    console.error(String(err && err.stack || err));
    scene = 'nested'; zoom = 1; wheelZoom = 1; fade = 0; balls = []; counts = null; winner = -1; flatT = 0; banner = ''; draw();
    $('.stage').classList.remove('photo');
    setVerdict({ title: 'That run broke halfway', body: 'Something went wrong mid-spin. Tap Spin to start again from the top.' });
    setBtn('Spin', false);
  } finally { lock(false); }
}
spinBtn.addEventListener('click', () => {
  if (busy) return;
  if (scene !== 'nested' && scene !== 'photo') { lock(true); setBtn('Going back up', true); backToMain().finally(() => { lock(false); setBtn('Spin', false); $('#caption').textContent = 'Land on Go deeper if you dare.'; }); return; }
  spin();
});
cv.addEventListener('click', ev => {
  if (tapPick) { const r = cv.getBoundingClientRect(); tapPick((ev.clientX - r.left) / r.width * N, (ev.clientY - r.top) / r.height * N); return; }
  if (doorPick && scene === 'pyramid') { // which door did they tap
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * N, y = (ev.clientY - r.top) / r.height * N;
    for (let j = 0; j < 3; j++) { const d = doorRect(j); if (x > d.x - N * .03 && x < d.x + d.w + N * .03 && y > d.y - N * .06 && y < d.y + d.h + N * .03) { doorPick(j); return; } }
    return;
  }
  if (!busy && (scene === 'nested' || scene === 'photo')) spin();
});
$('#backBtn').addEventListener('click', () => { if (!busy) leavePhoto(); });
// Reset spin: gives up on the run in progress and starts again at the top wheel. It asks first, in place, no pop-up.
// The run is thrown away, so nothing it would have paid counts; once a prize is in, it's too late to reset.
function resetAsking(on) { $('#resetBtn').hidden = on; $('#resetAsk').hidden = !on; }
const resetOk = () => busy && !$('.stage').classList.contains('done') && !(window.wolResetOk && !wolResetOk());
$('#resetBtn').addEventListener('click', () => { if (resetOk()) resetAsking(true); });
$('#resetNo').addEventListener('click', () => resetAsking(false));
$('#resetYes').addEventListener('click', () => {
  if (!resetOk()) return resetAsking(false);
  $('#resetAsk').textContent = 'Resetting…';
  try { speechSynthesis.cancel(); } catch (e) {}
  location.reload(); // every wheel, ball and room is mid-animation; a fresh page is the clean way back to the top
});
setInterval(() => { const off = busy && !resetOk(); $('#resetRow').classList.toggle('gone', off); if (off) resetAsking(false); }, 400);
// Auto spin: when a run ends it spins again on the same bet until it's tapped off. Tapping it off mid-run lets that run finish.
let autoOn = false, autoT = 0, runsStarted = 0;
function setAuto(on) {
  autoOn = on; clearTimeout(autoT);
  const b = $('#autoBtn'); b.classList.toggle('on', on); b.textContent = on ? 'Auto spin on · tap to stop' : 'Auto spin';
  if (on && !busy) autoNext();
}
function autoNext() {
  clearTimeout(autoT);
  if (!autoOn) return;
  autoT = setTimeout(() => {
    if (!autoOn) return;
    const banner = document.querySelector('.wbanner');
    if (busy || tapPick || doorPick || document.hidden || (banner && !banner.hidden) || plate.classList.contains('need')) return autoNext(); // wait for a quiet moment
    const n = runsStarted;
    Promise.resolve(spin()).finally(() => { if (autoOn && runsStarted === n) setAuto(false); }); // no run started (no credit, logged out): stop
  }, 3500);
}
$('#autoBtn').addEventListener('click', () => setAuto(!autoOn));

function onFile(e) {
  if (busy) { e.target.value = ''; return; }
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => { enterPhoto(im); e.target.value = ''; URL.revokeObjectURL(url); };
  im.onerror = () => { e.target.value = ''; URL.revokeObjectURL(url); setVerdict({ eyebrow: 'Show me', title: 'That picture would not open', body: 'Try again with a normal photo from the camera.', show: true }); };
  im.src = url;
}
$('#cam').addEventListener('change', onFile);
$('#lib').addEventListener('change', onFile);

const musicBtn = $('#musicBtn');
musicBtn.textContent = Music.on ? 'Music on' : 'Music off';
musicBtn.addEventListener('click', () => { audio(); musicBtn.textContent = Music.toggle() ? 'Music on' : 'Music off'; });
const muteBtn = $('#muteBtn');
function paintMuteButton() {
  const muted = Music.muted;
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  muteBtn.setAttribute('aria-label', muted ? 'Unmute music and sound effects' : 'Mute music and sound effects');
  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}
paintMuteButton();
window.addEventListener('wol-audio-preference-ready', paintMuteButton);
muteBtn.addEventListener('click', () => { audio(); if (Music.toggleMute()) phelanStop(); paintMuteButton(); });

const wildTiles = [...document.querySelectorAll('.wt')];
function paintTile(k, kind) {
  const g = k.getContext('2d'); g.clearRect(0, 0, 96, 96);
  rrect(g, 1, 1, 94, 94, 16); g.fillStyle = grad(g, 0, 0, 96, 96, kind === 'B' ? PURPLE_A : GOLD_A); g.fill();
  g.strokeStyle = kind === 'B' ? 'rgba(40,10,70,.8)' : 'rgba(60,38,6,.7)'; g.lineWidth = 2; g.stroke();
  if (kind === 'B') ankh(g, 48, 50, -Math.PI / 2, 62); else cleopatra(g, 46, 50, -Math.PI / 2, 66);
}
wildTiles.forEach((k, i) => { paintTile(k, i < 3 ? 'W' : 'B'); if (i >= 3) k.classList.add('bon'); });
function setTiles(w, b) {
  wildTiles.forEach((k, i) => { k.classList.remove('gone'); k.style.opacity = ''; k.classList.toggle('lit', i < 3 ? i < w : i - 3 < b); });
  setExtras($('#wxW'), 'W', Math.max(0, w - 3)); setExtras($('#wxB'), 'B', Math.max(0, b - 3));
}
// past three, extra Wilds and ankhs stack up in a small row under the tiles (only the ones you have, no grey placeholders)
function setExtras(el, kind, n) {
  const ks = [...el.querySelectorAll('canvas')], show = Math.min(n, 4);
  ks.slice(show).forEach(k => k.remove());
  for (let i = ks.length; i < show; i++) { const k = document.createElement('canvas'); k.width = k.height = 96; paintTile(k, kind); el.insertBefore(k, el.querySelector('em')); }
  let em = el.querySelector('em');
  if (n > 4) { if (!em) { em = document.createElement('em'); el.appendChild(em); } em.textContent = '+' + (n - 4); } else if (em) em.remove();
}
function setWilds(n) { setTiles(n, 0); if (!n) $('#wilds').classList.remove('over', 'overB', 'overW'); }
