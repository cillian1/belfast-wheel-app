// Owns shared game constants, geometry, and utility functions.
const BUILD = 76;
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, BASE = -Math.PI / 2;
const LABEL_FONT = '"IBM Plex Sans Condensed","Arial Narrow",sans-serif';
const DISPLAY_FONT = '"Michroma","Arial Black",sans-serif';
function makeCosmeticRandom(seed) {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const cosmeticRandom = (() => {
  const seed = new Uint32Array(1);
  try { window.crypto.getRandomValues(seed); }
  catch (e) { seed[0] = (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0; }
  return makeCosmeticRandom(seed[0]);
})();
// Deterministic physics callbacks: rendering cadence must not alter prize draws.
function physicsFrames() {
  const stepMs = 1000 / 60;
  let last = performance.now(), pending = 0, ticks = 0, waiting = null, scheduled = false, pumping = false;
  function frame(now) {
    scheduled = false;
    pending += Math.max(0, Math.min(250, now - last)); last = now;
    pumping = true;
    while (waiting && pending + 1e-6 >= stepMs) {
      pending -= stepMs;
      const callback = waiting; waiting = null;
      callback(++ticks * stepMs);
    }
    pumping = false;
    if (waiting && !scheduled) { scheduled = true; requestAnimationFrame(frame); }
  }
  return callback => {
    waiting = callback;
    if (!pumping && !scheduled) { scheduled = true; requestAnimationFrame(frame); }
  };
}
const GHOST_IMAGE = new Image();
GHOST_IMAGE.src = GHOST_SPRITE_DATA;
const pick = a => a[Math.floor(Math.random() * a.length)];
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const metres = () => pick([5, 10, 15, 20, 25, 30, 40, 50, 75, 100]);
