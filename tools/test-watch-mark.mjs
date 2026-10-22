// Live Watch follows a player through Mark's wheel and into the next run (issue #78).
// Usage: node tools/test-watch-mark.mjs [game.html]   (needs @playwright/test, like test-ci-browser.mjs)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const html = readFileSync(process.argv[2] || new URL('game/index.html', root), 'utf8').replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
const server = createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const data = new Map(); // one shared fake Firebase for both phones
const tree = path => {
  if (data.has(path)) return data.get(path);
  const out = {}; let any = false;
  for (const [k, v] of data) if (k.startsWith(path + '/') && v !== null) { const rest = k.slice(path.length + 1).split('/'); let o = out; rest.slice(0, -1).forEach(p => o = o[p] = o[p] || {}); o[rest.at(-1)] = v; any = true; }
  return any ? out : null;
};
async function phone(path) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage(), errors = [];
  await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**', async route => {
    const request = route.request(), p = new URL(request.url()).pathname.replace(/\.json$/, '').replace(/^\/+/, '');
    if (request.method() === 'GET') return route.fulfill({ json: tree(p) });
    const body = request.postDataJSON();
    if (request.method() === 'POST') { const id = `ci-${data.size}`; data.set(`${p}/${id}`, body); return route.fulfill({ json: { name: id } }); }
    for (const k of [...data.keys()]) if (k.startsWith(p + '/')) data.delete(k);
    if (request.method() === 'PATCH') Object.entries(body || {}).forEach(([k, v]) => data.set(`${p}/${k}`, v)); else data.set(p, body);
    return route.fulfill({ json: body ?? null });
  });
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 29, gameBuild: 66 } }));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + path);
  return { page, errors };
}

try {
  const A = await phone('/');
  await A.page.locator('#wName').fill('markfan');
  await A.page.locator('#wPass').fill('ci-test');
  await A.page.locator('#wNew').click();
  await A.page.locator('.wlogin').waitFor({ state: 'hidden' });
  // phone A is part way through a run, on the farm with Mark's wheel up
  await A.page.evaluate(() => {
    busy = true; scene = 'farm'; faces.farm = buildFarm(); chickens = []; camX = 0;
    markItems = [['Leave Mark alone'], ['Ask Mark', 'anything'], ['€1.50', 'Mark', 'answers']].map((lbl, i) => ({ lbl, t: lbl.join(' '), b: '', kind: i === 2 ? 'W' : undefined }));
    faces.mark = buildMarkWheel(markItems);
    formT = markItems.map((it, idx) => ({ x: c, y: c, t: 1, idx, size: 1 })); showMark = 1; rotM = 1.1; markSpinning = true;
  });
  await A.page.waitForFunction(() => W.user);
  const key = await A.page.evaluate(() => W.user);
  const B = await phone(`/?watch=${encodeURIComponent(key)}&name=Markfan`);
  await B.page.locator('#wwMode').click(); // Go live: no three-second delay in the test
  // the viewer draws Mark's wheel with its labels, and follows the spin
  const shot = () => B.page.evaluate(() => document.querySelector('#wwCv').toDataURL());
  await B.page.waitForFunction(() => scene === 'farm' && rotM > 1, null, { timeout: 15000 });
  await B.page.waitForTimeout(500);
  const before = await shot();
  await A.page.evaluate(() => { rotM = 2.5; });
  await B.page.waitForFunction(() => Math.abs(rotM - 2.5) < .01, null, { timeout: 5000 });
  await B.page.waitForTimeout(500);
  const farmShot = await shot();
  assert.notEqual(farmShot, before, 'the viewer keeps drawing while Mark\'s wheel turns');
  assert.match(await B.page.locator('#wwSub').textContent(), /spinning/);
  // the run ends: "spinning" drops off
  await A.page.evaluate(() => { markSpinning = false; busy = false; setVerdict({ eyebrow: 'Final answer', title: 'Leave Mark alone', body: 'No question for Mark this time.' }); });
  await B.page.waitForFunction(() => document.querySelector('#wwT').textContent === 'Leave Mark alone' && !/spinning/.test(document.querySelector('#wwSub').textContent), null, { timeout: 5000 });
  // the next run starts back on the main wheel: the viewer follows it
  await A.page.evaluate(() => { busy = true; scene = 'nested'; markItems = []; formT = []; showMark = 0; document.querySelector('#caption').textContent = 'Next run'; });
  await B.page.waitForFunction(() => scene === 'nested' && document.querySelector('#wwC').textContent === 'Next run' && /spinning/.test(document.querySelector('#wwSub').textContent), null, { timeout: 5000 });
  await B.page.waitForTimeout(500);
  assert.notEqual(await shot(), farmShot, 'the viewer draws the next run');
  const arrowState = await A.page.evaluate(() => {
    const order = runOrders[0].slice(), down = order.indexOf('D2'), up = order.indexOf('U2');
    [order[down], order[up]] = [order[up], order[down]];
    setLayerOrder(1, order);
    DEPTH = 4; scene = 'nested'; zoom = 1 / Math.pow(S, 1); rot[1] = .6; draw();
    return { order, zoom, rotation: rot[1] };
  });
  await B.page.waitForFunction(({ order, zoom, rotation }) =>
    JSON.stringify(runOrders[0]) === JSON.stringify(order) &&
    Math.abs(zoom - (1 / Math.pow(S, 1))) < .01 && Math.abs(rot[1] - rotation) < .01, arrowState, { timeout: 5000 });
  const levelOne = await shot();
  await A.page.evaluate(() => { zoom = 1 / Math.pow(S, 3); rot[3] = 2; draw(); });
  await B.page.waitForFunction(() => Math.abs(zoom - (1 / Math.pow(S, 3))) < .01 && Math.abs(rot[3] - 2) < .01, null, { timeout: 5000 });
  await B.page.waitForTimeout(250);
  assert.notEqual(await shot(), levelOne, 'the viewer follows a two-level transition and changed double-arrow order');
  const mirroredArrows = await B.page.evaluate(() => ({
    down: LAYERS[1].filter(move => move.down === 2).length,
    up: LAYERS[1].filter(move => move.up === 2).length,
    face: faces.layers[1].width,
  }));
  assert.equal(mirroredArrows.down, 1, 'the mirrored wheel keeps its D2 slice');
  assert.equal(mirroredArrows.up, 1, 'the mirrored wheel keeps its U2 slice');
  assert.ok(mirroredArrows.face > 0, 'the mirrored wheel face is rebuilt for the changed slice order');
  const frozen = await B.page.evaluate(() => getComputedStyle(document.querySelector('#wwMsg')).display !== 'none' && document.querySelector('#wwMsg').textContent);
  assert.equal(frozen, false, `viewer shows a message over the run: ${frozen}`);
  assert.deepEqual(B.errors.filter(e => !/favicon/.test(e)), [], 'viewer console errors');
  console.log('Live Watch mirrors Mark\'s wheel and run, plus double-arrow order and a two-level nested-wheel transition.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
