import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8')
  .replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g, '');
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack));
  await page.route('https://**/*', route => route.fulfill({ json: null }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => typeof faces !== 'undefined' && faces.wildBall);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector('.wlogin').hidden = true;
    setTiles(2, 2);
    document.querySelectorAll('#wilds canvas').forEach(k => k.getAnimations().forEach(a => a.finish()));
  });
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const alignment = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#wilds canvas')].map(k => k.getBoundingClientRect());
      return [...document.querySelectorAll('.wlab > span')].map((k, i) => {
        const r = k.getBoundingClientRect(), a = tiles[i * 3], b = tiles[i * 3 + 2];
        return { delta: Math.abs((r.left + r.right - a.left - b.right) / 2), font: parseFloat(getComputedStyle(k).fontSize), below: r.top >= a.bottom };
      });
    });
    alignment.forEach(label => {
      assert.ok(label.delta < 1, `labels align with their tile group at ${width}px`);
      assert.ok(label.font >= 11 && label.below, 'labels are readable and do not overlap tiles');
    });
  }
  const labels = await page.evaluate(() => {
    const text = [], original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (s, ...args) { text.push(s); return original.call(this, s, ...args); };
    try {
      buildRing([{ wild: true }, { bonus: true }, { boost: 'W' }, { boost: 'B' }], PALS[0]);
      const wheel = text.slice();
      delete specialMarks.W; delete specialMarks.B; text.length = 0;
      for (const kind of ['W', 'B']) {
        const ball = buildBall(kind), mark = specialMark(kind);
        if (mark !== specialMark(kind)) throw new Error('mark was not cached');
        if (!ball.getContext('2d').getImageData(8, 8, 1, 1).data[3]) throw new Error('ball is empty');
      }
      const cached = text.slice(); text.length = 0;
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      const draws = [];
      CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
        if (img && img.width === 64 && img.height === 64) draws.push(img);
        return originalDrawImage.call(this, img, ...args);
      };
      try {
        for (const kind of ['W', 'B']) for (const dir of [-1, 1]) {
          const chickenDrawsBefore = draws.length;
          drawChicken(ctx, c, c, N * .055, dir, 0, 0, 0, kind);
          if (draws.length > chickenDrawsBefore) throw new Error('drawChicken still draws a mark');
          drawDie3D(ctx, c, c, N * .06, [1, 0, 0, 0, 1, 0, 0, 0, 1], kind);
          drawDie3D(ctx, c, c, N * .06, [-1, 0, 0, 0, 1, 0, 0, 0, -1], kind);
        }
      } finally { CanvasRenderingContext2D.prototype.drawImage = originalDrawImage; }
      return { wheel, cached, frame: text.slice(), markDraws: draws.length };
    } finally { CanvasRenderingContext2D.prototype.fillText = original; draw(); }
  });
  for (const label of ['WILD', 'BONUS', 'MORE']) assert.ok(labels.wheel.includes(label), `${label} is baked into wheel faces`);
  assert.deepEqual(labels.cached, ['W', 'B'], 'each special mark is built once');
  assert.deepEqual(labels.frame, [], 'dice draw cached marks, never per-frame text');
  assert.equal(labels.markDraws, 8, 'dice draw 8 marks total (2 kinds * 2 directions * 2 faces each)');

  const shot = async name => {
    if (shots) await page.screenshot({ path: resolve(shots, `${name}-360.png`) });
  };
  await shot('tiles');
  await page.evaluate(() => { liveK = 1; zoom = 1 / S; draw(); });
  await shot('wild-slice');
  await page.evaluate(() => {
    scene = 'farm'; faces.farm = buildFarm(); camX = 0; showMark = 0; formT = [];
    chickens = ['W', 'B'].map((special, i) => ({ x: N * (.35 + i * .3), y: N * .7, pop: 1, dir: i ? -1 : 1, ph: 0, peck: 0, alive: true, special }));
    draw();
  });
  await shot('special-chickens');
  await page.evaluate(() => { scene = 'nested'; zoom = 1; liveK = -1; draw(); });
  await page.locator('#helpBtn').click();
  assert.match(await page.locator('#howToPlay').innerText(), /Gold Cleopatra = WILD\. Purple ankh = BONUS\. Collect 3 of a kind\./);
  await shot('how-to');
  assert.deepEqual(errors, []);
  console.log('Special labels: 320/360px alignment, cached wheel/ball/die/chicken marks and help text passed.');
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
