import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

let html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
html = html.slice(0, html.indexOf('<script>window.WALLET_CFG')) + '<script>window.$m = v => v;</script></body></html>';
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await page.route('**/*', route => route.request().url() === 'http://bonus-frames/' ? route.fulfill({ body: html, contentType: 'text/html' }) : route.abort());
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.setInterval = () => 0; });
  await page.goto('http://bonus-frames/');
  const records = await page.evaluate(async () => {
    draw = tick = ting = () => {};
    animate = async (duration, step) => { step(1); };
    const records = [];
    for (const seed of [1, 42, 1000, 98765]) {
      const runs = [];
      for (const fps of [10, 30, 60, 120]) {
        let state = seed, calls = 0, now = 0, frames = [], done = false, failure;
        Math.random = () => { calls++; state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
        performance.now = () => now;
        window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
        const testDice = [null, null, 'W', 'B'].map((sp, i) => ({ x: N * (.2 + i * .18), y: N * .2, z: 0, M: randRot(), sp }));
        roll12(testDice).catch(error => { failure = error; }).finally(() => { done = true; });
        for (let i = 0; !done; i++) {
          if (i > 10000) throw new Error('Bonus dice simulation stalled');
          now += 1000 / fps;
          const pending = frames; frames = [];
          pending.forEach(callback => callback(now));
          await Promise.resolve();
        }
        if (failure) throw failure;
        runs.push({ calls, top: testDice.map(d => d.top), matrices: testDice.map(d => d.M) });
      }
      records.push({ seed, runs });
    }
    return records;
  });
  for (const { seed, runs } of records) {
    for (const run of runs.slice(1)) assert.deepEqual(run, runs[0], `bonus dice RNG, faces and settled matrices must match across FPS at seed ${seed}`);
  }
  console.log('Real bonus dice produce identical RNG draws, faces and matrices at 10/30/60/120fps for four seeds.');
} finally {
  await browser.close();
}
