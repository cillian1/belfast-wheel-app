import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathHarness, seededRandom } from './core.mjs';
import { openCoreBrowser } from './core-browser.mjs';
import { liveTipChance } from './core-source.mjs';

const count = Number(process.argv[2] || 200);
if (!Number.isSafeInteger(count) || count < 1) throw new Error('Expected a positive seed count');
let html = readFileSync(new URL('../../game/index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const wallet = html.indexOf('<script>window.WALLET_CFG');
assert.ok(wallet > 0, 'wallet boundary changed');
html = html.slice(0, wallet) + '<script>window.$m = v => v;</script></body></html>';
assert.match(html, /const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/);
html = html.replace(/const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/, 'const wait = async () => {};');
assert.match(html, /else setTimeout\(res, 500\);/);
html = html.replace(/else setTimeout\(res, 500\);/, 'else res();');
assert.match(html, /const RACE_CHANCE = [.\d]+,/);
html = html.replace(/const RACE_CHANCE = [.\d]+,/, 'const RACE_CHANCE = 1,');
const { browser, pages: [core] } = await openCoreBrowser();
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
    // Verdict layout must not resize physics geometry while fake time runs.
    fitStage = resize = () => {};
  });
  // This uses the full bundled browser game, including its real geometry/setup.
  // Only the existing fastsim room-stop hooks and virtual scheduling are shared.
  await page.evaluate(`window.__spinPath = (() => {
    const seededRandom = ${seededRandom.toString()};
    return (${pathHarness.toString()})(true);
  })()`);
  const geometry = await page.evaluate(() => ({ n: N }));
  assert.equal(geometry.n, 396, 'oracle canvas geometry changed');
  await core.evaluate(() => {
    const forbidden = () => { throw new Error('Core must not use DOM, canvas, audio or timers'); };
    document.querySelector = document.createElement = forbidden;
    HTMLCanvasElement.prototype.getContext = forbidden;
    window.AudioContext = window.setTimeout = window.setInterval = window.requestAnimationFrame = forbidden;
  });
  const records = [];
  for (let seed = 1; seed <= count; seed++) {
    const expected = await page.evaluate(({ seed, tip }) => window.__spinPath(seed, tip, true),
      { seed, tip: liveTipChance });
    const actual = await core.evaluate(({ seed, tip }) => window.__spinPath(seed, tip, true),
      { seed, tip: liveTipChance });
    assert.deepEqual(actual, expected, `path mismatch for seed ${seed}`);
    records.push(expected.result);
  }
  for (let offset = 0; offset < count; offset += 100) {
    const batch = await core.evaluate(({ start, count, tip }) => window.__spinBatch(start, count, tip),
      { start: offset + 1, count: Math.min(100, count - offset), tip: liveTipChance });
    assert.deepEqual(batch, records.slice(offset, offset + batch.length), `runner batch mismatch at seed ${offset + 1}`);
  }
  console.log(`${count} full browser/core paths identical (${((performance.now() - started) / 1000).toFixed(3)} s)`);
} finally {
  await browser.close();
}
