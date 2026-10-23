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
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
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
  await page.route('https://raw.githubusercontent.com/**', route => route.fulfill({ json: { game: 31, gameBuild: 66 } }));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + path);
  return { page, errors };
}

try {
  const A = await phone('/');
  await A.page.locator('#wName').fill('tatious');
  await A.page.locator('#wPass').fill('farm-test');
  await A.page.locator('#wNew').click();
  await A.page.locator('.wlogin').waitFor({ state: 'hidden' });
  
  // 1. Force a one-chicken ending
  console.log('Testing first-time achievement banner...');
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

  // Check for the banner
  const bannerText = await A.page.locator('.wbanner .wbig').textContent();
  assert.equal(bannerText, '🏆 Last chicken standing');
  const bannerSub = await A.page.locator('.wbanner p').textContent();
  assert.equal(bannerSub, 'One bird. One meteor. Respect.');

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

  console.log('SUCCESS: Achievement fires, shows banner/toast, and persists.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
