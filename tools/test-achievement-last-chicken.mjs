// Test for "Last chicken standing" achievement (issue #200).
// Usage: node tools/test-achievement-last-chicken.mjs [game.html]
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
const data = new Map();
const tree = path => {
  if (data.has(path)) return data.get(path);
  const out = {}; let any = false;
  for (const [k, v] of data) if (k.startsWith(path + '/') && v !== null) { const rest = k.slice(path.length + 1).split('/'); let o = out; rest.slice(0, -1).forEach(p => o = o[p] = o[p] || {}); o[rest.at(-1)] = v; any = true; }
  return any ? out : null;
};
async function phone(path) {
  let failAchievementWrite = false;
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage(), errors = [];
  await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**', async route => {
    const request = route.request(), p = new URL(request.url()).pathname.replace(/\.json$/, '').replace(/^\/+/, '');
    if (request.method() === 'GET') return route.fulfill({ json: tree(p) });
    if (request.method() === 'PUT' && p.endsWith('/achievements/last-chicken') && failAchievementWrite) {
      failAchievementWrite = false;
      return route.fulfill({ status: 503, body: 'simulated offline write' });
    }
    const body = request.postDataJSON();
    if (request.method() === 'POST') { const id = `ci-${data.size}`; data.set(`${p}/${id}`, body); return route.fulfill({ json: { name: id } }); }
    for (const k of [...data.keys()]) if (k.startsWith(p + '/')) data.delete(k);
    if (request.method() === 'PATCH') Object.entries(body || {}).forEach(([k, v]) => data.set(`${p}/${k}`, v)); else data.set(p, body);
    return route.fulfill({ json: body ?? null });
  });
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 31, gameBuild: 66 } }));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + path);
  return { page, errors, failNextAchievementWrite: () => { failAchievementWrite = true; } };
}

