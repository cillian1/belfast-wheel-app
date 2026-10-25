import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameFingerprint } from './calibrate-ordinary-rtp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = process.argv[2];
if (!baseline) throw new Error('Usage: node tools/check-game-invariants.mjs <baseline-ref>');

const gameFiles = readdirSync(resolve(root, 'src/game'))
  .filter(file => file.endsWith('.js'))
  .sort();
const readBaseline = path => execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const readCurrent = path => readFileSync(resolve(root, path), 'utf8');
const randomCalls = sources => sources.reduce((count, source) => count + [...source.matchAll(/\bMath\.random\s*\(/g)].length, 0);
const constants = source => [...source.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*(?:PRIZE|ODDS|EV|EDGE)[A-Z0-9_]*)\s*=\s*([^;]+);/gs)]
  .map(([, name, value]) => [name, value.replace(/\s+/g, '')])
  .sort(([a], [b]) => a.localeCompare(b));
const currentSources = gameFiles.map(file => readCurrent(`src/game/${file}`));
const baselineSources = gameFiles.map(file => readBaseline(`src/game/${file}`));
const currentConfig = JSON.parse(readCurrent('src/config.json'));
const baselineConfig = JSON.parse(readBaseline('src/config.json'));
const odds = config => ({ edge: config.edge, stakes: config.stakes });

assert.deepEqual(odds(currentConfig), odds(baselineConfig), 'Edge and stakes must match the baseline');
const currentConstants = constants(currentSources.join('\n'));
const baselineConstants = constants(baselineSources.join('\n'));
const changedConstants = JSON.stringify(currentConstants) !== JSON.stringify(baselineConstants);
if (currentConfig.ev !== baselineConfig.ev || changedConstants) {
  const calibration = JSON.parse(readCurrent('docs/ordinary-rtp-calibration.json'));
  assert.equal(calibration.sourceFingerprint, gameFingerprint(), 'Calibration must match the game source');
  assert.equal(calibration.gameVersion, currentConfig.gameVersion);
  assert.equal(calibration.target, currentConfig.edge);
  assert.equal(calibration.normalizationEV, currentConfig.ev);
  assert.ok(calibration.training.count >= 50000 && calibration.holdout.count >= 10000, 'EV change requires separate calibration and holdout samples');
  assert.equal(calibration.holdoutCheck.passed, true);
  console.log('EV normalization matches the source-bound ordinary-prize calibration and independent holdout.');
}
if (changedConstants) {
  // Cillian's Update39 transfer cuts only Monster values by10%, retaining thresholds.
  assert.equal(currentConfig.gameVersion, 39, 'New prize-table changes need an explicit reviewed invariant');
  assert.deepEqual(currentConstants.filter(([name]) => name !== 'TANK_LEVELS'), baselineConstants.filter(([name]) => name !== 'TANK_LEVELS'), 'Other prize/odds constants must match the baseline');
  const tank = entries => vm.runInNewContext(entries.find(([name]) => name === 'TANK_LEVELS')[1]);
  const currentTank = JSON.parse(JSON.stringify(tank(currentConstants)));
  const oldTank = JSON.parse(JSON.stringify(tank(baselineConstants)));
  assert.deepEqual(currentTank, oldTank.map(level => ({ ...level, v: level.v * .9 })), 'Only the authorised10% Monster value reduction is allowed');
}

console.log(`Game invariants match ${baseline}: ${randomCalls(currentSources)} Math.random() calls; edge/stakes unchanged; prize-table exceptions are explicit and source-bound calibration is required.`);
