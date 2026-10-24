import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const html = readFileSync(new URL('../chat.html', import.meta.url), 'utf8');
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});

try {
  for (const width of [320, 390, 440]) {
    let ref = 'cached';
    let typing = { who: 'gemini', at: new Date().toISOString() };
    const cached = Array.from({ length: 24 }, (_, i) => ({
      body: `Cached message ${i}`,
      at: new Date(Date.now() - (24 - i) * 60000).toISOString(),
      login: 'cillian1',
    }));
    let feed = cached;
    const context = await browser.newContext({ viewport: { width, height: 700 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(messages => localStorage.setItem('banter2', JSON.stringify(messages)), cached);
    await page.route('https://api.github.com/repos/cillian1/belfast-wheel-app/git/ref/heads/banter', route =>
      route.fulfill({ json: { object: { sha: ref } } }));
    await page.route('https://raw.githubusercontent.com/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/banter.json')) return route.fulfill({ json: feed });
      if (path.endsWith('/typing.json')) return route.fulfill({ json: typing });
      if (path.endsWith('/meta.json')) return route.fulfill({ json: { n: feed.length } });
      return route.fulfill({ status: 404 });
    });

    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Live'));
      const jump = page.locator('#jumpLatest');
      assert.equal(await page.locator('.dots').count(), 1, `${width}px: mocked typing indicator is displayed`);
      assert.equal(await jump.isVisible(), false, `${width}px: cached messages are not marked new`);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForFunction(() => !document.querySelector('#jumpLatest').hidden);
      assert.equal(await jump.getAttribute('aria-label'), 'Jump to latest messages', `${width}px: cached history does not show a new-message indicator`);

      const anchor = await page.evaluate(() => {
        const bubble = [...document.querySelectorAll('.bubble')].find(el => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight;
        });
        return { text: bubble.textContent, top: bubble.getBoundingClientRect().top };
      });
      ref = 'updated';
      typing = {};
      feed = [...cached, ...[1, 2].map(i => ({
        body: `New message ${i}`,
        at: new Date(Date.now() + i * 1000).toISOString(),
        login: 'github-actions[bot]',
      }))];
      await page.evaluate(() => load());
      await page.waitForFunction(() => document.querySelector('#jumpLatest').getAttribute('aria-label').startsWith('New messages'));
      assert.ok(await jump.isVisible(), `${width}px: new feed messages reveal the jump button`);
      assert.ok((await jump.boundingBox()).height >= 44, `${width}px: jump target is thumb-sized`);
      const anchorAfter = await page.locator('.bubble').filter({ hasText: anchor.text }).first().evaluate(el => el.getBoundingClientRect().top);
      assert.ok(Math.abs(anchorAfter - anchor.top) < 12, `${width}px: refresh preserves the reader's position (${anchor.top} -> ${anchorAfter})`);

      const controls = await page.evaluate(() => {
        const jump = document.querySelector('#jumpLatest').getBoundingClientRect();
        const say = document.querySelector('.say').getBoundingClientRect();
        return { jump, say, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
      });
      assert.equal(controls.reduced, true);
      assert.ok(controls.jump.bottom <= controls.say.top || controls.jump.top >= controls.say.bottom, `${width}px: jump button does not overlap Say something`);

      await jump.focus();
      await jump.press('Enter');
      await page.waitForFunction(() => document.querySelector('#jumpLatest').hidden);
      await page.waitForFunction(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2);
      assert.equal(await page.locator('#jumpLatest').getAttribute('aria-label'), 'Jump to latest messages', `${width}px: jumping clears the new-message label`);

      await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForFunction(() => !document.querySelector('#jumpLatest').hidden);
      ref = 'newer';
      feed = [...feed, {
        body: 'New message 3',
        at: new Date(Date.now() + 3000).toISOString(),
        login: 'cillian1',
      }];
      await page.evaluate(() => load());
      await page.waitForFunction(() => document.querySelector('#jumpLatest').getAttribute('aria-label').startsWith('New messages'));
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.querySelector('#jumpLatest').hidden);
      assert.equal(await page.locator('#jumpLatest').getAttribute('aria-label'), 'Jump to latest messages', `${width}px: returning to the bottom clears new messages`);
      const overlap = await page.evaluate(() => {
        const message = document.querySelector('#main .msg:last-child .bubble').getBoundingClientRect();
        const say = document.querySelector('.say').getBoundingClientRect();
        return message.bottom > say.top && message.top < say.bottom;
      });
      assert.equal(overlap, false, `${width}px: latest message does not overlap Say something`);
      assert.equal(await page.locator('.msg').last().locator('.bubble').textContent(), 'New message 3');
    } finally {
      await context.close();
    }
  }
  console.log('Banter cached/new-message state, keyboard jump, reduced-motion behavior, and 320/390/440px layout passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
