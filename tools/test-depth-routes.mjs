import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentSource = readFileSync(resolve(root, 'src/game/content.js'), 'utf8');
const motionSource = readFileSync(resolve(root, 'src/game/motion.js'), 'utf8');
const uiSource = readFileSync(resolve(root, 'src/game/ui.js'), 'utf8');

function extract(source, pattern, description) {
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not find ${description}`);
  return match[0];
}

const mainSource = extract(contentSource, /const MAIN = \[[\s\S]*?\n\];/, 'main wheel data');
const moveSource = extract(contentSource, /const MOVE_DEFS = \{[\s\S]*?\n\};/, 'move definitions');
const ordersSource = extract(contentSource, /const LAYER_ORDERS = \[[\s\S]*?\n\];/, 'layer orders');
const { MAIN, MOVE_DEFS, LAYER_ORDERS } = new Function('metres', 'pick',
  `${mainSource}\n${moveSource}\n${ordersSource}\nreturn { MAIN, MOVE_DEFS, LAYER_ORDERS };`,
)(() => 1, choices => choices[0]);

const targetSource = extract(motionSource, /function target\(n\) \{[\s\S]*?\n\}/, 'spin target function');
const spinRunSource = extract(motionSource, /async function spinLayerRun\(k, dur, dir\) \{[\s\S]*?\n\}/, 'wheel spin function');
const runMainSource = extract(uiSource, /async function runMain\(\) \{[\s\S]*?\n\}/, 'main run function');
const backToMainSource = extract(uiSource, /async function backToMain\(\) \{[\s\S]*?\n\}/, 'return-to-main function');
const unlockDepthSource = extract(uiSource, /async function unlockDepth\(target\) \{[\s\S]*?\n\}/, 'depth unlock function');

// The strict boundary matters: a draw equal to one third is not below the tease chance.
const teaseChanceMatch = motionSource.match(/TEASE_CHANCE\s*=\s*([^;,\n]+)/);
if (!teaseChanceMatch) throw new Error('Could not find the tease chance');
const teaseChance = new Function(`return (${teaseChanceMatch[1]});`)();
assert.equal(teaseChance, 1 / 3, 'the spin tease chance is exactly one third');

async function testExactOneThirdBoundary() {
  const gameMath = Object.create(Math);
  const scripted = [.01, .5, .5, .5, 1 / 3];
  gameMath.random = () => scripted.length ? scripted.shift() : .5;
  const layers = [[], [{}, { wild: true }, {}]];
  const rotations = [0, 0], durations = [];
  const target = new Function('Math', 'TAU', `${targetSource}; return target;`)(gameMath, Math.PI * 2);
  const spinLayerRun = new Function(
    'Math', 'LAYERS', 'rot', 'TAU', 'GHOST_CHANCE', 'TIP_CHANCE', 'TEASE_CHANCE', 'target',
    'easeOut', 'easeInOut', 'lerp', 'sliceAt', 'mod', 'hotSlice', 'animate', 'ghostPhelan',
    'ghostReact', 'tick', 'flap', 'pegBuzz', 'draw', 'ting', 'buzz',
    `${spinRunSource}; return spinLayerRun;`,
  )(
    gameMath, layers, rotations, Math.PI * 2, 0, .3, teaseChance, target,
    t => 1 - (1 - t) ** 4,
    t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
    (a, b, t) => a + (b - a) * t,
    (r, n) => Math.floor((((-r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / n)) % n,
    (a, n) => ((a % n) + n) % n,
    item => !!(item && (item.wild || item.bonus || item.god)),
    async (duration, step) => { durations.push(duration); step(1); },
    async (k, i) => i, () => {}, () => {}, () => {}, () => {}, () => {}, () => {}, () => {},
  );
  assert.equal(await spinLayerRun(1, 1000, 1), 0, 'the ordinary target remains selected at the exact boundary');
  assert.deepEqual(durations, [1000], 'a draw equal to one third does not enter either tease animation');
}

function makeLayers() {
  const orders = LAYER_ORDERS.map(order => order.slice());
  const layers = [MAIN, ...LAYER_ORDERS.map(order => order.map(key => MOVE_DEFS[key]))];
  // The route contract exercises depth 7; reuse real source items for presentation-free layers
  // beyond the currently declared orders so the real runMain routing can be driven there.
  while (orders.length < 7) orders.push(orders.at(-1).slice());
  while (layers.length <= 7) layers.push(layers.at(-1).slice());
  return { orders, layers };
}

function makeHarness(initialDepth = 4) {
  const { orders, layers } = makeLayers();
  const events = [];
  const spins = [];
  const depthAtSpin = [];
  const unlockDepths = [];
  const stop = Symbol('end scripted route');
  const storeData = new Map();
  const randomValues = [];
  const noOp = () => {};
  const $ = selector => selector === '.stage'
    ? { classList: { remove: noOp } }
    : { textContent: '' };
  const env = {
    DEPTH: initialDepth,
    BASE_DEPTH: 4,
    MAXD: 7,
    MAIN,
    LAYERS: layers,
    DEAD_LAYERS: [],
    BASE_ORDERS: orders.map(order => order.slice()),
    runOrders: orders.map(order => order.slice()),
    setLayerOrder: noOp,
    setBtn: noOp,
    Music: { setLevel: noOp, setMode: noOp, duck: noOp, sting: noOp },
    setWilds: noOp,
    clearSpecialDice: noOp,
    deadA: Array(8).fill(0),
    deadTo: Array(8).fill(''),
    deadFrom: Array(8).fill(''),
    draw: noOp,
    spinLayer: async k => {
      spins.push(k);
      depthAtSpin.push(env.DEPTH);
      const event = events.shift();
      if (!event) throw stop;
      assert.equal(k, event.k, `scripted spin expected layer ${event.k}, got ${k}`);
      if (event.stopAfterSpin) throw stop;
      return event.index;
    },
    setVerdict: noOp,
    speak: noOp,
    logMove: noOp,
    quote: () => '',
    zoomWheelTo: async () => {},
    Math: Object.assign(Object.create(Math), { random: () => randomValues.length ? randomValues.shift() : .99 }),
    GOLDEN_CHANCE: 1 / 30,
    store: {
      get: (key, fallback) => storeData.has(key) ? storeData.get(key) : fallback,
      set: (key, value) => storeData.set(key, value),
    },
    wait: async () => {},
    boostRun: async () => {},
    S: 2,
    dive: async () => {},
    $,
    buzz: noOp,
    cap: value => value,
    playSfx: noOp,
    animate: async () => { unlockDepths.push(env.DEPTH); },
    easeInOut: t => t,
    ctx: {},
    N: 512,
    navCache: null,
    evenA: 0,
    whoosh: noOp,
    godRoom: async () => {},
    pyramidRun: async () => {},
    bonusRun: async () => {},
    monsterRun: async () => {},
    dice: [],
    addSpecialDice: () => [],
    rollDice: async () => 0,
    setTiles: (wild, bonus) => { env.lastTiles = [wild, bonus]; },
    lastTiles: [0, 0],
    metres: () => 1,
    scene: 'nested',
    zoom: 1,
    wheelZoom: 1,
    winGlow: null,
    ghost: null,
    ghostSay: '',
    doorPick: null,
    tapPick: null,
    pickIdx: -1,
    prize: null,
    bingo: [],
    balls: [],
    counts: null,
    winner: -1,
    flatT: 0,
    banner: '',
    fadeTo: async () => {},
    fade: 0,
    hideFinal: noOp,
    speechSynthesis: { cancel: noOp },
    zoomTo: async () => {},
  };
  const game = new Function('env', `
    with (env) {
      return (function () {
        ${runMainSource}
        ${backToMainSource}
        ${unlockDepthSource}
        return { runMain, backToMain, unlockDepth };
      })();
    }
  `)(env);

  function indexFor(k, key) {
    if (key === 'main-deeper') return 1;
    const order = layers[k];
    let index = order.findIndex(item => item === MOVE_DEFS[key]);
    if (index < 0) {
      index = order.length;
      order.push(MOVE_DEFS[key]);
    }
    return index;
  }

  async function run(plan, scriptedRandom = []) {
    events.splice(0, events.length, ...plan.map(({ k, key }) => ({
      k,
      index: key === 'STOP' ? -1 : indexFor(k, key),
      stopAfterSpin: key === 'STOP',
    })));
    randomValues.splice(0, randomValues.length, ...scriptedRandom);
    spins.length = 0;
    depthAtSpin.length = 0;
    unlockDepths.length = 0;
    try {
      await game.runMain();
    } catch (error) {
      if (error !== stop) throw error;
    }
    return { spins: spins.slice(), depthAtSpin: depthAtSpin.slice(), unlockDepths: unlockDepths.slice() };
  }

  return { env, game, run };
}

const deeper = { k: 0, key: 'main-deeper' };

async function testRepeatCollections() {
  const harness = makeHarness();
  const result = await harness.run([
    deeper,
    { k: 1, key: 'WD' },
    { k: 1, key: 'WD' },
    { k: 2, key: 'BN' },
    { k: 2, key: 'BN' },
    { k: 3, key: 'F' },
    { k: 4, key: 'STOP' },
  ], [.99, .1, .99, .1, .99]);
  assert.deepEqual(result.spins, [0, 1, 1, 2, 2, 3, 4], 'WILD and BONUS each repeat their own wheel');
  assert.deepEqual(harness.env.lastTiles, [2, 2], 'WILD and BONUS collections survive their repeats and both add again');
}

async function testHybridCollectorsRepeat() {
  const harness = makeHarness();
  const result = await harness.run([
    deeper,
    { k: 1, key: 'WD' },
    { k: 2, key: 'UW' },
    { k: 2, key: 'UW' },
    { k: 1, key: 'F' },
    { k: 2, key: 'UB' },
    { k: 2, key: 'UB' },
    { k: 1, key: 'F' },
    { k: 2, key: 'F' },
    { k: 3, key: 'F' },
    { k: 4, key: 'STOP' },
  ], [.99, .99, .1, .99, .1, .99]);
  assert.deepEqual(result.spins, [0, 1, 2, 2, 1, 2, 2, 1, 2, 3, 4], 'hybrid collectors repeat at their own level before backing up');
  assert.deepEqual(harness.env.lastTiles, [3, 2], 'repeated Wild and Bonus hybrid collectors are retained');
}

async function testU2AndOneLevelBackup() {
  const twoUp = makeHarness(7);
  const twoUpResult = await twoUp.run([
    deeper,
    { k: 1, key: 'F' }, { k: 2, key: 'F' }, { k: 3, key: 'U2' },
    { k: 3, key: 'U2' }, { k: 1, key: 'F' }, { k: 2, key: 'F' }, { k: 3, key: 'STOP' },
  ], [.99, .1, .99]);
  assert.deepEqual(twoUpResult.spins, [0, 1, 2, 3, 3, 1, 2, 3], 'U2 repeats the same level once, then backs up two levels');

  const oneUp = makeHarness(7);
  const oneUpResult = await oneUp.run([
    deeper,
    { k: 1, key: 'F' }, { k: 2, key: 'F' }, { k: 3, key: 'UP' }, { k: 2, key: 'F' }, { k: 3, key: 'STOP' },
  ]);
  assert.deepEqual(oneUpResult.spins, [0, 1, 2, 3, 2, 3], 'ordinary UP backs up one level and repeats level 2');
}

async function testD2AdvancesTwoLevels() {
  const harness = makeHarness(4);
  const result = await harness.run([
    deeper,
    { k: 1, key: 'F' }, { k: 2, key: 'F' }, { k: 3, key: 'D2' },
    { k: 5, key: 'STOP' },
  ]);
  assert.deepEqual(result.spins, [0, 1, 2, 3, 5], 'D2 from level 3 advances directly to level 5, not level 4');
  assert.equal(result.depthAtSpin.at(-1), 5, 'the fifth wheel is unlocked before it spins');
}

async function testProgressiveUnlockAndFreshRun() {
  const harness = makeHarness(4);
  const unlocked = await harness.run([
    deeper,
    { k: 1, key: 'F' }, { k: 2, key: 'F' }, { k: 3, key: 'F' },
    { k: 4, key: 'MD' }, { k: 5, key: 'MD' }, { k: 6, key: 'ED' },
    { k: 7, key: 'U2' }, { k: 7, key: 'U2' }, { k: 5, key: 'F' }, { k: 6, key: 'F' }, { k: 7, key: 'STOP' },
  ], [.99, .1, .99]);
  assert.deepEqual(unlocked.unlockDepths, [5, 6, 7], 'successive deeper results unlock one wheel at a time');
  assert.deepEqual(unlocked.spins.slice(-4), [7, 5, 6, 7], 'U2 repeats at level 7, then backs up and re-enters the unlocked seventh wheel');
  assert.deepEqual(unlocked.depthAtSpin.slice(-4), [7, 7, 7, 7], 'backing up and re-entering retain the unlocked depth');

  await harness.game.backToMain();
  assert.equal(harness.env.DEPTH, 4, 'returning to the main wheel resets depth for a fresh run');
  const fresh = await harness.run([deeper, { k: 1, key: 'STOP' }]);
  assert.equal(fresh.depthAtSpin[1], 4, 'a fresh deeper run starts at depth 4 after the reset');
  assert.equal(LAYER_ORDERS.length, 7, 'game data includes all seven unlockable inner wheels');
}

await testExactOneThirdBoundary();
await testRepeatCollections();
await testHybridCollectorsRepeat();
await testU2AndOneLevelBackup();
await testD2AdvancesTwoLevels();
await testProgressiveUnlockAndFreshRun();
console.log('Depth-route boundary, collectors, backups, D2 jumps, progressive unlocks, re-entry, and fresh-run reset are covered.');
