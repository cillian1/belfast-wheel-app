import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ui = readFileSync(resolve(root, 'src/game/ui.js'), 'utf8');
const verdict = ui.match(/function setVerdict\([\s\S]*?\n\}/)?.[0];
assert.ok(verdict, 'shared verdict presentation should exist');
assert.doesNotMatch(verdict, /offset(?:Width|Height)/, 'trigger verdicts must not force synchronous layout');
assert.match(verdict, /plate\.animate\(/, 'trigger flashes should restart without layout reads');
assert.match(verdict, /flash && !reduce/, 'reduced-motion users should not get the trigger flash');
console.log('Trigger verdict flashes use Web Animations without forced synchronous layout.');
