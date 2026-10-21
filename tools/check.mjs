import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

console.log(`Checked ${scripts.length} inline scripts; game version ${version.game} matches gameVersion.`);
