// ---------- sound ----------
// Owns short sound effects and vibration feedback.
let AC = null;
let sfxMaster = null;
function audio() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } }
function effectsOutput() {
  if (!AC) return null;
  if (!sfxMaster) {
    sfxMaster = AC.createGain(); sfxMaster.connect(AC.destination);
    try { if (typeof Music !== 'undefined' && Music.muted) sfxMaster.gain.value = 0; } catch (e) {}
  }
  return sfxMaster;
}
function setEffectsMuted(muted) {
  if (!AC) return;
  effectsOutput();
  sfxMaster.gain.setTargetAtTime(muted ? 0 : 1, AC.currentTime, .02);
}
const SFX_NOTES = {
  stank: [[196, .16], [147, .3]], god: [[392, .12], [523, .18], [784, .42]],
  monster: [[110, .12], [165, .13], [220, .3]], pyramid: [[440, .16], [587, .16], [740, .4]],
  revenge: [[311, .2], [233, .25], [185, .45]], farm: [[294, .1], [370, .15], [440, .35]],
  countdown: [[523, .12]], go: [[659, .08], [880, .2]], finish: [[784, .12], [988, .18], [1318, .45]],
  trip: [[392, .16], [196, .32]], jackpot: [[523, .1], [659, .12], [784, .16], [1047, .5]],
  trophy: [[880, .12], [1175, .22]], back: [[587, .12], [440, .16], [330, .3]],
};
function playSfx(name) {
  if (!AC) audio();
  if (!AC) return;
  effectsOutput();
  const notes = SFX_NOTES[name];
  if (!notes) return;
  const t = AC.currentTime;
  notes.forEach(([f, d], i) => {
    const at = t + i * .09, o = AC.createOscillator(), g = AC.createGain();
    o.type = name === 'trip' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f, at);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(name === 'jackpot' ? .18 : .12, at + .012);
    g.gain.exponentialRampToValueAtTime(.0001, at + d);
    o.connect(g); g.connect(sfxMaster); o.start(at); o.stop(at + d + .02);
  });
}
function tick(v, f = 2500) {
  if (!AC) return; effectsOutput(); const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime((f + cosmeticRandom() * 120) * .6, t); o.frequency.exponentialRampToValueAtTime((f + 60) * .35, t + .05);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.075 * v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g); g.connect(sfxMaster); o.start(t); o.stop(t + .07);
}
function ting() {
  if (!AC) return; effectsOutput(); const t = AC.currentTime;
  [[880, .16, 1.8], [1320, .09, 1.3], [2217, .05, .9], [3290, .025, .6]].forEach(([f, v, d]) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(sfxMaster); o.start(t); o.stop(t + d + .05);
  });
}
function whoosh(up) {
  if (!AC) return; effectsOutput(); const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(up ? 120 : 420, t); o.frequency.exponentialRampToValueAtTime(up ? 520 : 110, t + 1.1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
  o.connect(g); g.connect(sfxMaster); o.start(t); o.stop(t + 1.25);
}
