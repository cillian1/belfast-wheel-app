import assert from 'node:assert/strict';
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
if (currentConfig.ev !== baselineConfig.ev) {
  const calibration = JSON.parse(readCurrent('docs/ordinary-rtp-calibration.json'));
  assert.equal(calibration.sourceFingerprint, gameFingerprint(), 'Calibration must match the game source');
  assert.equal(calibration.gameVersion, currentConfig.gameVersion);
  assert.equal(calibration.target, currentConfig.edge);
  assert.equal(calibration.normalizationEV, currentConfig.ev);
  assert.ok(calibration.training.count >= 50000 && calibration.holdout.count >= 10000, 'EV change requires separate calibration and holdout samples');
  assert.equal(calibration.holdoutCheck.passed, true);
  console.log('EV normalization matches the source-bound ordinary-prize calibration and independent holdout.');
}
assert.deepEqual(constants(currentSources.join('\n')), constants(baselineSources.join('\n')), 'prize/odds constants must match the baseline');

console.log(`Game invariants match ${baseline}: ${randomCalls(currentSources)} Math.random() calls; edge, stakes, and prize/odds constants unchanged; EV changes require calibration.`);
