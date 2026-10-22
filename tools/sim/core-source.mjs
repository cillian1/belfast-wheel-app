import { readFileSync } from 'node:fs';

const modules = ['core', 'content', 'canvas-helpers', 'faces', 'state', 'dice', 'motion', 'ball-physics', 'ui', 'mark-ending'];
export const sources = Object.fromEntries(modules.map(name => [
  name, readFileSync(new URL(`../../src/game/${name}.js`, import.meta.url), 'utf8'),
]));
const tipChance = sources.motion.match(/^\s*let TIP_CHANCE\s*=\s*(0?\.\d+|\d+(?:\.\d+)?)/m);
if (!tipChance) throw new Error('Could not read TIP_CHANCE from src/game/motion.js');
export const liveTipChance = Number(tipChance[1]);
if (!Number.isFinite(liveTipChance) || liveTipChance < 0 || liveTipChance > 1) {
  throw new Error(`Invalid live TIP_CHANCE: ${tipChance[1]}`);
}
