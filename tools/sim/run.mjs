import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const here = path.dirname(fileURLToPath(import.meta.url));
const tables = JSON.parse(fs.readFileSync(path.join(here, 'tables.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'src', 'config.json'), 'utf8'));

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export function stankEV(wilds, ankhs) {
  const n = wilds + ankhs;
  if (!n) return 0;

  const meanAmt = mean(tables.AM);
  const lockSafe = tables.LS || [20, 10, 19];
  const lockSafeEV = lockSafe[0] + lockSafe[1] * (lockSafe[2] - 1) / 2;
  const goldBase = tables.GB || 50;
  let ev = 0;
  let probability = Math.pow(.8, n);

  for (let gold = 0; gold <= n; gold++) {
    if (gold) probability *= (n - gold + 1) / gold * .25;
    const cash = meanAmt * (wilds + 2 * ankhs) * (n - gold) / n;
    ev += probability * (cash + (gold >= 3 ? lockSafeEV : gold * goldBase));
  }
  return ev;
}

export function tankEV(wilds, ankhs) {
  const special = wilds + Math.max(0, ankhs - 3);
  let distribution = [1];
  const addDie = scale => {
    const next = Array(distribution.length + 12 * scale).fill(0);
    for (let total = 0; total < distribution.length; total++) {
      for (let face = 1; face <= 12; face++) next[total + face * scale] += distribution[total] / 12;
    }
    distribution = next;
  };
  for (let die = 0; die < 10; die++) addDie(1);
  for (let die = 0; die < special; die++) addDie(2);

  return distribution.reduce((ev, probability, total) => {
    let prize = tables.LV[0][1];
    for (const [threshold, value] of tables.LV) if (total >= threshold) prize = value;
    return ev + probability * prize;
  }, 0);
}

export function godEV() {
  let states = new Map();
  for (let rank = 2; rank <= 14; rank++) states.set(rank, 1 / 13);

  for (let draw = 0; draw < 4; draw++) {
    const next = new Map();
    for (const [previous, probability] of states) {
      for (let rank = 2; rank <= 14; rank++) {
        if (rank === previous) continue;
        const correct = previous < 8 ? rank > previous : previous > 8 ? rank < previous : .5;
        if (correct) next.set(rank, (next.get(rank) || 0) + probability * correct / 12);
      }
    }
    states = next;
  }
  return [...states.values()].reduce((sum, probability) => sum + probability, 0) * mean(tables.GOD);
}

const GOD_EV = godEV();
const PYRAMID_EV = mean(tables.PT) / 3 +
  (tables.PD[0] + tables.PD[1] * (tables.PD[2] - 1) / 2) * 2 / 3;

function roomEV(run) {
  let value = 0;
  if (run.k === 'W') value = stankEV(run.w, run.b);
  else if (run.k === 'B') value = tankEV(run.w, run.b);
  else if (run.k === 'G') value = GOD_EV;
  else if (run.k === 'P') value = PYRAMID_EV;
  if (run.god && (run.k === 'W' || run.k === 'B')) value += GOD_EV;
  return value;
}

export function raceEV(run) {
  const racers = Math.min(run.n, 8);
  if (!racers) return 0;
  const specials = specialEntries(run).slice(0, racers);
  const plain = racers - specials.length;
  if (run.raceTopSpecial && specials.length) {
    const top = specials[topSpecialIndex(specials)];
    return (bigSpecialEV(top.mult) + 15.625 * plain + specials.reduce((sum, chicken) =>
      sum + (chicken === top ? 0 : regularSpecialEV(chicken.mult)), 0)) / racers;
  }
  const normalEV = (100 + 15.625 * (racers - 1)) / racers;
  const specialEV = chicken => (bigSpecialEV(chicken.mult) + (racers - 1) * regularSpecialEV(chicken.mult)) / racers;
  return (plain * normalEV + specials.reduce((sum, chicken) => sum + specialEV(chicken), 0)) / racers;
}

const RACE_TAG_VALUES = [5, 8, 10, 12, 15, 20, 25, 30];
const BIG_TAG_VALUES = [80, 100, 120];

function regularSpecialEV(mult) {
  return mean(RACE_TAG_VALUES.map(value => Math.round(value * mult)));
}

function bigSpecialEV(mult) {
  return mean(BIG_TAG_VALUES.map(value => Math.round(value * mult)));
}

export function topSpecialIndex(specials) {
  return specials.reduce((best, chicken, index) =>
    chicken.mult > specials[best].mult ||
    (chicken.mult === specials[best].mult && chicken.kind === 'W' && specials[best].kind !== 'W')
      ? index : best, 0);
}

function specialEntries(run) {
  if (Array.isArray(run.specials)) {
    return run.specials.map(chicken => ({
      kind: chicken.kind,
      mult: chicken.mult || 1.5,
    }));
  }
  return [
    ...Array(run.sw || 0).fill({ kind: 'W', mult: 1.5 }),
    ...Array(run.sb || 0).fill({ kind: 'B', mult: 1.5 }),
  ];
}

export function markEV(run) {
  const slices = Math.min(run.n, 16);
  if (!slices) return 0;
  return specialEntries(run).slice(0, slices).reduce((sum, chicken) =>
    sum + (chicken.kind === 'W' ? 10 : 5) * chicken.mult / 1.5, 0) / slices;
}

export function seedForSpin(seed, spinIndex) {
  return (seed + Math.imul(spinIndex + 1, 0x9e3779b9)) >>> 0;
}

export function sampleInterval(values) {
  if (!values.length) throw new Error('Cannot calculate an interval for an empty sample.');
  const average = mean(values);
  if (values.length === 1) return { mean: average, se: 0, low: average, high: average };
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  const se = Math.sqrt(variance / values.length);
  return { mean: average, se, low: average - 1.96 * se, high: average + 1.96 * se };
}

export function summarize(records, raceChance) {
  const roomValues = records.map(roomEV);
  const raceValues = records.map(run => run.k === 'M' ? raceEV(run) * raceChance : 0);
  const markValues = records.map(run => run.k === 'M' ? markEV(run) * (1 - raceChance) : 0);
  const totalValues = records.map((_, i) => roomValues[i] + raceValues[i] + markValues[i]);
  const counts = Object.fromEntries(['W', 'B', 'G', 'P', 'M', '-'].map(key => [
    key, records.filter(run => run.k === key).length,
  ]));
  return {
    counts,
    rooms: sampleInterval(roomValues),
    race: sampleInterval(raceValues),
    mark: sampleInterval(markValues),
    total: sampleInterval(totalValues),
    spins: records.length,
  };
}

export function pairedDifference(first, second, firstChance, secondChance) {
  if (first.length !== second.length) throw new Error('Paired files produced different numbers of spins.');
  const totalFor = (run, chance) => roomEV(run) +
    (run.k === 'M' ? raceEV(run) * chance + markEV(run) * (1 - chance) : 0);
  return sampleInterval(second.map((run, index) => totalFor(run, secondChance) - totalFor(first[index], firstChance)));
}

function readGameChances(file, tipOverride) {
  const html = fs.readFileSync(file, 'utf8');
  const race = html.match(/const\s+RACE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/);
  const tip = html.match(/(?:const|let)\s+TIP_CHANCE\s*=\s*([0-9]*\.?[0-9]+)/);
  const tease = html.match(/TEASE_CHANCE\s*=\s*([0-9]*\.?[0-9]+)\s*(?:\/\s*([0-9]*\.?[0-9]+))?/);
  if (!race) throw new Error(`${file}: could not find the game's RACE_CHANCE constant.`);
  if (!tip) throw new Error(`${file}: could not find the game's TIP_CHANCE constant.`);
  const chances = {
    race: Number(race[1]),
    tip: tipOverride ?? Number(tip[1]),
    tease: tease ? Number(tease[1]) / Number(tease[2] || 1) : 1,
  };
  for (const [name, value] of Object.entries(chances)) {
    if (!(value >= 0 && value <= 1)) throw new Error(`${file}: ${name} chance must be between 0 and 1.`);
  }
  return chances;
}

function runBrowserSim(file, spins, tip, pages, seed) {
  const fastsim = path.join(here, 'fastsim.mjs');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fastsim, file, String(spins), tip == null ? 'game' : String(tip), String(pages), String(seed)], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const output = [];
    child.stdout.on('data', chunk => output.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`fastsim exited with status ${code}.`));
      try {
        const records = JSON.parse(Buffer.concat(output).toString('utf8'));
        if (records.length !== spins) throw new Error(`expected ${spins} records, got ${records.length}`);
        resolve(records);
      } catch (error) {
        reject(new Error(`Could not read fastsim output: ${error.message}`));
      }
    });
  });
}

