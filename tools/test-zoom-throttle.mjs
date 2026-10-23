import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

const ref = process.argv[2];
assert.ok(ref, 'pass a git ref containing game/index.html');
const html = execFileSync('git', ['show', `${ref}:game/index.html`], { encoding: 'utf8' })
  .replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
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
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
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
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.__frameTimes = [];
  let last = -1;
  window.requestAnimationFrame = callback => raf(timestamp => {
    if (timestamp !== last) window.__frameTimes.push(timestamp);
    last = timestamp;
    callback(timestamp);
  });
});
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(error.message));

function frameStats(frames) {
  const gaps = frames.slice(1).map((time, index) => time - frames[index]).sort((a, b) => a - b);
  assert.ok(gaps.length > 10, `enough real animation frames were measured (${gaps.length + 1})`);
  const percentile = p => gaps[Math.min(gaps.length - 1, Math.floor((gaps.length - 1) * p))];
  return {
    frames: frames.length,
    averageFps: Math.round((frames.length - 1) * 1000 / (frames.at(-1) - frames[0]) * 10) / 10,
    medianMs: Math.round(percentile(.5) * 10) / 10,
    p95Ms: Math.round(percentile(.95) * 10) / 10,
    maxMs: Math.round(gaps.at(-1) * 10) / 10,
  };
}

try {
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.locator('#wName').fill('test');
  await page.locator('#wPass').fill('ci-test');
  await page.locator('#wNew').click();
  await page.locator('.wlogin').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
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

  const wheelStart = await page.evaluate(() => window.__frameTimes.length);
  await page.locator('#spinBtn').click();
  await page.waitForFunction(() => document.querySelector('#vTitle').textContent === 'Go deeper', null, { timeout: 30000 });
  const wheelEnd = await page.evaluate(() => window.__frameTimes.length);
  const wheelFrames = await page.evaluate(([start, end]) => window.__frameTimes.slice(start, end), [wheelStart, wheelEnd]);
  const wheel = frameStats(wheelFrames);

  let zoom = null;
  if (html.includes('function zoomWheelTo(')) {
    const zoomStart = await page.evaluate(() => window.__frameTimes.length);
    await page.waitForFunction(() => window.eval('wheelZoom') > 1, null, { timeout: 30000 });
    await page.waitForFunction(() => Math.abs(window.eval('wheelZoom') - 1.14) < .001, null, { timeout: 15000 });
    const zoomEnd = await page.evaluate(() => window.__frameTimes.length);
    zoom = frameStats(await page.evaluate(([start, end]) => window.__frameTimes.slice(start, end), [zoomStart, zoomEnd]));
  }

  await page.waitForFunction(() => window.eval('liveK') > 0, null, { timeout: 30000 });
  const canvas = await page.locator('#wheel').boundingBox();
  const picks = [[.2, .45], [.5, .45], [.8, .45], [.2, .65], [.5, .65], [.8, .65], [.2, .82], [.5, .82], [.8, .82]];
  const deadline = Date.now() + 120000;
  let ballStart = null, ballEnd = null, landed = null, completed = false;
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
        frames: window.__frameTimes.length,
      };
    });
    if (state.scene === 'final' && ballStart === null) ballStart = state.frames;
    if (state.winner >= 0 && !landed) landed = state;
    if (state.done) {
      completed = true;
      ballEnd = state.frames;
      break;
    }
    if (state.pick) {
      for (const [x, y] of picks) {
        await page.mouse.click(canvas.x + canvas.width * x, canvas.y + canvas.height * y);
        if (!await page.locator('.stage').evaluate(element => element.classList.contains('pick'))) break;
      }
    }
    await page.waitForTimeout(100);
  }
  assert.ok(landed, 'the ball run lands');
  assert.ok(landed.winner >= 0 && landed.counts.reduce((sum, count) => sum + count, 0) === landed.balls, 'all balls are counted in the landed slots');
  assert.ok(completed && ballStart !== null && ballEnd !== null, 'the full ball run completes');
  const ballFrames = await page.evaluate(([start, end]) => window.__frameTimes.slice(start, end), [ballStart, ballEnd]);
  const ball = frameStats(ballFrames);
  assert.deepEqual(errors, [], 'no browser console errors occur during the run');
  console.log(JSON.stringify({ ref, device: 'mobile emulation 360x800 DPR 3', cpuThrottle: '6x', wheel, zoom, ball }));
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
