const replace = (source, pattern, value) => {
  if (!pattern.test(source)) throw new Error(`Game source changed: ${pattern}`);
  return source.replace(pattern, value);
};

// Presentation sinks, not a DOM or canvas. Run setup functions unchanged: some
// cached artwork still consumes gameplay RNG, so skipping it would change paths.
function presentation() {
  const sink = { width: 0, contains: () => false, measureText: () => ({ width: 0 }) };
  for (const name of [
    'getContext', 'save', 'restore', 'translate', 'rotate', 'scale', 'transform', 'setTransform',
    'beginPath', 'closePath', 'arc', 'arcTo', 'ellipse', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo',
    'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'clip', 'drawImage', 'fillText', 'strokeText',
    'createLinearGradient', 'createRadialGradient', 'createConicGradient', 'addColorStop',
    'start', 'setLevel', 'setMode', 'duck', 'sting', 'add', 'remove', 'toggle',
  ]) sink[name] = () => sink;
  sink.classList = sink;
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
export function pathHarness(full = false, compute = false) {
  let now = 0, frames = [], record = null, golden = false, godHit = false;
  let trace = [], calls = 0, tracing = false;
  let random = seededRandom(1);
  Math.random = () => { calls++; return random(); };
  let physics = false;
  const layer = spinLayer;
  spinLayer = async (...args) => { const result = await layer(...args); if (tracing) trace.push(['wheel', args[0], result, calls]); return result; };
  if (full) {
    const roll = rollDice, drop = runDrop, pipesRun = runPipes, d6Run = rollD6, chain = markChain;
    if (compute) {
      const step = physicsStep, empty = [];
      let board, pegFloor;
      physicsStep = dt => {
        if (board !== B) {
          board = B;
          pegFloor = Math.max(...B.pegs.map(p => p.y));
        }
        const pegs = B.pegs, free = balls.filter(b => b.free), reach = ballR + B.pr;
        let index = 0;
        // Each iteration begins after the original step integrates this ball.
        // Below the lowest peg every original `dy > rr` test would reject.
        B.pegs = {
          [Symbol.iterator]() {
            return (free[index++].y - pegFloor > reach ? empty : pegs).values();
          },
        };
        try { step(dt); } finally { B.pegs = pegs; }
      };
    }
    rollDice = async () => { physics = true; const result = await roll(); physics = false; if (tracing) trace.push(['dice', result, dice.map(d => d.v), calls]); return result; };
    runDrop = async (...args) => {
      physics = true; await drop(...args); physics = false; if (tracing) trace.push(['drop', countSlots(), calls]);
    };
    runPipes = async () => { physics = true; await pipesRun(); physics = false; if (tracing) trace.push(['pipes', pipes.green, pipes.tray.length, calls]); };
    rollD6 = async () => { physics = true; const result = await d6Run(); physics = false; if (tracing) trace.push(['d6', result, calls]); return result; };
    const farm = farmLoop;
    farmLoop = async (...args) => { physics = true; await farm(...args); physics = false; };
    const burst = burstDice, deal = dealFinal;
    burstDice = async () => { if (tracing) trace.push(['burst-start', calls, wellBalls.length]); await burst(); if (tracing) trace.push(['burst', calls, wellBalls.length]); };
    dealFinal = () => { if (tracing) trace.push(['deal-start', calls, FINAL_POOL.length]); deal(); if (tracing) trace.push(['deal', calls]); };
    markChain = async (...args) => {
      if (tracing) trace.push(['farm', winner, args[2], calls]);
      return chain(...args);
    };
    chickenRace = async (steps, alive) => {
      if (tracing) trace.push(['chickens', alive.map(ch => [ch.special || null, ch.count || 0, ch.mult || 1.5]), calls]);
      stop({
        k: 'M', race: 1, n: alive.length, sp: alive.filter(ch => ch.special).length,
        sw: alive.filter(ch => ch.special === 'W').length, sb: alive.filter(ch => ch.special === 'B').length,
        ch: alive.filter(ch => ch.special).map(ch => ({
          special: ch.special, count: ch.count || 1, mult: ch.mult || 1.5,
        })),
      });
    };
    // Revenge is a downstream prize room, not part of path sampling.
    phelanRevenge = async () => ({ t: '', b: '' });
  } else {
    rollDice = async () => {
      stop({ k: 'D', w: dice.filter(d => d.sp === 'W').length, b: dice.filter(d => d.sp === 'B').length });
    };
  }
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
    random = seededRandom(seed);
    calls = 0; trace = []; tracing = debug;
    TIP_CHANCE = tip;
    record = null; golden = false; godHit = false; frames = []; now = 0; physics = false;
    // A seed describes a fresh spin, independent of boot-time drawing or workers.
    clearSpecialDice();
    dice.forEach(d => { d.x = d.hx; d.y = d.hy; d.M = null; d.z = 0; d.v = 1; });
    DEPTH = typeof BASE_DEPTH === 'undefined' ? MAXD - 1 : BASE_DEPTH; rot.fill(0); lastQuote = -1;
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
      // Physics owns the frame queue until it settles. Drain those callbacks
      // synchronously; retain microtask interleaving for the dice-burst producer.
      if (!(compute && physics && frames.length)) await Promise.resolve();
      const batch = frames; frames = [];
      if (batch.length) { now += 16; batch.forEach(callback => callback(now)); }
    }
    if (error) throw error;
    frames = [];
    const result = Object.assign(record || (godHit ? { k: 'G' } : { k: '-' }), golden ? { g: 1 } : {}, godHit ? { god: 1 } : {});
    return debug ? { result, trace, calls } : result;
  };
}

