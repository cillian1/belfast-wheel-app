import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createCore } from './sim/core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const quick = args.includes('--quick') || args.includes('test'); // support npm test which might pass 'test'

// 1. Existing checks
const html = readFileSync(resolve(root, 'game/index.html'), 'utf8');
const version = JSON.parse(readFileSync(resolve(root, 'version.json'), 'utf8'));
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];

if (scripts.length === 0) throw new Error('No inline scripts found in game/index.html');

scripts.forEach((match, index) => {
  new vm.Script(match[1], { filename: `game/index.html:inline-script-${index + 1}.js` });
});

const configMatch = html.match(/window\.WALLET_CFG\s*=\s*(\{[^;]*\})\s*;/);
if (!configMatch) throw new Error('Could not find the inline WALLET_CFG object');

const config = JSON.parse(configMatch[1]);
if (version.game !== config.gameVersion) {
  throw new Error(`version.json game (${version.game}) does not match gameVersion (${config.gameVersion})`);
}

if (html.includes('@@GHOST_SPRITE_BASE64@@')) throw new Error('Ghost sprite placeholder was not bundled');
const ghostSprites = [...html.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)];
if (ghostSprites.length !== 1) throw new Error(`Expected one embedded ghost sprite, found ${ghostSprites.length}`);
const ghostSprite = Buffer.from(ghostSprites[0][1], 'base64');
if (ghostSprite.length > 150 * 1024) throw new Error(`Embedded ghost sprite is too large (${ghostSprite.length} bytes)`);
if (ghostSprite.toString('ascii', 0, 4) !== 'RIFF' || ghostSprite.toString('ascii', 8, 12) !== 'WEBP') {
  throw new Error('Embedded ghost sprite is not a WebP image');
}

console.log(`Checked ${scripts.length} inline scripts; game version ${version.game} matches gameVersion; ghost sprite is embedded.`);

// 2. Quick odds check
if (quick) {
  execFileSync(process.execPath, [resolve(root, 'tools/test-monster-d20.mjs')], { stdio: 'inherit' });
  const TABLES = JSON.parse(readFileSync(resolve(root, 'tools/sim/tables.json'), 'utf8'));
  const RACE_CHANCE = 0.16;
  const AM_AVG = TABLES.AM.reduce((a, b) => a + b, 0) / TABLES.AM.length;

  function getEV(r) {
    if (r.k === '-') return 0;
    if (r.k === 'W' || r.k === 'B') {
      const w = r.w, b = r.b, n = w + b;
      let ev = 0;
      // Exact EV for Bonus/Monster room picks with replacement (rooms.js logic)
      for (let g = 0; g <= n; g++) {
        // P(g gold out of n picks) = Binomial(n, g, 0.2)
        let prob = 1;
        for (let i = 0; i < g; i++) prob *= (n - i) / (i + 1) * 0.2;
        for (let i = 0; i < n - g; i++) prob *= 0.8;
        
        const basePrizeEV = (w + 2 * b) * AM_AVG;
        if (g >= 3) {
          const ls = TABLES.LS;
          ev += prob * (basePrizeEV + ls[0] + ls[1] * (ls[2] - 1) / 2);
        } else {
          ev += prob * (basePrizeEV + g * 50);
        }
      }
      return ev;
    }
    if (r.k === 'G') {
      const GOD_AVG = TABLES.GOD.reduce((a, b) => a + b, 0) / TABLES.GOD.length;
      return 0.35 * GOD_AVG + 0.65 * TABLES.CONS;
    }
    if (r.k === 'P') {
      const ptAvg = TABLES.PT.reduce((a, b) => a + b, 0) / TABLES.PT.length;
      const pdAvg = TABLES.PD[0] + TABLES.PD[1] * (TABLES.PD[2] - 1) / 2;
      return (1/3) * ptAvg + (2/3) * pdAvg;
    }
    if (r.k === 'M' || r.k === 'D') {
      const sw = r.sw || r.w || 0, sb = r.sb || r.b || 0, n = r.n || 6;
      const multW = sw > 0 ? 1.5 * Math.pow(2, sw - 1) : 0;
      const multB = sb > 0 ? 1.5 * Math.pow(2, sb - 1) : 0;
      const markPrize = (sw > 0 ? 10 * multW / 1.5 : 0) + (sb > 0 ? 5 * multB / 1.5 : 0);
      const evMark = markPrize / Math.min(n, 16);
      const racers = Math.min(8, (sw > 0 ? 1 : 0) + (sb > 0 ? 1 : 0) + Math.max(0, n - (sw > 0 ? 1 : 0) - (sb > 0 ? 1 : 0)));
      const plain = racers - (sw > 0 ? 1 : 0) - (sb > 0 ? 1 : 0);
      const bigAvg = 100, valAvg = 15.625;
      let evRace = 0;
      if (racers > 0) {
        if (sw > 0 || sb > 0) {
          if (sw > 0 && (sb === 0 || multW >= multB)) {
             evRace = (bigAvg * multW + (sb > 0 ? valAvg * multB : 0) + plain * valAvg) / racers;
          } else {
             evRace = (bigAvg * multB + (sw > 0 ? valAvg * multW : 0) + plain * valAvg) / racers;
          }
        } else {
          evRace = (bigAvg + (racers - 1) * valAvg) / racers;
        }
      }
      return RACE_CHANCE * evRace + (1 - RACE_CHANCE) * evMark;
    }
    return 0;
  }

  async function calculate(sources, cfg) {
    const spin = createCore(sources, { full: true });
    let total = 0, count = 1000;
    for (let i = 1; i <= count; i++) {
      total += getEV(await spin(i));
    }
    const avgV = total / count;
    return avgV * (cfg.edge / cfg.ev);
  }

  const modules = ['core', 'content', 'canvas-helpers', 'faces', 'state', 'dice', 'motion', 'ball-physics', 'ui', 'mark-ending'];
  const currentSources = Object.fromEntries(modules.map(name => [
    name, readFileSync(resolve(root, `src/game/${name}.js`), 'utf8'),
  ]));
  const currentCfg = JSON.parse(readFileSync(resolve(root, 'src/config.json'), 'utf8'));

  const baseRef = `origin/${process.env.GITHUB_BASE_REF || process.env.PAYBACK_BASE_REF || 'main'}`;
  const baseSources = Object.fromEntries(modules.map(name => [
    name, execFileSync('git', ['show', `${baseRef}:src/game/${name}.js`], { encoding: 'utf8' }),
  ]));
  const baseCfg = JSON.parse(execFileSync('git', ['show', `${baseRef}:src/config.json`], { encoding: 'utf8' }));

  const [pbCurrent, pbBase] = await Promise.all([
    calculate(currentSources, currentCfg),
    calculate(baseSources, baseCfg)
  ]);

  const diff = pbCurrent - pbBase;
  console.log(`payback ${(pbBase * 100).toFixed(1)}% → ${(pbCurrent * 100).toFixed(1)}% (${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)} pp)`);
}
