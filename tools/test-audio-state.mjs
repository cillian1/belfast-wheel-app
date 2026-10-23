import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('game/index.html', root), 'utf8');
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});

async function runTest() {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();

  await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**', route => route.fulfill({ json: {} }));
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 31, gameBuild: 99 } }));

  try {
    await page.goto(origin);

    // Login to get to the game
    await page.locator('#wName').fill('test');
    await page.locator('#wPass').fill('ci-test');
    await page.locator('#wNew').click();
    await page.locator('.wlogin').waitFor({ state: 'hidden' });

    // Tap Spin to start audio
    await page.locator('#spinBtn').click();

    // Check AC state
    let state = await page.evaluate(() => AC.state);
    assert.equal(state, 'running', 'AudioContext should be running after user gesture (Spin)');

    // Check Mute button label
    let muteText = await page.locator('#muteBtn').textContent();
    let isMuted = await page.evaluate(() => Music.muted);
    assert.equal(muteText, isMuted ? 'Unmute' : 'Mute', 'Mute button label should match initial state');

    // Simulate Background (hide)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // In some browsers, AC might stay running but we duck the volume.
    // We want to ensure it's still running (or resumes) after we come back.

    // Simulate Foreground (show)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Check AC state after show
    state = await page.evaluate(() => AC.state);
    assert.equal(state, 'running', 'AudioContext should be running after visibility restore');

    // Toggle Mute
    await page.locator('#muteBtn').click();
    muteText = await page.locator('#muteBtn').textContent();
    isMuted = await page.evaluate(() => Music.muted);
    assert.equal(muteText, isMuted ? 'Unmute' : 'Mute', 'Mute button label should match after toggle');
    assert.ok(isMuted, 'Should be muted after toggle');

    console.log('Audio state and mute label checks passed.');
  } finally {
    await context.close();
  }
}

try {
  await runTest();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
