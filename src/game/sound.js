// ---------- sound ----------
// Owns short sound effects and vibration feedback.
let AC = null;
let soundMuted = false, fxMaster = null;
try { soundMuted = localStorage.getItem('wol.soundMuted') === 'on'; } catch (e) {}
function audio() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      fxMaster = AC.createGain(); fxMaster.gain.value = soundMuted ? 0 : 1; fxMaster.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; fxMaster = null; }
}
function setSoundMuted(muted) {
  soundMuted = !!muted;
  if (fxMaster && AC) fxMaster.gain.setTargetAtTime(soundMuted ? 0 : 1, AC.currentTime, .025);
  if (typeof Music !== 'undefined') Music.vis();
  return soundMuted;
}
function soundEffect(kind) {
  if (!AC || !fxMaster || soundMuted) return;
  const patterns = {
    room: [[392, 0, .2], [587, .12, .24], [784, .25, .38]],
    countdown: [[880, 0, .13]],
    finish: [[523, 0, .16], [784, .1, .2], [1047, .22, .42]],
    trip: [[360, 0, .18], [220, .1, .32]],
    jackpot: [[523, 0, .2], [659, .12, .22], [784, .24, .24], [1047, .36, .55], [1319, .48, .7]],
    trophy: [[784, 0, .16], [1047, .12, .36]],
    up: [[587, 0, .14], [784, .1, .18], [1175, .22, .3]],
  };
  const pattern = patterns[kind];
  if (!pattern) return;
  const start = AC.currentTime + .01;
  pattern.forEach(([freq, offset, dur]) => {
    const t = start + offset, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(fxMaster); o.start(t); o.stop(t + dur + .02);
  });
}
function tick(v, f = 2500) {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime((f + Math.random() * 120) * .6, t); o.frequency.exponentialRampToValueAtTime((f + 60) * .35, t + .05);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.075 * v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g); g.connect(fxMaster); o.start(t); o.stop(t + .07);
}
function ting() {
  if (!AC) return; const t = AC.currentTime;
  [[880, .16, 1.8], [1320, .09, 1.3], [2217, .05, .9], [3290, .025, .6]].forEach(([f, v, d]) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(fxMaster); o.start(t); o.stop(t + d + .05);
  });
}
function whoosh(up) {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(up ? 120 : 420, t); o.frequency.exponentialRampToValueAtTime(up ? 520 : 110, t + 1.1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
  o.connect(g); g.connect(fxMaster); o.start(t); o.stop(t + 1.25);
}