function fixed(value, digits = 3) {
  return value.toFixed(digits);
}

function componentLine(label, interval) {
  return `${label.padEnd(12)} ${fixed(interval.mean).padStart(9)} base/spin  [${fixed(interval.low)}, ${fixed(interval.high)}]`;
}

function printReport(file, result, chances, elapsed) {
  const payback = {
    mean: 100 * result.total.mean * config.edge / config.ev,
    low: 100 * result.total.low * config.edge / config.ev,
    high: 100 * result.total.high * config.edge / config.ev,
  };
  console.log(`\n${file} — ${result.spins.toLocaleString()} spins, race ${(100 * chances.race).toFixed(1)}%, tip ${(100 * chances.tip).toFixed(1)}%, tease ${(100 * chances.tease).toFixed(1)}%, seed ${options.seed}`);
  console.log('Mean base/spin; brackets are 95% normal-approximation intervals.');
  console.log(componentLine('Rooms', result.rooms));
  console.log(componentLine('Race', result.race));
  console.log(componentLine("Mark's wheel", result.mark));
  console.log(componentLine('Total', result.total));
  console.log(`Payback       ${fixed(payback.mean, 2).padStart(9)}%           [${fixed(payback.low, 2)}%, ${fixed(payback.high, 2)}%]`);
  console.log(`Room counts   W${result.counts.W} B${result.counts.B} G${result.counts.G} P${result.counts.P} M${result.counts.M} -${result.counts['-']}`);
  console.error(`Elapsed       ${fixed(elapsed, 1)}s`);
  return payback;
}

