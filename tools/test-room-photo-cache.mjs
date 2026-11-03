import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roomSource = readFileSync(resolve(root, 'src/game/room.js'), 'utf8');
const showMeSource = readFileSync(resolve(root, 'src/game/show-me.js'), 'utf8');
const facesSource = readFileSync(resolve(root, 'src/game/faces.js'), 'utf8');
const drawingSource = readFileSync(resolve(root, 'src/game/drawing.js'), 'utf8');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`Could not find ${name}`);
  return match[0];
}

const drawRoom = extractFunction(roomSource, 'drawRoom');
const scheduleRoom = extractFunction(roomSource, 'scheduleRoom');
const pauseRoom = extractFunction(roomSource, 'pauseRoom');
assert.match(showMeSource, /busy = on; spinBtn\.disabled = on;\s*pauseRoom\(on\);/, 'locking the main wheel must pause and resume the room');

const frames = new Map(), cancelled = [], drawnFrames = [];
let nextFrameId = 0;
const roomTest = new Function(
  'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'drawRoomFrame', 'Perf', 'roomBg',
  `let roomRaf = 0, roomPaused = false, busy = false, lastRoom = 0;
  const RDp = 1;
  ${drawRoom}; ${scheduleRoom}; ${pauseRoom};
  return {
    drawRoom, scheduleRoom, pauseRoom,
    setBusy: value => { busy = value; },
    state: () => ({ roomRaf, roomPaused }),
  };`,
)(
  { hidden: false },
  callback => { const id = ++nextFrameId; frames.set(id, callback); return id; },
  id => { cancelled.push(id); frames.delete(id); },
  now => drawnFrames.push(now),
  { begin: () => 0, end() {} },
  {},
);
const runFrame = (id, now) => {
  const callback = frames.get(id);
  assert.ok(callback, `frame ${id} is queued`);
  frames.delete(id);
  callback(now);
};

roomTest.scheduleRoom();
const beforeSpin = roomTest.state().roomRaf;
assert.ok(beforeSpin, 'the room animation starts while idle');
roomTest.setBusy(true);
roomTest.pauseRoom(true);
assert.deepEqual(cancelled, [beforeSpin], 'the main-wheel lock cancels the queued room frame');
assert.deepEqual(roomTest.state(), { roomRaf: 0, roomPaused: true });

roomTest.setBusy(false);
roomTest.pauseRoom(false);
const resumed = roomTest.state().roomRaf;
assert.ok(resumed, 'unlocking the main wheel schedules the room animation again');
runFrame(resumed, 100);
assert.deepEqual(drawnFrames, [100], 'the room draws after the spin ends');

const duringSpin = roomTest.state().roomRaf;
roomTest.setBusy(true);
runFrame(duringSpin, 200);
assert.deepEqual(drawnFrames, [100], 'a busy main wheel prevents room drawing');
assert.equal(roomTest.state().roomRaf, 0, 'the room loop does not reschedule itself while busy');

roomTest.setBusy(false);
roomTest.pauseRoom(false);
runFrame(roomTest.state().roomRaf, 300);
assert.deepEqual(drawnFrames, [100, 300], 'the room loop can resume after a busy-frame stop');
console.log('Room rendering pauses and resumes with the main-wheel lock.');

function makeCanvas() {
  const canvas = { operations: [] };
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => canvas.operations.push([key, ...args]);
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  canvas.getContext = () => context;
  return canvas;
}

const canvases = [];
const mk = () => { const canvas = makeCanvas(); canvases.push(canvas); return canvas; };
const photoImg = { naturalWidth: 80, naturalHeight: 60 };
const faces = { dart: { name: 'dartboard' }, base: { name: 'chrome rim' } };
const buildPhoto = new Function(
  'mk', 'R', 'TAU', 'PHOTO_N', 'c', 'BASE', 'D', 'LABEL_FONT', 'photoImg', 'faces', 'bevel',
  `${extractFunction(facesSource, 'buildPhoto')}; return buildPhoto;`,
)(mk, 120, Math.PI * 2, 8, 120, 0, 2, 'sans-serif', photoImg, faces, () => {});

const photoWheel = buildPhoto();
const photoBase = faces.photoBase;
assert.ok(photoBase, 'building the photo wheel creates a static base canvas');
assert.notEqual(photoWheel, photoBase, 'the static base is separate from the rotating photo canvas');
assert.deepEqual(
  photoBase.operations.filter(([operation]) => operation === 'drawImage').map(([, image]) => image),
  [faces.dart, faces.base],
  'the static base combines the dartboard and chrome rim once',
);

const animatedDraws = [];
const drawContext = {
  globalCompositeOperation: 'source-over',
  save() {},
  restore() {},
  drawImage(image) { animatedDraws.push(image); },
};
const drawPhoto = new Function(
  'ctx', 'photoZoom', 'hi', 'c', 'BASE', 'PHOTO_N', 'R', 'lerp', 'faces',
  'drawScaled', 'rotP', 'hiA', 'drawPointer',
  `${extractFunction(drawingSource, 'drawPhoto')}; return drawPhoto;`,
)(
  drawContext, 0, null, 120, 0, 8, 120, (a, b, t) => a + (b - a) * t,
  { ...faces, photoBase, photo: photoWheel, sheen: { name: 'sheen' }, pointer: { name: 'pointer' } },
  image => animatedDraws.push(image), 0, 0, () => {},
);
for (let frame = 0; frame < 5; frame++) drawPhoto();
assert.equal(animatedDraws.filter(image => image === photoBase).length, 5, 'each animated frame composites the cached base');
assert.equal(animatedDraws.includes(faces.dart), false, 'animated frames do not redraw the dartboard');
assert.equal(animatedDraws.includes(faces.base), false, 'animated frames do not redraw the chrome rim');
console.log('Photo-wheel frames composite the cached static base instead of redrawing its layers.');
