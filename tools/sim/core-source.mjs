import { readFileSync } from 'node:fs';

const modules = ['core', 'content', 'canvas-helpers', 'faces', 'state', 'dice', 'motion', 'ball-physics', 'ui', 'mark-ending'];
export const sources = Object.fromEntries(modules.map(name => [
  name, readFileSync(new URL(`../../src/game/${name}.js`, import.meta.url), 'utf8'),
]));
