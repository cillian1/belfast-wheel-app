import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createCore } from './sim/core.mjs';
import { calibrate } from './sim/ordinary-ev.mjs';

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
  async function calculate(sources, cfg, includeOverflow, model = calibrate) {
    const spin = createCore(sources, { full: true });
    const records = [], count = 1000;
    for (let i = 1; i <= count; i++) {
      records.push(await spin(i));
    }
    return model(records, { includeOverflow, normalizationEV: cfg.ev, target: cfg.edge });
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

  // Price the baseline with its own source and model, not the proposed payout tables.
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'wheel-payback-'));
  let current, base;
  try {
    mkdirSync(resolve(tempRoot, 'tools/sim'), { recursive: true });
    mkdirSync(resolve(tempRoot, 'src/game'), { recursive: true });
    const baselineFile = path => execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' });
    writeFileSync(resolve(tempRoot, 'tools/sim/ordinary-ev.mjs'), baselineFile('tools/sim/ordinary-ev.mjs'));
    for (const name of ['wild-room', 'bonus-round', 'pyramid', 'god-room', 'chicken-race', 'mark-ending']) {
      writeFileSync(resolve(tempRoot, `src/game/${name}.js`), baselineFile(`src/game/${name}.js`));
    }
    const baselineModel = await import(pathToFileURL(resolve(tempRoot, 'tools/sim/ordinary-ev.mjs')).href);
    [current, base] = await Promise.all([
      calculate(currentSources, currentCfg, true),
      calculate(baseSources, baseCfg, /function monsterPrize\(/.test(baselineFile('src/game/bonus-round.js')), baselineModel.calibrate),
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  const pbCurrent = current.modeledReturn, pbBase = base.modeledReturn, diff = pbCurrent - pbBase;
  const spread = 1.96 * current.modeledReturnSE;
  console.log(`Ordinary model sample n=1000: current 95% path-sampling interval ${(Math.max(0, pbCurrent - spread) * 100).toFixed(1)}%–${((pbCurrent + spread) * 100).toFixed(1)}%; jackpot, promotions and rounding excluded.`);
  console.log(`payback ${(pbBase * 100).toFixed(1)}% → ${(pbCurrent * 100).toFixed(1)}% (${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)} pp)`);
}
