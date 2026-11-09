import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calibrate } from './sim/ordinary-ev.mjs';

export function gameFingerprint() {
  const hash = createHash('sha256');
  for (const name of readdirSync(new URL('../src/game/', import.meta.url)).filter(name => name.endsWith('.js')).sort()) {
    hash.update(name + '\n');
    hash.update(readFileSync(new URL('../src/game/' + name, import.meta.url), 'utf8').replace(/const BUILD = \d+;/, 'const BUILD = <release>;'));
  }
  hash.update(readFileSync(new URL('./sim/ordinary-ev.mjs', import.meta.url)));
  return hash.digest('hex');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [trainingPath, holdoutPath, outputPath] = process.argv.slice(2);
  if (!trainingPath || !holdoutPath || !outputPath) throw new Error('Usage: node tools/calibrate-ordinary-rtp.mjs training.json holdout.json artifact.json');
  const training = calibrate(JSON.parse(readFileSync(trainingPath, 'utf8')));
  const ev = Math.round(training.calibrationEV * 1e8) / 1e8;
  const holdout = calibrate(JSON.parse(readFileSync(holdoutPath, 'utf8')), { normalizationEV: ev });
  const trainingReturnSE = training.standardError * .995 / ev;
  const combinedSE = Math.hypot(trainingReturnSE, holdout.modeledReturnSE);
  if (Math.abs(holdout.modeledReturn - .995) > 3 * combinedSE) throw new Error('Independent holdout exceeds the combined three-standard-error calibration check');
  const configPath = new URL('../src/config.json', import.meta.url);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const artifact = {
    schema: 1, gameVersion: config.gameVersion, sourceFingerprint: gameFingerprint(),
    scope: 'Ordinary-prize model target only; jackpot funding/payouts and promotions excluded. Not certified actual RTP.',
    target: .995, normalizationEV: ev, training, holdout,
    holdoutCheck: { combinedStandardError: combinedSE, passed: true },
  };
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + '\n');
  config.ev = ev; config.edge = .995;
  writeFileSync(configPath, JSON.stringify(config) + '\n');
  console.log(JSON.stringify({ game: config.gameVersion, ev, target: .995, training: training.count, holdout: holdout.count, holdoutReturn: holdout.modeledReturn, holdoutSE: holdout.modeledReturnSE }));
}