function printPaired(firstFile, secondFile, first, second, firstChance, secondChance) {
  const diff = pairedDifference(first, second, firstChance, secondChance);
  const factor = 100 * config.edge / config.ev;
  console.log(`\nPaired difference (second file minus first): ${path.basename(secondFile)} − ${path.basename(firstFile)}`);
  console.log('Paired 95% normal-approximation interval:');
  console.log(`Total         ${fixed(diff.mean)} base/spin  [${fixed(diff.low)}, ${fixed(diff.high)}]`);
  console.log(`Payback       ${fixed(diff.mean * factor, 2)} points      [${fixed(diff.low * factor, 2)}, ${fixed(diff.high * factor, 2)}]`);
}

function parseOptions(args) {
  const parsed = { spins: 10000, pages: 3, seed: 1, tip: null, files: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/sim/run.mjs [--spins N] [--pages N] [--seed N] [--tip P] game.html [other.html]');
      process.exit(0);
    }
    const match = arg.match(/^--(spins|pages|seed|tip)=(.+)$/);
    const name = match ? match[1] : arg.startsWith('--') ? arg.slice(2) : null;
    if (name && ['spins', 'pages', 'seed', 'tip'].includes(name)) {
      const value = match ? match[2] : args[++i];
      if (value == null || value.startsWith('--')) throw new Error(`Missing value for --${name}.`);
      parsed[name] = Number(value);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      parsed.files.push(arg);
    }
  }
  if (!Number.isInteger(parsed.spins) || parsed.spins < 2) throw new Error('--spins must be an integer of at least 2.');
  if (!Number.isInteger(parsed.pages) || parsed.pages < 1) throw new Error('--pages must be a positive integer.');
  if (!Number.isInteger(parsed.seed) || parsed.seed < 0 || parsed.seed > 0xffffffff) throw new Error('--seed must be an unsigned 32-bit integer.');
  if (parsed.tip != null && !(parsed.tip >= 0 && parsed.tip <= 1)) throw new Error('--tip must be between 0 and 1.');
  if (parsed.files.length === 0) parsed.files.push('game/index.html');
  if (parsed.files.length > 2) throw new Error('Pass one game file, or two files to compare.');
  return parsed;
}

let options;

async function main() {
  options = parseOptions(process.argv.slice(2));
  const summaries = [];
  const recordSets = [];
  const chances = [];
  for (const file of options.files) {
    if (!fs.existsSync(file)) throw new Error(`Game file not found: ${file}`);
    const gameChances = readGameChances(file, options.tip);
    chances.push(gameChances);
    console.error(`Simulating ${options.spins.toLocaleString()} spins: ${file}`);
    const started = performance.now();
    const records = await runBrowserSim(file, options.spins, options.tip, options.pages, options.seed);
    const elapsed = (performance.now() - started) / 1000;
    recordSets.push(records);
    const summary = summarize(records, gameChances.race);
    summaries.push(summary);
    printReport(file, summary, gameChances, elapsed);
  }
  if (summaries.length === 2) {
    printPaired(options.files[0], options.files[1], recordSets[0], recordSets[1], chances[0].race, chances[1].race);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