export function createCore(sources, { full = false } = {}) {
  const read = name => {
    if (typeof sources[name] !== 'string') throw new Error(`Missing game source: ${name}`);
    return sources[name];
  };
  let core = replace(read('core'), /const \$ = s => document.querySelector\(s\);/, 'const $ = () => effect;');
  core = replace(core, /const GHOST_IMAGE = new Image\(\);\r?\nGHOST_IMAGE.src = GHOST_SPRITE_DATA;/, 'const GHOST_IMAGE = {};');
  const canvas = replace(read('canvas-helpers'), /const cv = \$\('#wheel'\); let ctx = cv.getContext\('2d'\);/, 'const cv = effect; let ctx = effect;');
  const motion = replace(read('motion'), /const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\r?\n\}\);/, 'const wait = async () => {};');
  const mark = full ? replace(read('mark-ending'), /else setTimeout\(res, 500\);/, 'else res();') : '';
  const source = [
  `let draw, speak, tick, ting, buzz, flap, pegBuzz, whoosh, playSfx;
   let setTiles, setWilds, hideFinal, logMove, pyramidRun, godRoom, bonusRun, monsterRun, chickenRace, phelanRevenge;`,
  core, read('content'), canvas, read('faces'), read('state'), read('dice'), motion,
  full ? read('ball-physics') : '', read('ui'), mark,
  `
  mk = () => effect;
  setVerdict = setBtn = setTiles = setWilds = hideFinal = logMove = () => {};
  draw = speak = tick = ting = buzz = flap = pegBuzz = whoosh = popSound = playSfx = () => {};
  let liveK = -1, navCache = null, domeBulge = 0, evenA = 1, ghostSay = '', sayLast = null;
  let photoDone = true, doorPick = null, tapPick = null, god = null;
  let pyr = null, zena = null, roul = null, vault = null, pickIdx = -1, prize = null, bingo = [];
  const Perf = { low: true }, Music = effect, AC = null, RACE_CHANCE = 1;
  const phelanLine = () => '', phelanSay = () => {}, paintTile = () => {};
  ${full ? 'const wildTiles = [];' : ''}
  N = 396; c = N / 2; R = N / 2 * .935 * .82; faces.layers = [];
  return (${pathHarness.toString()})(${full}, true);
  `,
].join('\n');
  const factory = new Function('effect', 'Math', 'window', 'performance', 'requestAnimationFrame', 'matchMedia', 'addEventListener', 'seededRandom', `"use strict";\n${source}`);
  const math = Object.defineProperties({}, Object.getOwnPropertyDescriptors(Math));
  math.random = seededRandom(1);
  return factory(presentation(), math, {}, { now: () => 0 }, () => {}, () => ({ matches: false }), () => {}, seededRandom);
}
