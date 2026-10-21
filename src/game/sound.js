// ---------- sound ----------
// Owns short sound effects and vibration feedback.
let AC = null;
function audio() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } }
function tick(v, f = 2500) {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime((f + Math.random() * 120) * .6, t); o.frequency.exponentialRampToValueAtTime((f + 60) * .35, t + .05);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.075 * v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .07);
}
function ting() {
  if (!AC) return; const t = AC.currentTime;
  [[880, .16, 1.8], [1320, .09, 1.3], [2217, .05, .9], [3290, .025, .6]].forEach(([f, v, d]) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .05);
  });
}
function whoosh(up) {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(up ? 120 : 420, t); o.frequency.exponentialRampToValueAtTime(up ? 520 : 110, t + 1.1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 1.25);
}
