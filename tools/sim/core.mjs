import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../../src/game/${name}.js`, import.meta.url), 'utf8');
const replace = (source, pattern, value) => {
  if (!pattern.test(source)) throw new Error(`Game source changed: ${pattern}`);
  return source.replace(pattern, value);
};

// Presentation sinks, not a DOM or canvas. Run setup functions unchanged: some
// cached artwork still consumes gameplay RNG, so skipping it would change paths.
function presentation() {
  let sink;
  const noop = () => sink;
  sink = new Proxy(noop, {
    get: (_, key) => key === 'width' ? 0 : key === 'contains' ? () => false : key === 'measureText' ? () => ({ width: 0 }) : sink,
    set: () => true,
    apply: () => sink,
  });
  return sink;
}

export function seededRandom(seed) {
  seed = Math.imul(seed, 2654435761) >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Shared with the browser oracle; only scheduling and presentation are replaced.
export function pathHarness() {
  let now = 0, frames = [], record = null, golden = false, godHit = false;
  let trace = [], calls = 0, tracing = false;
  const layer = spinLayer;
  spinLayer = async (...args) => { const result = await layer(...args); if (tracing) trace.push(['wheel', args[0], result, calls]); return result; };
  rollDice = async () => {
    stop({ k: 'D', w: dice.filter(d => d.sp === 'W').length, b: dice.filter(d => d.sp === 'B').length });
  };
  const stop = value => { record = value; throw new Error('sim-stop'); };
  draw = () => {};
  speak = () => {};
  animate = async (duration, step) => { step(1); };
  pyramidRun = async () => stop({ k: 'P' });
  godRoom = async () => { godHit = true; };
  bonusRun = async (steps, w, b) => stop({ k: 'W', w, b });
  monsterRun = async (steps, w, b) => stop({ k: 'B', w, b });
  const originalGolden = goldenRun;
  goldenRun = async (...args) => { golden = true; return originalGolden(...args); };
  performance.now = () => now;
  requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  return async (seed, tip = .10, debug = false) => {
    const random = seededRandom(seed);
    calls = 0; trace = []; tracing = debug;
    Math.random = () => { calls++; return random(); };
    TIP_CHANCE = tip;
    record = null; golden = false; godHit = false; frames = []; now = 0;
    // A seed describes a fresh spin, independent of boot-time drawing or workers.
    clearSpecialDice();
    dice.forEach(d => { d.x = d.hx; d.y = d.hy; d.M = null; d.z = 0; d.v = 1; });
    DEPTH = MAXD - 1; rot.fill(0); lastQuote = -1;
    ringCache.clear(); faces.farm = null;
    for (let k = 1; k <= MAXD; k++) {
      const order = BASE_ORDERS[k - 1];
      runOrders[k - 1] = order.slice(); LAYERS[k] = itemsOf(order);
      DEAD_KEYS.forEach(v => DEAD_LAYERS[v][k] = itemsOf(deadOrderOf(order, k, v)));
    }
    scene = 'nested'; zoom = 1; photoDone = true;
    await backToMain();
    let done = false, error;
    runMain().catch(e => { if (e.message !== 'sim-stop') error = e; }).finally(() => { done = true; });
    for (let iterations = 0; !done; iterations++) {
      if (iterations > 100000) throw new Error(`Simulation stalled at seed ${seed}`);
      await Promise.resolve();
      const batch = frames; frames = [];
      if (batch.length) { now += 16; batch.forEach(callback => callback(now)); }
    }
    if (error) throw error;
    frames = [];
    const result = Object.assign(record || (godHit ? { k: 'G' } : { k: '-' }), golden ? { g: 1 } : {}, godHit ? { god: 1 } : {});
    return debug ? { result, trace, calls } : result;
  };
}

let core = replace(read('core'), /const \$ = s => document.querySelector\(s\);/, 'const $ = () => effect;');
core = replace(core, /const GHOST_IMAGE = new Image\(\);\nGHOST_IMAGE.src = GHOST_SPRITE_DATA;/, 'const GHOST_IMAGE = {};');
const canvas = replace(read('canvas-helpers'), /const cv = \$\('#wheel'\); let ctx = cv.getContext\('2d'\);/, 'const cv = effect; let ctx = effect;');
const motion = replace(read('motion'), /const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/, 'const wait = async () => {};');
const source = [
  `let draw, speak, tick, ting, buzz, flap, pegBuzz, whoosh, playSfx;
   let setTiles, setWilds, hideFinal, logMove, pyramidRun, godRoom, bonusRun, monsterRun;`,
  core, read('content'), canvas, read('faces'), read('state'), motion, read('ui'),
  `
  mk = () => effect;
  setVerdict = setBtn = setTiles = setWilds = hideFinal = logMove = () => {};
  draw = speak = tick = ting = buzz = flap = pegBuzz = whoosh = popSound = playSfx = () => {};
  let liveK = -1, navCache = null, domeBulge = 0, evenA = 1, ghostSay = '', sayLast = null;
  let photoDone = true, doorPick = null, tapPick = null, god = null;
  let pyr = null, zena = null, roul = null, vault = null, pickIdx = -1, prize = null, bingo = [];
  const Perf = { low: true }, Music = effect;
  const phelanLine = () => '', phelanSay = () => {}, paintTile = () => {};
  N = 396; c = N / 2; R = N / 2 * .935 * .82; faces.layers = [];
  return (${pathHarness.toString()})();
  `,
].join('\n');
const factory = new Function('effect', 'Math', 'window', 'performance', 'requestAnimationFrame', 'matchMedia', 'addEventListener', 'seededRandom', `"use strict";\n${source}`);

export function createCore() {
  const math = Object.create(Math);
  math.random = seededRandom(1);
  return factory(presentation(), math, {}, { now: () => 0 }, () => {}, () => ({ matches: false }), () => {}, seededRandom);
}
