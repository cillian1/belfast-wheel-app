import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { botName, withoutBotPrefix, botNames } from './bot-identities.mjs';

for (const [login, name] of Object.entries(botNames)) {
  assert.equal(botName(login, 'RolexG: misleading prefix'), name);
  assert.equal(botName(login, 'DONE: finished'), name);
}
assert.equal(botName('github-actions[bot]', 'RolexG: DONE: fixed'), 'RolexG');
assert.equal(botName('cillian1', 'the gambler: DONE: fixed'), 'The Gambler');
assert.equal(botName('stranger', 'RolexG: DONE: fixed'), undefined);
assert.equal(withoutBotPrefix('Gemini review: DONE: checked'), 'DONE: checked');
assert.equal(withoutBotPrefix('RolexG: BLOCKED: waiting'), 'BLOCKED: waiting');

// Exercise the actual browser parser without loading the page or making requests.
const html = readFileSync('chat.html', 'utf8');
const parser = html.slice(html.indexOf('function parse(c)'), html.indexOf('let typing='));
const parse = vm.runInNewContext(`const NAMES={claude:'Claude',copilot:'Copilot',gemini:'Gemini',rolexg:'RolexG',jimini:'Jimini'}; ${parser}; parse`);
for (const [login, name] of Object.entries(botNames).filter(([login]) => login !== 'copilot[bot]')) {
  assert.equal(parse({login, body:'plain reply'}).name, name);
}
assert.equal(parse({login:'github-actions[bot]',body:'Jimini: old reply'}).name, 'Jimini');
assert.equal(parse({login:'gemini-reviewer[bot]',body:'Gemini review: checked'}).text, 'checked');

// Check every publishing step selects an App token with a fallback. Catch duplicate YAML job keys.
for (const [file, bot] of [['rolexg','ROLEXG'],['jimini','JIMINI'],['gemini-review','GEMINI'],['ci','GEMINI']]) {
  const text = readFileSync(`.github/workflows/${file}.yml`, 'utf8');
  assert.ok(text.includes('actions/create-github-app-token@v1'));
  assert.ok(text.includes(`secrets.${bot}_APP_ID != '' && secrets.${bot}_APP_KEY != ''`));
  assert.ok(text.includes('steps.app.outputs.token || github.token'));
  assert.equal((text.match(/^    env:/gm)||[]).length, 1, file);
  if (file === 'rolexg' || file === 'jimini') {
    assert.ok(text.includes(`github.event.comment.user.login != '${file}[bot]'`));
    assert.equal((text.match(/GH_TOKEN: \$\{\{ steps.app.outputs.token \|\| github.token \}\}/g)||[]).length, 2);
  }
}
const banter = readFileSync('.github/workflows/banter-bots.yml', 'utf8');
assert.equal((banter.match(/^    env:/gm)||[]).length, 1);
for (const bot of ['ROLEXG','JIMINI','GEMINI','CLAUDE']) assert.ok(banter.includes(`${bot}_GH_TOKEN: \${{ steps.${bot.toLowerCase()}.outputs.token }}`));
console.log('Bot identity, legacy parser and workflow wiring checks passed.');
