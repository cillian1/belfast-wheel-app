import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createCore } from './core.mjs';

if (!isMainThread) {
  const spin = createCore(), records = [];
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
  const seed = Number(option('seed', 1)), tip = Number(option('tip', .10));
  if (engine !== 'core' || !Number.isSafeInteger(spins) || spins < 1 ||
      !Number.isSafeInteger(workers) || workers < 1 || !Number.isSafeInteger(seed) ||
      !Number.isFinite(tip) || tip < 0 || tip > 1) throw new Error('Expected --engine core --spins N [--workers N --seed N --tip 0..1]');
  const start = performance.now(), jobs = [];
  for (let offset = 0; offset < spins;) {
    const count = Math.min(Math.ceil(spins / workers), spins - offset);
    const worker = new Worker(new URL(import.meta.url), { workerData: { start: seed + offset, count, tip } });
    jobs.push(new Promise((resolve, reject) => {
      worker.once('message', resolve); worker.once('error', reject);
      worker.once('exit', code => { if (code) reject(new Error(`Worker exited ${code}`)); });
    }));
    offset += count;
  }
  console.log(JSON.stringify((await Promise.all(jobs)).flat()));
  console.error(`${spins} spins, ${Math.min(workers, spins)} workers: ${((performance.now() - start) / 1000).toFixed(3)} s`);
  console.error('PARTIAL wheel/room stage only: D records still need dice/ball-drop/farm simulation; do not use for EV.');
}
