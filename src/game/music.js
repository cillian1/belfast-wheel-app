// ---------- music: a driving Egyptian groove (Hijaz on D) that builds with every wild ----------
const Music = (() => {
  let on = true, level = 0, duckV = 1, master = null, noise = null, timer = null, nextT = 0, step = 0, drone = null;
  try { on = localStorage.getItem('wol-music') !== 'off'; } catch (e) {}
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const OUD = [62, 0, 63, 66, 67, 66, 63, 0];
  const NEY = [[74, 0, 72, 70, 69, 0, 70, 72], [75, 74, 72, 70, 69, 70, 69, 66], [67, 0, 69, 70, 72, 70, 69, 67], [66, 63, 66, 67, 69, 0, 0, 0]];
  const VOL = .22;
  // the farm: same darbuka underneath, but a banjo roll and a fiddle hoedown in D major on top
  let mode = 'egypt', droneV = .06;
  const CHORDS = [[62, 66, 69, 74], [62, 67, 71, 74], [61, 64, 69, 73], [62, 66, 69, 74]], ROLL = [0, 2, 3, 1, 2, 3, 0, 3];
  const FIDDLE = [[74, 0, 74, 76, 78, 76, 74, 71], [71, 0, 74, 71, 67, 0, 71, 74], [76, 0, 73, 76, 81, 79, 76, 73], [74, 78, 76, 73, 74, 0, 0, 0]];
  function banjo(f, t, v) {
    const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + .14); env(g, t, v, .002, .2);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); [o, o2].forEach(x => { x.start(t); x.stop(t + .22); });
  }
  function fiddle(f, t, dur, v) {
    const o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), bp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .99, t); o.frequency.exponentialRampToValueAtTime(f, t + .03);
    lfo.frequency.value = 5.5; lg.gain.value = f * .008; lfo.connect(lg); lg.connect(o.frequency);
    bp.type = 'peaking'; bp.frequency.value = 2400; bp.gain.value = 6; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .025); g.gain.setValueAtTime(v * .8, t + dur * .8); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .04);
    o.connect(bp); bp.connect(g); g.connect(master); [o, lfo].forEach(x => { x.start(t); x.stop(t + dur + .06); });
  }
  function init() {
    if (!AC || master) return;
    master = AC.createGain(); master.gain.value = 0;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(AC.destination);
    noise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // drone on D and A
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = AC.createGain(); g.gain.value = .06;
    [38, 45, 50].forEach(m => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = (Math.random() - .5) * 8; o.connect(lp); o.start(); });
    lp.connect(g); g.connect(master); drone = g;
  }
  function env(g, t, peak, a, dur) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
  function oud(f, t, v) {
    const o = AC.createOscillator(), bp = AC.createBiquadFilter(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.value = f;
    bp.type = 'lowpass'; bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(500, t + .25); env(g, t, v, .004, .32);
    o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t + .35);
  }
  function ney(f, t, dur, v) {
    const o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), bp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .985, t); o.frequency.exponentialRampToValueAtTime(f, t + .05);
    lfo.frequency.value = 6; lg.gain.value = f * .014; lfo.connect(lg); lg.connect(o.frequency);
    bp.type = 'bandpass'; bp.frequency.value = Math.min(3200, f * 2.2); bp.Q.value = 2.5; env(g, t, v, .03, dur);
    o.connect(bp); bp.connect(g); g.connect(master); [o, lfo].forEach(x => { x.start(t); x.stop(t + dur + .05); });
  }
  function nz(t, dur, v, type, freq, q = 1) {
    const s = AC.createBufferSource(); s.buffer = noise; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = AC.createGain(); env(g, t, v, .002, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function doum(t, v = .7) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(62, t + .18); env(g, t, v, .003, .4); o.connect(g); g.connect(master); o.start(t); o.stop(t + .42); }
  function tek(t, v = .22) { nz(t, .06, v, 'highpass', 3500, .7); }
  function zill(t, v = .05) { [2650, 3970].forEach(f => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; env(g, t, v, .002, .6); o.connect(g); g.connect(master); o.start(t); o.stop(t + .65); }); }
  const bpm = () => 112 + Math.min(level, 4) * 10;
  function play(s, t) {
    const e = s % 8, bar = Math.floor(s / 8), beat = 60 / bpm(), lv = level;
    // maqsum: DUM tek . tek DUM . tek .
    if (e === 0 || e === 4) doum(t, lv >= 2 ? .85 : .65);
    if (e === 1 || e === 3 || e === 6) tek(t, lv >= 2 ? .3 : .2);
    if (lv >= 2 && (e === 5 || e === 7)) tek(t, .1);
    if (lv >= 2) nz(t, .04, .05, 'highpass', 9000);
    if (lv >= 3) nz(t + beat * .25, .04, .04, 'highpass', 9000);
    if (lv >= 1 && (e === 0 || e === 4)) zill(t, .03 + lv * .01);
    if (mode === 'farm') {
      banjo(hz(CHORDS[bar][ROLL[e]]), t, .07);
      if (e === 0 || e === 4) oud(hz(CHORDS[bar][0] - 24), t, .12); // the bass on the beat
      const m = FIDDLE[bar][e]; if (m) fiddle(hz(m), t, beat * .45, .06);
      return;
    }
    if (OUD[e]) oud(hz(OUD[e] - (lv >= 2 ? 0 : 12)), t, .1);
    if (lv >= 1) { const m = NEY[bar][e]; if (m) ney(hz(m + (lv >= 3 ? 12 : 0)), t, beat * .46, lv >= 2 ? .1 : .08); }
    if (lv >= 4 && e % 2 === 1) oud(hz(74 + [0, 1, 4, 5][e >> 1]), t, .07);
  }
  function sched() {
    if (!AC) return;
    const eighth = 60 / bpm() / 2;
    while (nextT < AC.currentTime + .12) { play(step, nextT); nextT += eighth; step = (step + 1) % 32; }
  }
  function applyGain() { if (master) master.gain.setTargetAtTime(on && !document.hidden ? VOL * duckV : 0, AC.currentTime, .25); }
  return {
    get on() { return on; },
    start() { if (!AC) return; init(); if (!master) return; if (!timer) { nextT = AC.currentTime + .05; timer = setInterval(sched, 25); } applyGain(); },
    toggle() { on = !on; try { localStorage.setItem('wol-music', on ? 'on' : 'off'); } catch (e) {} if (on) this.start(); else applyGain(); return on; },
    setLevel(n) { level = n; },
    setMode(m) { mode = m; if (drone) drone.gain.setTargetAtTime(m === 'farm' ? .015 : droneV, AC.currentTime, .4); },
    duck(v) { duckV = v; applyGain(); },
    sting(n) { // a fast Hijaz run up the scale, longer with each wild, and the cymbals
      if (!AC || !master) return; const t = AC.currentTime + .02, run = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79, 81].slice(0, 5 + n * 2);
      run.forEach((m, i) => ney(hz(m + 12), t + i * .06, i === run.length - 1 ? .9 : .1, .1));
      zill(t + run.length * .06, .09); doum(t + run.length * .06, .9);
    },
    vis() { applyGain(); },
  };
})();
document.addEventListener('visibilitychange', () => Music.vis());

function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
let lastPegBuzz = 0; // a tiny tap per peg, never faster than the motor can feel
function pegBuzz() { const t = performance.now(); if (t - lastPegBuzz > 45) { lastPegBuzz = t; buzz(7); } }

