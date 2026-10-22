// Fast room-odds sim: the real game code, but time is fake and nothing waits (rAF and timers fire immediately).
// usage: node tools/sim/fastsim.mjs game/index.html 10000 .10 3 1 > runs.json (file, spins, TIP_CHANCE, pages, seed)
// Records one line per spin: room reached (W/B/G/P), M = farm run (Chicken Race forced on; race.py weights it), - = nothing.
import fs from 'fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const playwrightModule = process.env.SIM_PLAYWRIGHT_MODULE ||
  (fs.existsSync('/opt/node-tools/node_modules/playwright/index.mjs') ? '/opt/node-tools/node_modules/playwright/index.mjs' : 'playwright');
const moduleSpecifier = path.isAbsolute(playwrightModule) ? pathToFileURL(playwrightModule).href : playwrightModule;
const { chromium } = await import(moduleSpecifier);
const [file, runs = '1000', tip = '.25', pages = '3', seed = '1'] = process.argv.slice(2);
if (!file || !Number.isInteger(+runs) || +runs < 1 || !Number.isInteger(+pages) || +pages < 1 || !Number.isInteger(+seed) || +seed < 0 || +seed > 0xffffffff) {
  throw new Error('Usage: fastsim.mjs game.html [spins] [tip] [pages] [seed]');
}
let html = fs.readFileSync(file, 'utf8');
const waitStart = html.indexOf('const wait = ms =>');
const waitEnd = html.indexOf("addEventListener('pointerdown'", waitStart);
if (waitStart < 0 || waitEnd < 0) throw new Error('wait() changed');
html = html.slice(0, waitStart) + 'const wait = ms => new Promise(r => { __now += ms; setTimeout(r, 0); });\n' + html.slice(waitEnd);
const wl = html.indexOf('<script>window.WALLET_CFG'); if (wl > 0) html = html.slice(0, wl) + '<script>window.$m = v => v;</script></body></html>';
const raceChance = html.match(/const\s+RACE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/);
if (!raceChance) throw new Error('race changed');
html = html.replace(raceChance[0], 'const RACE_CHANCE = 1');
const executablePath = process.env.SIM_CHROMIUM_EXECUTABLE ||
  (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : chromium.executablePath());
const b = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
async function worker(n, firstSpin) {
  const p = await b.newPage({ viewport: { width: 400, height: 800 } });
  await p.route('**/*', r => r.request().url().startsWith('http://sim/') ? r.fulfill({ body: Buffer.from(html), contentType: 'text/html; charset=utf-8' }) : r.abort());
  p.on('pageerror', e => { if (!/stop/.test(e.message)) console.error('ERR', e.message); });
  await p.addInitScript(seedValue => {
    let randomState = 0;
    window.__setSimSeed = seed => { randomState = seed >>> 0; };
    Math.random = () => {
      let t = randomState += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    window.__setSimSeed(seedValue);
    window.__now = 0;
    performance.now = () => window.__now; Date.now = (d => () => d + window.__now)(Date.now());
    const mc = new MessageChannel(), q = []; mc.port1.onmessage = () => { const f = q.shift(); f && f(); };
    const soon = f => { q.push(f); mc.port2.postMessage(0); };
    window.requestAnimationFrame = cb => { soon(() => { window.__now += 16; cb(window.__now); }); return 1; };
    window.cancelAnimationFrame = () => {};
    window.setInterval = () => 0; // watchdog and timers that would never settle
  }, +seed);
  await p.goto('http://sim/');
  await p.waitForFunction(() => typeof spin === 'function');
  return p.evaluate(async ([tip, n, baseSeed, startAt]) => {
    TIP_CHANCE = +tip;
    draw = () => {}; speak = () => {};
    animate = (d, step) => { try { step(1); } catch (e) {} return Promise.resolve(); };
    let rec = null; const stop = o => { rec = o; throw new Error('stop'); };
    pyramidRun = async () => stop({ k: 'P' }); godRoom = async () => { godHitRec = 1; };
    bonusRun = async (s, w, b) => stop({ k: 'W', w, b }); monsterRun = async (s, w, b) => stop({ k: 'B', w, b });
    chickenRace = async (s, alive) => stop({ k: 'M', race: 1, n: alive.length, sp: alive.filter(c => c.special).length, sw: alive.filter(c => c.special === 'W').length, sb: alive.filter(c => c.special === 'B').length });
    let gold = 0; window.godHitRec = 0; const _gr = goldenRun; goldenRun = async (...a) => { gold = 1; return _gr(...a); };
    const out = [];
    for (let i = 0; i < n; i++) {
      window.__setSimSeed((+baseSeed + Math.imul(startAt + i + 1, 0x9e3779b9)) >>> 0);
      rec = null; gold = 0; godHitRec = 0; scene = 'nested'; zoom = 1; photoDone = true;
      await spin();
      out.push(Object.assign(rec || (godHitRec ? { k: 'G' } : { k: '-' }), gold ? { g: 1 } : {}, godHitRec ? { god: 1 } : {}));
    }
    return out;
  }, [tip, n, seed, firstSpin]);
}
const workerCount = Math.min(+runs, +pages), per = Math.floor(+runs / workerCount), extra = +runs % workerCount;
const t0 = Date.now();
let res;
try {
  res = (await Promise.all(Array.from({ length: workerCount }, (_, i) => {
    const count = per + (i < extra ? 1 : 0);
    const firstSpin = i * per + Math.min(i, extra);
    return worker(count, firstSpin);
  }))).flat();
} finally {
  await b.close();
}
console.log(JSON.stringify(res));
console.error('secs', (Date.now() - t0) / 1000);
