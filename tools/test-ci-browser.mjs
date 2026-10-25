import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('Usage: node tools/test-ci-browser.mjs <baseline-game.html>');
const root = new URL('../', import.meta.url);
const browserHtml = html => html.replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
const currentHtml = browserHtml(readFileSync(new URL('game/index.html', root), 'utf8'));
const baselineHtml = browserHtml(readFileSync(baselinePath, 'utf8'));
const releaseConfig = JSON.parse(currentHtml.match(/window\.WALLET_CFG\s*=\s*(\{[^;]*\})\s*;/)[1]);
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(request.url === '/baseline' ? baselineHtml : currentHtml);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});

async function spin(path, fps = 60) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  await page.addInitScript(fps => {
    let state = 123456789;
    Math.random = () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
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
  }, fps);
  const data = new Map();
  await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\.json$/, '').replace(/^\/+/, '');
    if (request.method() === 'GET') {
      await route.fulfill({ json: data.get(path) ?? null });
      return;
    }
    const body = request.postDataJSON();
    if (request.method() === 'PUT') data.set(path, body);
    if (request.method() === 'PATCH') data.set(path, { ...(data.get(path) || {}), ...body });
    if (request.method() === 'POST') {
      const id = `ci-${data.size}`;
      data.set(`${path}/${id}`, body);
      await route.fulfill({ json: { name: id } });
      return;
    }
    await route.fulfill({ json: body ?? null });
  });
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 25, gameBuild: 62 } }));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(`http://127.0.0.1:${address.port}${path}`);
    await page.locator('#wName').fill('test');
    await page.locator('#wPass').fill('ci-test');
    await page.locator('#wNew').click();
    await page.locator('.wlogin').waitFor({ state: 'hidden' });
    await page.locator('#spinBtn').click();
    await page.waitForFunction(() => {
      const button = document.querySelector('#spinBtn');
      return button.disabled || button.textContent !== 'Spin';
    }, null, { timeout: 10000 });
    const canvas = await page.locator('#wheel').boundingBox();
    const picks = [[.2, .45], [.5, .45], [.8, .45], [.2, .65], [.5, .65], [.8, .65], [.2, .82], [.5, .82], [.8, .82]];
    // Repeats and the newly unlocked wheels can legitimately exceed a minute.
    // Keep a finite per-run deadline and run FPS variants concurrently below.
    const started = Date.now(), deadline = started + 120000;
    while (Date.now() < deadline) {
      const state = await page.evaluate(() => ({
        done: !document.querySelector('#spinBtn').disabled && ['Spin', 'Back to the top'].includes(document.querySelector('#spinBtn').textContent),
        pick: document.querySelector('.stage').classList.contains('pick'),
      }));
      if (state.done) break;
      if (state.pick) {
        for (const [x, y] of picks) {
          await page.mouse.click(canvas.x + canvas.width * x, canvas.y + canvas.height * y);
          if (!await page.locator('.stage').evaluate(element => element.classList.contains('pick'))) break;
        }
      }
      await page.waitForTimeout(100);
    }
    const completed = await page.evaluate(() => !document.querySelector('#spinBtn').disabled && ['Spin', 'Back to the top'].includes(document.querySelector('#spinBtn').textContent));
    assert.ok(completed, `spin did not finish on ${path} at ${fps}fps: ${await page.evaluate(() => JSON.stringify({
      button: document.querySelector('#spinBtn').textContent,
      disabled: document.querySelector('#spinBtn').disabled,
      caption: document.querySelector('#caption').textContent,
      verdict: document.querySelector('#vEyebrow').textContent,
      title: document.querySelector('#vTitle').textContent,
    }))}`);
    const result = await page.locator('#verdict').innerText();
    const values = await page.evaluate(() => ({
      ev: window.WALLET_CFG.ev,
      edge: window.WALLET_CFG.edge,
      stakes: window.WALLET_CFG.stakes,
    }));
    assert.deepEqual(errors, [], `console errors on ${path}`);
    console.log(`${path} at ${fps}fps completed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return { result, values };
  } finally {
    await context.close();
  }
}

try {
  const baseline = await spin('/baseline');
  const runs = await Promise.all([10, 30, 60, 120].map(async fps => ({ fps, ...await spin('/current', fps) })));
  for (const run of runs) assert.deepEqual(run.values, { ...baseline.values, ev: releaseConfig.ev }, `released EV and unchanged edge/stakes must match at ${run.fps} fps`);
  for (let i = 1; i < runs.length; i++) assert.equal(runs[i].result, runs[0].result, `seeded spin results must match at ${runs[0].fps} and ${runs[i].fps} fps`);
  console.log('Seeded 360px headless spin matches at 10, 30, 60, and 120 fps; EV matches the release config; edge and stakes match main; no browser console errors.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
