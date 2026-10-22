import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createCore } from './core.mjs';
import { liveTipChance, sources } from './core-source.mjs';

if (!isMainThread) {
  const spin = createCore(sources), records = [];
  for (let i = 0; i < workerData.count; i++) records.push(await spin(workerData.start + i, workerData.tip));
  parentPort.postMessage(records);
} else {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? fallback : args[i + 1];
  };
  const engine = option('engine', 'core'), spins = Number(option('spins', 10000));
  const workers = Number(option('workers', Math.min(4, availableParallelism())));
  const seed = Number(option('seed', 1)), tip = Number(option('tip', liveTipChance));
  if (!['core', 'node'].includes(engine) || !Number.isSafeInteger(spins) || spins < 1 ||
      !Number.isSafeInteger(workers) || workers < 1 || !Number.isSafeInteger(seed) ||
      !Number.isFinite(tip) || tip < 0 || tip > 1) throw new Error('Expected --engine core|node --spins N [--workers N --seed N --tip 0..1]');
  const start = performance.now(), jobs = [];
  let browser;
  try {
    const pages = engine === 'core' ? await (async () => {
      const { openCoreBrowser } = await import('./core-browser.mjs');
      const pool = await openCoreBrowser(Math.min(workers, spins));
      browser = pool.browser;
      return pool.pages;
    })() : [];
    if (engine === 'core') {
      let next = 0;
      const records = new Array(spins);
      await Promise.all(pages.map(async page => {
        while (next < spins) {
          const offset = next, count = Math.min(100, spins - offset);
          next += count;
          const batch = await page.evaluate(({ start, count, tip }) =>
            window.__spinBatch(start, count, tip), { start: seed + offset, count, tip });
          for (let i = 0; i < count; i++) records[offset + i] = batch[i];
        }
      }));
      console.log(JSON.stringify(records));
    } else {
      for (let offset = 0; offset < spins;) {
        const count = Math.min(Math.ceil(spins / workers), spins - offset);
        const start = seed + offset;
        const worker = new Worker(new URL(import.meta.url), { workerData: { start, count, tip } });
        jobs.push(new Promise((resolve, reject) => {
          worker.once('message', resolve); worker.once('error', reject);
          worker.once('exit', code => { if (code) reject(new Error(`Worker exited ${code}`)); });
        }));
        offset += count;
      }
      console.log(JSON.stringify((await Promise.all(jobs)).flat()));
    }
  } finally {
    await browser?.close();
  }
  console.error(`${spins} spins, ${Math.min(workers, spins)} workers: ${((performance.now() - start) / 1000).toFixed(3)} s`);
  if (engine === 'node') console.error('PARTIAL wheel/room stage only: D records still need dice/ball-drop/farm simulation; do not use for EV.');
}
