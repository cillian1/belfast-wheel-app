import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/game/mark-ending.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  // These declarations end on an unindented closing brace. Ignore inner blocks.
  const end = source.indexOf('\n}', start);
  assert.ok(end > start, `Missing end of ${name}`);
  return source.slice(start, end + 2);
}
const drawSize = source.match(/function chickenDrawSize\([^\n]+/)[0];
const calls = [];
const noop = () => {};
const context = vm.createContext({
  Math: Object.assign(Object.create(Math), { random: () => { throw new Error('Drawing/flight planning consumed gameplay RNG'); } }),
  ctx: { save: noop, clip: noop, drawImage: noop, restore: noop },
  rrect: noop, faces: { farm: {} }, camX: 390, N: 390, D: 1, c: 195,
  fires: [], raceLine: 0, chickenDrawOrder: [], chickens: [], carried: [], feathers: [], arrows: [],
  compareChickenY: (a, b) => a.y - b.y,
  showMark: 0, chainNote: '',
  easeInOut: t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  lerp: (a, b, t) => a + (b - a) * t,
  drawMarkWedge: (...args) => calls.push(args),
});
vm.runInContext(`${drawSize}\n${extract('planMarkFlights')}\n${extract('drawFarm')}`, context);

for (const size of [2, 4, 16]) {
  const alive = [
    { x: 440, y: 300 },
    { x: 480, y: 310, special: 'W', size, mult: size * 1.5 },
    { x: 520, y: 320 },
    { x: 560, y: 330, special: 'B', size, mult: size * 1.5 },
  ];
  const items = [{ kind: 'B' }, {}, { kind: 'W' }, {}];
  const plan = context.planMarkFlights(items, alive, alive.length, 390);
  assert.equal(plan.fliers.length, alive.length, 'Each surviving chicken flies into exactly one slot');
  assert.equal(new Set(plan.fliers).size, alive.length, 'No chicken is duplicated');
  const slots = Array.from(plan.formT, ft => ft.idx);
  assert.deepEqual(slots.slice().sort((a, b) => a - b), [0, 1, 2, 3], 'All wheel slots have exactly one chicken');
  for (const kind of ['W', 'B']) {
    const special = Array.from(plan.formT).filter(ft => ft.kind === kind);
    assert.equal(special.length, 1, `${kind} remains one slot at size ${size}`);
    assert.equal(items[special[0].idx].kind, kind, 'Special flies to its own prize slot');
  }
  context.markItems = items;
  context.formT = plan.formT;
  for (const progress of [.01, .25, .5, .75, 1]) {
    plan.formT.forEach(ft => { ft.t = progress; });
    calls.length = 0;
    for (let frame = 0; frame < 3; frame++) context.drawFarm(frame * 16.67);
    assert.equal(calls.length, alive.length * 3, 'One drawn wedge per chicken per frame');
    calls.forEach(([slot, count, x, y, scale]) => {
      assert.equal(count, items.length);
      assert.ok(slots.includes(slot));
      assert.ok(scale > 0 && scale <= 1, `Size ${size} chicken wedge overlaps neighbours at progress ${progress}: scale ${scale}`);
      if (progress === 1) {
        assert.equal(scale, 1, 'Every completed wedge has normal wheel-slot geometry');
        assert.equal(x, context.c);
        assert.equal(y, context.c);
      }
    });
    const firstFrame = calls.slice(0, alive.length);
    assert.deepEqual(calls.slice(alive.length, alive.length * 2), firstFrame, 'Repeated drawing does not change slot/geometry');
  }
}
console.log('Mark wheel: large special chickens each map to one normal-size slot; forming wedges never overscale or consume RNG.');
