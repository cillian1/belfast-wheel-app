// Live Watch keeps the board, labels, message box and Stop watching on screen when the keyboard opens (issue #97).
// Usage: node tools/test-watch-keyboard.mjs [game.html] [screenshot-prefix]   (needs @playwright/test, like test-ci-browser.mjs)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const html = readFileSync(process.argv[2] || new URL('game/index.html', root), 'utf8').replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
const shots = process.argv[3];
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
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
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
// every row of the viewer sits inside the visible height, the board is square and unclipped, and there's no empty band at the bottom
async function layout(page, height, keyboard) {
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const r = id => { const b = document.querySelector(id).getBoundingClientRect(); return { top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
    return { scr: r('.wwatch .wscr'), cv: r('#wwCv'), head: r('.wwatch .wwh'), tiles: r('#wwTiles'), say: r('#wwSay'), stop: r('#wwX'), scroll: document.querySelector('.wwatch').scrollTop };
  });
  for (const [name, b] of Object.entries(box)) if (b.top !== undefined) assert.ok(b.top >= 0 && b.bottom <= height + 0.5, `${name} is on screen at ${height}px: ${JSON.stringify(b)}`);
  assert.ok(Math.abs(box.scr.width - box.scr.height) < 1 && box.scr.height >= 120, `board is square and visible: ${JSON.stringify(box.scr)}`);
  assert.ok(box.scr.height - box.cv.height <= 2, `board canvas isn't clipped: ${JSON.stringify(box)}`);
  if (keyboard) assert.ok(height - box.stop.bottom < 40, `no empty band under Stop watching: ${JSON.stringify(box.stop)}`);
  assert.equal(box.scroll, 0, 'the viewer did not scroll');
  return box;
}

try {
  const A = await phone('/');
  await A.page.locator('#wName').fill('kbfan');
  await A.page.locator('#wPass').fill('ci-test');
  await A.page.locator('#wNew').click();
  await A.page.locator('.wlogin').waitFor({ state: 'hidden' });
  await A.page.evaluate(() => { busy = true; setVerdict({ eyebrow: 'Spinning', title: 'Rooftop bar', body: 'and find a bar with a roof terrace' }); document.querySelector('#caption').textContent = 'Round and round'; });
  await A.page.waitForFunction(() => W.user);
  const key = await A.page.evaluate(() => W.user);
  const B = await phone(`/?watch=${encodeURIComponent(key)}&name=Kbfan`);
  await B.page.locator('#wwMode').click(); // Go live: no three-second delay in the test
  await B.page.waitForFunction(() => document.querySelector('#wwT').textContent === 'Rooftop bar', null, { timeout: 15000 });
  const open = await layout(B.page, 780);
  const openConsts = await B.page.evaluate(() => ({ N, c, R }));
  if (shots) await B.page.screenshot({ path: `${shots}-780.png` });
  // the keyboard opens: the visible height drops to 430px
  await B.page.locator('#wwSay').focus();
  await B.page.setViewportSize({ width: 360, height: 430 });
  const kb = await layout(B.page, 430, true);
  const kbConsts = await B.page.evaluate(() => ({ N, c, R }));
  if (shots) await B.page.screenshot({ path: `${shots}-430.png` });
  assert.ok(kb.scr.height < open.scr.height, 'the board shrinks to fit above the keyboard');
  assert.deepEqual(kbConsts, openConsts, 'drawing constants (N, c, R) stay the same even when the container shrinks, to match the mirrored state');
  // and closes again: back to normal
  await B.page.setViewportSize({ width: 360, height: 780 });
  const back = await layout(B.page, 780);
  assert.equal(back.scr.height, open.scr.height, 'the board goes back to its size when the keyboard closes');
  // Android's Back closes the keyboard but leaves the input focused: the verdict still comes back
  assert.ok(await B.page.evaluate(() => document.activeElement.id === 'wwSay' && getComputedStyle(document.querySelector('.wwatch .wvd')).display !== 'none'), 'the verdict shows again once the keyboard closes, even with the input still focused');
  // and opens again on the same focused input (no new focus event): the compact layout comes back
  await B.page.setViewportSize({ width: 360, height: 430 });
  const again = await layout(B.page, 430, true);
  assert.equal(again.scr.height, kb.scr.height, 'the second keyboard opening fits like the first');
  assert.ok(await B.page.evaluate(() => getComputedStyle(document.querySelector('.wwatch .wvd')).display === 'none'), 'the verdict steps aside again on the second opening');
  // Replay the same held drawing states on the player and delayed viewer. This
  // exercises the real capture/transport/mirApply path, not just MIRROR strings.
  await B.page.locator('#wwMode').click(); // restore the reported DELAYED mode
  await A.page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await A.page.waitForTimeout(100); // drain the one already scheduled game frame
  for (const phase of ['nested', 'final']) {
    const expected = await A.page.evaluate(phase => {
      scene = phase; zoom = 8; wheelZoom = 1.14; liveK = 3;
      photoZoom = .3; photoDone = true; snapA = 0;
      streak = .25; sweepOn = false; sweepA = 0;
      rot.fill(.2);
      draw();
      setVerdict({ eyebrow: phase === 'nested' ? 'Going deeper' : 'Final answer', title: `watch-${phase}`, body: 'Drawing-state regression' });
      return { N, c, R, D, scene, zoom, wheelZoom, liveK, photoZoom, photoDone, snapA, streak, sweepOn, sweepA, rot: [...rot] };
    }, phase);
    await B.page.waitForFunction(title => document.querySelector('#wwT').textContent === title, `watch-${phase}`, { timeout: 15000 });
    await B.page.waitForTimeout(700); // let the last interpolation finish
    const actual = await B.page.evaluate(() => ({ N, c, R, D, scene, zoom, wheelZoom, liveK, photoZoom, photoDone, snapA, streak, sweepOn, sweepA, rot: [...rot] }));
    for (const [name, value] of Object.entries(expected)) {
      if (typeof value === 'number') assert.ok(Math.abs(actual[name] - value) < .002, `${phase}: Watch ${name} matches player (${actual[name]} vs ${value})`);
      else assert.deepEqual(actual[name], value, `${phase}: Watch ${name} matches player`);
    }
  }
  assert.deepEqual(B.errors.filter(e => !/favicon/.test(e)), [], 'viewer console errors');
  assert.deepEqual(A.errors.filter(e => !/favicon/.test(e)), [], 'player console errors');
  console.log('Live Watch fits with the keyboard open/closed; delayed nested/final drawing state matches the same player state.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
