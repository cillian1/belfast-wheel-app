// Render the production gamble UI without connecting to Firebase or wagering.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const source = readFileSync(new URL('../src/wallet/ui.js', import.meta.url), 'utf8');
const css = source.match(/const css = `([\s\S]*?)`;/)[1];
const render = source.match(/  function renderGamble\([^]*?\n  \}/)[0];
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 780 } });
    await page.setContent(`<style>*{box-sizing:border-box}.wrow{display:flex;gap:8px}${css}</style><div id="finalCard"><div class="wgamble" id="fixture"></div></div>`);
    for (const spectator of [false, true]) {
      for (const phase of ['offer', 'flipping', 'reveal']) {
        const result = await page.evaluate(({ render, phase, spectator }) => {
          const box = document.getElementById('fixture');
          const eur = cents => '€' + (cents / 100).toFixed(2);
          const now = () => Date.now();
          const draw = new Function('gambleBox', 'eur', 'now', `${render};return renderGamble;`)(box, eur, now);
          draw(box, { amount: Number.MAX_SAFE_INTEGER, ladderAmount: Number.MAX_SAFE_INTEGER * 2, count: 12, phase, revealAt: now() + 1500, ...(phase === 'reveal' ? { won: false } : {}) }, spectator);
          return {
            fits: document.documentElement.scrollWidth <= innerWidth && [...box.querySelectorAll('.gladder>div,button')].every(el => el.getBoundingClientRect().right <= innerWidth),
            buttons: [...box.querySelectorAll('button')].map(el => ({ text: el.textContent, disabled: el.disabled })),
            glow: getComputedStyle(box.querySelector('.ggamb')).animationName,
            ladder: getComputedStyle(box.querySelector('.gladder')).animationName
          };
        }, { render, phase, spectator });
        assert.ok(result.fits, `${width}px ${phase}, spectator=${spectator}: no horizontal overflow`);
        assert.deepEqual(result.buttons.map(b => b.text), ['GAMBLE', 'COLLECT']);
        if (spectator || phase !== 'offer') assert.ok(result.buttons.every(b => b.disabled));
        else assert.ok(result.buttons.every(b => !b.disabled));
        if (phase === 'offer') assert.equal(result.glow, 'gambleGlow');
        if (phase === 'flipping') assert.equal(result.ladder, 'gambleLadder');
      }
    }
    await page.close();
  }
  console.log('Gamble layout: 320px/390px, large amounts, offer/reveal animation and spectator controls passed.');
} finally {
  await browser.close();
}
