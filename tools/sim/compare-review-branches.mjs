import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const baseSha = 'a1b9fa148d7fc8cfdcf6b0c9e2cad54f7eacef26';
const comparisons = [
  { name: 'pr90-near-miss', pr: 90, head: '60801518f109591649976886cad193cf255335e8' },
  { name: 'pr91-stacked-specials', pr: 91, head: 'd4c1e901d452a4fd072ecb4b4c001dee749ec259' },
];
const spins = 10000;
const pages = 3;
const seed = 1;
const evidenceDir = process.env.SIM_EVIDENCE_DIR || path.join(os.tmpdir(), 'review-sim-evidence');
const artifactDir = path.join(evidenceDir, 'games');
const simPath = path.resolve('tools/sim/run.mjs');
fs.mkdirSync(artifactDir, { recursive: true });

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function writeGame(name, sha) {
  const actual = git(['rev-parse', sha]);
  if (actual !== sha) throw new Error(`Expected ${sha}, resolved ${actual}.`);
  const html = execFileSync('git', ['show', `${sha}:game/index.html`], { encoding: 'utf8' });
  const config = JSON.parse(execFileSync('git', ['show', `${sha}:src/config.json`], { encoding: 'utf8' }));
  const race = html.match(/const\s+RACE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/);
  const tip = html.match(/(?:const|let)\s+TIP_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/);
  const tease = html.match(/TEASE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)\s*(?:\/\s*([0-9]*\.?[0-9]+))?/);
  const filename = path.join(artifactDir, `${name}.html`);
  fs.writeFileSync(filename, html);
  return {
    sha,
    path: filename,
    htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
    gameVersion: config.gameVersion,
    ev: config.ev,
    edge: config.edge,
    raceChance: race ? Number(race[1]) : null,
    tipChance: tip ? Number(tip[1]) : null,
    teaseChance: tease ? Number(tease[1]) / Number(tease[2] || 1) : 1,
    stackedRaceTopTag: html.includes('function raceBigAt('),
  };
}

function assertSettings(comparison, base, head) {
  if (base.raceChance == null || head.raceChance == null || base.tipChance == null || head.tipChance == null) {
    throw new Error(`Could not read game settings for PR #${comparison.pr}.`);
  }
  if (comparison.pr === 90 &&
      (base.tipChance !== .10 || base.teaseChance !== 1 || head.tipChance !== .30 || head.teaseChance !== 1 / 3)) {
    throw new Error('PR #90 artifacts do not have the expected .10/always-tease and .30/one-third-tease settings.');
  }
  if (comparison.pr === 91 &&
      (base.raceChance !== .25 || head.raceChance !== .16 || base.stackedRaceTopTag || !head.stackedRaceTopTag)) {
    throw new Error('PR #91 artifacts do not have the expected race chance and stacked top-tag behavior.');
  }
}

function runComparison(comparison, base, head) {
  const logPath = path.join(evidenceDir, `${comparison.name}.log`);
  const args = [
    simPath, '--spins', String(spins), '--pages', String(pages), '--seed', String(seed),
    base.path, head.path,
  ];
  const command = `node ${args.map(value => `"${value}"`).join(' ')}`;
  const log = fs.createWriteStream(logPath, { flags: 'w' });
  log.write(`Simulator commit: ${git(['rev-parse', 'HEAD'])}\nCommand: ${command}\n`);
  console.log(`\n=== PR #${comparison.pr} paired payback comparison ===`);
  console.log(`Simulator commit: ${git(['rev-parse', 'HEAD'])}`);
  console.log(`Command: ${command}`);
  const child = spawn(process.execPath, args, { env: process.env });
  child.stdout.on('data', chunk => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk);
    log.write(chunk);
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', async code => {
      log.end();
      await new Promise((done, fail) => {
        log.once('finish', done);
        log.once('error', fail);
      });
      if (code !== 0) reject(new Error(`Comparison ${comparison.name} exited with status ${code}; see ${logPath}.`));
      else resolve({ name: comparison.name, log: logPath, command });
    });
  });
}

async function main() {
  console.log('Fetching exact comparison refs from origin.');
  execFileSync('git', [
    'fetch', '--no-tags', 'origin',
    'refs/heads/update-29', 'refs/pull/90/head', 'refs/pull/91/head',
  ], { stdio: 'inherit' });

  const base = writeGame('base-update-29', baseSha);
  const manifest = {
    simulatorCommit: git(['rev-parse', 'HEAD']),
    runner: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      cpus: os.cpus().length,
    },
    spinsPerVersion: spins,
    pages: pages,
    seed: seed,
    pairing: 'Each spin resets the same seeded PRNG stream in both versions.',
    tipOverride: null,
    comparisons: [],
  };
  const currentConfig = JSON.parse(fs.readFileSync('src/config.json', 'utf8'));
  manifest.base = base;
  fs.writeFileSync(path.join(evidenceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const comparison of comparisons) {
    const head = writeGame(`pr-${comparison.pr}-head`, comparison.head);
    if (head.ev !== base.ev || head.edge !== base.edge ||
        currentConfig.ev !== base.ev || currentConfig.edge !== base.edge) {
      throw new Error(`Payback config differs for PR #${comparison.pr}: EV/edge must match the simulator config.`);
    }
    assertSettings(comparison, base, head);
    const result = await runComparison(comparison, base, head);
    manifest.comparisons.push({
      ...comparison,
      base,
      head,
      log: path.basename(result.log),
      command: result.command,
    });
    fs.writeFileSync(path.join(evidenceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`Evidence manifest: ${path.join(evidenceDir, 'manifest.json')}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
