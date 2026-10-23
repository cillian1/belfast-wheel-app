// Fast room-odds sim: the real game code, but time is fake and nothing waits (rAF and timers fire immediately).
// usage: node tools/sim/fastsim.mjs game/index.html 10000 .10 3 > runs.json   (file, spins, TIP_CHANCE, parallel pages)
// Records one line per spin: room reached (W/B/G/P), M = farm run (Chicken Race forced on; race.py weights it), - = nothing.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [file, runs = '1000', tip = '.25', pages = '3'] = process.argv.slice(2);
let html = fs.readFileSync(file, 'utf8');
const a = html.indexOf('const wait = ms => new Promise(r => {'), z = html.indexOf('pendingWaits.add(w);\n});', a);
if (a < 0 || z < 0) throw new Error('wait() changed');
html = html.slice(0, a) + 'const wait = ms => new Promise(r => { __now += ms; setTimeout(r, 0); });' + html.slice(z + 'pendingWaits.add(w);\n});'.length);
const wl = html.indexOf('<script>window.WALLET_CFG'); if (wl > 0) html = html.slice(0, wl) + '<script>window.$m = v => v;</script></body></html>';
if (!html.includes('const RACE_CHANCE = .25')) throw new Error('race changed'); html = html.replace('const RACE_CHANCE = .25', 'const RACE_CHANCE = 1');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
async function worker(n) {
  const p = await b.newPage({ viewport: { width: 400, height: 800 } });
  await p.route('**/*', r => r.request().url().startsWith('http://sim/') ? r.fulfill({ body: Buffer.from(html), contentType: 'text/html; charset=utf-8' }) : r.abort());
  p.on('pageerror', e => { if (!/stop/.test(e.message)) console.error('ERR', e.message); });
  await p.addInitScript(() => {
    window.__now = 0;
    performance.now = () => window.__now; Date.now = (d => () => d + window.__now)(Date.now());
    const mc = new MessageChannel(), q = []; mc.port1.onmessage = () => { const f = q.shift(); f && f(); };
    const soon = f => { q.push(f); mc.port2.postMessage(0); };
    window.requestAnimationFrame = cb => { soon(() => { window.__now += 16; cb(window.__now); }); return 1; };
    window.cancelAnimationFrame = () => {};
    window.setInterval = () => 0; // watchdog and timers that would never settle
  });
  await p.goto('http://sim/');
  await p.waitForFunction(() => typeof spin === 'function');
  return p.evaluate(async ([tip, n]) => {
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
      rec = null; gold = 0; godHitRec = 0; scene = 'nested'; zoom = 1; photoDone = true;
      await spin();
      out.push(Object.assign(rec || (godHitRec ? { k: 'G' } : { k: '-' }), gold ? { g: 1 } : {}, godHitRec ? { god: 1 } : {}));
    }
    return out;
  }, [tip, n]);
}
const per = Math.ceil(+runs / +pages), t0 = Date.now();
const res = (await Promise.all(Array.from({ length: +pages }, () => worker(per)))).flat();
console.log(JSON.stringify(res));
console.error('secs', (Date.now() - t0) / 1000);
await b.close();
