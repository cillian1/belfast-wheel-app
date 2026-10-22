import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createCore, pathHarness, seededRandom } from './core.mjs';

const count = Number(process.argv[2] || 200);
if (!Number.isSafeInteger(count) || count < 1) throw new Error('Expected a positive seed count');
let html = readFileSync(new URL('../../game/index.html', import.meta.url), 'utf8');
const wallet = html.indexOf('<script>window.WALLET_CFG');
assert.ok(wallet > 0, 'wallet boundary changed');
html = html.slice(0, wallet) + '<script>window.$m = v => v;</script></body></html>';
assert.match(html, /const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/);
html = html.replace(/const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/, 'const wait = async () => {};');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const started = performance.now();
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
  await page.route('**/*', route => route.request().url() === 'http://sim/' ?
    route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }) : route.abort());
  await page.addInitScript(() => {
    window.setInterval = () => 0;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto('http://sim/');
  await page.evaluate(() => {
    audio = tick = ting = buzz = flap = pegBuzz = whoosh = popSound = playSfx = () => {};
    Music.start = Music.setMode = Music.setLevel = Music.duck = Music.sting = () => {};
    phelanSay = () => {};
  });
  // This uses the full bundled browser game, including its real geometry/setup.
  // Only the existing fastsim room-stop hooks and virtual scheduling are shared.
  await page.evaluate(`window.__spinPath = (() => {
    const seededRandom = ${seededRandom.toString()};
    return (${pathHarness.toString()})();
  })()`);
  const geometry = await page.evaluate(() => ({ n: N }));
  assert.equal(geometry.n, 396, 'oracle canvas geometry changed');
  const core = createCore();
  for (let seed = 1; seed <= count; seed++) {
    const expected = await page.evaluate(seed => window.__spinPath(seed, .10, true), seed);
    assert.deepEqual(await core(seed, .10, true), expected, `path mismatch for seed ${seed}`);
  }
  console.log(`${count} browser/core wheel paths and room choices identical (${((performance.now() - started) / 1000).toFixed(3)} s); dice/farm not implemented`);
} finally {
  await browser.close();
}