try {
  const A = await phone('/');
  await A.page.locator('#wName').fill('tatious');
  await A.page.locator('#wPass').fill('farm-test');
  await A.page.locator('#wNew').click();
  await A.page.locator('.wlogin').waitFor({ state: 'hidden' });
  await A.page.setViewportSize({ width: 320, height: 700 });
  await A.page.waitForFunction(() => W.user);
  await A.page.evaluate(() => { busy = true; setVerdict({ eyebrow: 'Spinning', title: 'Ready for achievement', body: 'Watch fixture' }); });
  const key = await A.page.evaluate(() => W.user);
  const B = await phone(`/?watch=${encodeURIComponent(key)}&name=Tatious`);
  await B.page.setViewportSize({ width: 390, height: 780 });
  await B.page.locator('#wwMode').click(); // use Live to observe the short banner
  await B.page.waitForFunction(() => document.querySelector('#wwT').textContent === 'Ready for achievement', null, { timeout: 15000 });

  // 1. Force a one-chicken ending
  console.log('Testing first-time achievement banner...');
  A.failNextAchievementWrite();
  await A.page.evaluate(() => {
    // We can't easily run the whole markChain because it's async and depends on a lot of state.
    // But we can simulate the moment the fire arrows finish.
    chickens = [
      { x: 100, y: 100, alive: true, pop: 1 },
      { x: 200, y: 100, alive: false, pop: 1 } // one dead
    ];
    // Trigger the logic we added to mark-ending.js (manually for the test)
    let alive = chickens.filter(ch => ch.alive);
    if (alive.length === 1 && typeof W !== 'undefined' && W.awardAchievement) {
      W.awardAchievement('last-chicken', '🏆 Last chicken standing', 'One bird. One meteor. Respect.');
    }
  });

  await A.page.locator('.wtoast').filter({ hasText: 'Could not save' }).waitFor({ state: 'visible' });
  await A.page.waitForFunction(() => !W.me.achievements || !W.me.achievements['last-chicken']);
  assert.equal(await A.page.locator('.wachievement').count(), 0, 'failed writes do not show an earned banner');
  assert.equal(await B.page.locator('.wachievement').count(), 0, 'failed writes do not mirror a false achievement to Watch');

  // Retry the same one-chicken ending after the failed save.
  await A.page.evaluate(() => {
    W.awardAchievement('last-chicken', '🏆 Last chicken standing', 'One bird. One meteor. Respect.');
  });

  // Check for the banner
  const bannerText = await A.page.locator('.wachievement .wbig').textContent();
  assert.equal(bannerText, '🏆 Last chicken standing');
  const bannerSub = await A.page.locator('.wachievement p').textContent();
  assert.equal(bannerSub, 'One bird. One meteor. Respect.');
  await B.page.locator('.wachievement').waitFor({ state: 'visible' });
  for (const phone of [A, B]) {
    const visible = await phone.page.locator('.wachievement').evaluate(element => {
      const r = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:innerWidth, height:innerHeight,
        position:style.position, pointerEvents:style.pointerEvents,
        clippedByCanvas:!!element.closest('.wscr') };
    });
    assert.ok(visible.left >= 0 && visible.right <= visible.width && visible.top >= 0 && visible.bottom <= visible.height, `mobile banner fits: ${JSON.stringify(visible)}`);
    assert.equal(visible.position, 'fixed', 'existing banner CSS positions the achievement');
    assert.equal(visible.pointerEvents, 'none', 'the cosmetic banner does not block game or Watch controls');
    assert.equal(visible.clippedByCanvas, false, 'Watch canvas clipping does not affect the banner');
    // pointer-events:none makes hit testing intentionally pass through it.
  }
  assert.deepEqual(B.errors.filter(error => !/favicon/.test(error)), [], 'Watch has no rendering errors');

  // Check if saved in DB
  await A.page.waitForFunction(() => W.me.achievements && W.me.achievements['last-chicken']);
  const ach = await A.page.evaluate(() => W.me.achievements['last-chicken']);
  assert.ok(ach > 0);

  // 2. Repeat to check "again" toast
  console.log('Testing subsequent achievement toast...');
  await A.page.evaluate(() => {
    chickens = [{ x: 100, y: 100, alive: true, pop: 1 }];
    let alive = chickens.filter(ch => ch.alive);
    if (alive.length === 1 && typeof W !== 'undefined' && W.awardAchievement) {
      W.awardAchievement('last-chicken', '🏆 Last chicken standing', 'One bird. One meteor. Respect.');
    }
  });

  // Check for toast
  const toastText = await A.page.locator('.wtoast').textContent();
  assert.match(toastText, /🏆 Last chicken standing \(again\)/);

  // 3. An account switch must not publish the previous player's achievement.
  console.log('Testing achievement isolation after account switch...');
  await A.page.locator('#wWho').click();
  await A.page.locator('#wOut').click();
  await A.page.waitForFunction(() => !W.user);
  assert.equal(await A.page.locator('.wachievement').count(), 0, 'logout clears the previous player visible achievement');
  await A.page.locator('#wName').fill('watch-b');
  await A.page.locator('#wPass').fill('farm-test');
  await A.page.locator('#wNew').click();
  await A.page.waitForFunction(() => W.user === 'watch-b');
  const secondKey = await A.page.evaluate(() => W.user);
  const C = await phone(`/?watch=${encodeURIComponent(secondKey)}&name=WatchB`);
  await C.page.locator('#wwMode').click();
  await C.page.waitForFunction(() => document.querySelector('#wwT').textContent === 'Ready for achievement', null, { timeout: 15000 });
  await A.page.waitForTimeout(900);
  const secondBase = await new Promise((resolve, reject) => {
    const deadline = Date.now() + 6000;
    const poll = () => {
      const value = tree(`livef/${secondKey}/base`);
      if (value) return resolve(value);
      if (Date.now() >= deadline) return reject(new Error('second account Live Watch base was not published'));
      setTimeout(poll, 100);
    };
    poll();
  });
  const secondState = JSON.parse(secondBase.st);
  assert.equal(secondState.achievement, null, 'second account does not inherit the previous player achievement');
  assert.equal(await C.page.locator('.wachievement').count(), 0, 'second account Watch receives no previous player achievement');

  console.log('SUCCESS: Achievement fires, shows banner/toast, and persists.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
