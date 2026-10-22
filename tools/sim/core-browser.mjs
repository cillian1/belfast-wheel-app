import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { sources } from './core-source.mjs';

export async function openCoreBrowser(workers = 1) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
  });
  try {
    const module = `data:text/javascript;base64,${readFileSync(new URL('./core.mjs', import.meta.url)).toString('base64')}`;
    const pages = await Promise.all(Array.from({ length: workers }, async () => {
      const page = await browser.newPage();
      await page.evaluate(async ({ module, sources }) => {
        const { createCore } = await import(module);
        window.__spinPath = createCore(sources, { full: true });
        window.__spinBatch = async (start, count, tip) => {
          const spin = createCore(sources, { full: true }), records = [];
          for (let i = 0; i < count; i++) records.push(await spin(start + i, tip));
          return records;
        };
      }, { module, sources });
      return page;
    }));
    return { browser, pages };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
