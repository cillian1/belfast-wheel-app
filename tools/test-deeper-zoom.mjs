import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('game/index.html', root), 'utf8').replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
const data = new Map();
await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**', async route => {
  const request = route.request(), key = new URL(request.url()).pathname.replace(/\.json$/, '').replace(/^\/+/, '');
  if (request.method() === 'GET') { await route.fulfill({ json: data.get(key) ?? null }); return; }
  const body = request.postDataJSON();
  if (request.method() === 'PUT') data.set(key, body);
  if (request.method() === 'PATCH') data.set(key, { ...(data.get(key) || {}), ...body });
  if (request.method() === 'POST') {
    const id = `zoom-${data.size}`;
    data.set(`${key}/${id}`, body);
    await route.fulfill({ json: { name: id } });
    return;
  }
  await route.fulfill({ json: body ?? null });
});
await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 32, gameBuild: 69 } }));
await page.addInitScript(fps => {
  let nextId = 0, nextFrame = 0, timer = null;
  const callbacks = new Map(), interval = 1000 / fps;
  window.requestAnimationFrame = callback => {
    const id = ++nextId;
    callbacks.set(id, callback);
    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        const now = performance.now();
        nextFrame = now + interval;
        const frame = [...callbacks.values()];
        callbacks.clear();
        frame.forEach(fn => fn(now));
      }, Math.max(0, nextFrame - performance.now()));
    }
    return id;
  };
  window.cancelAnimationFrame = id => callbacks.delete(id);
}, 10);
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.locator('#wName').fill('test');
  await page.locator('#wPass').fill('ci-test');
  await page.locator('#wNew').click();
  await page.locator('.wlogin').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.__wheelZoomSamples = [];
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(timestamp => {
      callback(timestamp);
      window.__wheelZoomSamples.push(window.eval('wheelZoom'));
    });
    let forceMainDeeper = true, state = 0x12345678;
    Math.random = () => {
      if (forceMainDeeper && new Error().stack.includes('target')) {
        forceMainDeeper = false;
        return .1;
      }
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  });
  await page.locator('#spinBtn').click();
  await page.waitForFunction(() => window.eval('wheelZoom') > 1, null, { timeout: 20000 });
  await page.waitForFunction(() => Math.abs(window.eval('wheelZoom') - 1.14) < .001, null, { timeout: 10000 });
  const zoom = await page.evaluate(() => ({
    samples: window.__wheelZoomSamples,
    n: window.eval('N'),
    d: window.eval('D'),
    r: window.eval('R'),
    value: window.eval('wheelZoom'),
    canvas: document.querySelector('#wheel').getBoundingClientRect().toJSON(),
  }));
  assert.equal(await page.locator('#vTitle').textContent(), 'Go deeper', 'the first spin lands on Go deeper');
  const settledAt = zoom.samples.findIndex(value => value >= 1.139);
  assert.ok(settledAt > 4, `the board zoom is animated across multiple frames (${zoom.samples.length} samples)`);
  const transition = zoom.samples.slice(0, settledAt + 1);
  assert.ok(transition.every((value, i) => i === 0 || value >= transition[i - 1]), 'the board zoom progresses smoothly without reversing');
  const radius = zoom.r * .93 * zoom.value / zoom.d;
  assert.ok(radius < zoom.canvas.width / 2 && radius < zoom.canvas.height / 2, 'the full outer wheel remains inside the canvas');
  assert.ok(Math.abs(zoom.canvas.width - zoom.canvas.height) < 1, 'the wheel canvas stays square');
  await page.waitForFunction(() => window.eval('liveK') > 0, null, { timeout: 20000 });
  await page.evaluate(() => {
    const chat = document.createElement('aside');
    chat.id = 'test-chat-overlay';
    chat.setAttribute('role', 'dialog');
    chat.setAttribute('aria-label', 'Chat');
    chat.textContent = 'Chat open';
    chat.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;padding:12px;background:#222;color:white';
    document.body.append(chat);
  });
  assert.equal(await page.locator('#test-chat-overlay').innerText(), 'Chat open', 'the chat overlay is open during the deeper wheel sequence');
  const canvas = await page.locator('#wheel').boundingBox();
  const picks = [[.2, .45], [.5, .45], [.8, .45], [.2, .65], [.5, .65], [.8, .65], [.2, .82], [.5, .82], [.8, .82]];
  const deadline = Date.now() + 120000;
  let landed = null, completed = false;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const button = document.querySelector('#spinBtn');
      return {
        done: !button.disabled && button.textContent !== 'Wheels turning' && button.textContent !== 'Spin',
        pick: document.querySelector('.stage').classList.contains('pick'),
        scene: window.eval('scene'),
        winner: window.eval('winner'),
        counts: window.eval('counts'),
        balls: window.eval('balls').length,
      };
    });
    if (state.winner >= 0 && !landed) landed = state;
    if (state.done) { completed = true; break; }
    if (state.pick) {
      for (const [x, y] of picks) {
        await page.mouse.click(canvas.x + canvas.width * x, canvas.y + canvas.height * y);
        if (!await page.locator('.stage').evaluate(element => element.classList.contains('pick'))) break;
      }
    }
    await page.waitForTimeout(100);
  }
  assert.ok(landed, 'the ball run lands while the chat overlay is open');
  assert.ok(landed.winner >= 0 && landed.counts.reduce((sum, count) => sum + count, 0) === landed.balls, 'all balls are counted in the landed slots');
  assert.ok(completed, 'the full spin completes while the chat overlay is open');
  await page.locator('#test-chat-overlay').evaluate(element => element.remove());
  await page.locator('#spinBtn').click();
  await page.waitForFunction(() => window.eval('scene') === 'nested' && window.eval('wheelZoom') === 1, null, { timeout: 10000 });
  assert.deepEqual(errors, [], 'no browser console errors occur during the run, overlay, or return to the wheel');
  console.log('First-spin Deeper zoom animates smoothly, keeps the full wheel in frame, finishes the ball run with a chat overlay open, and resets on return.');
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
