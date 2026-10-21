import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/wallet/watch.js'), 'utf8');
const match = source.match(/  async function pruneReplays\(user\) \{[\s\S]*?\n  \}/);
if (!match) throw new Error('Could not find pruneReplays in src/wallet/watch.js');

const persisted = new Map();
const cards = { alice: Object.create(null) };
const frames = Object.create(null);
const shallowCalls = [];
const deleted = [];
const pref = {
  get(key) { return persisted.get(key) ?? null; },
  set(key, value) { persisted.set(key, String(value)); },
};
const db = {
  async get(path, query) {
    assert.equal(query, '?shallow=true');
    shallowCalls.push(path);
    const user = path.slice('rpm/'.length);
    return Object.fromEntries(Object.keys(cards[user] || {}).map(key => [key, true]));
  },
  async put(path, value) {
    deleted.push(path);
    const parts = path.split('/');
    if (parts[0] === 'rpm') delete cards[parts[1]][parts[2]];
    else if (parts[0] === 'rpd') delete frames[parts[1]];
    else throw new Error(`Unexpected delete path: ${path}`);
    assert.equal(value, null);
  },
};
const createPruner = () => new Function('db', 'pref', `${match[0]}; return pruneReplays;`)(db, pref);

for (let save = 1; save < 50; save++) {
  await createPruner()('alice');
  assert.equal(shallowCalls.length, 0, `unexpected listing after save ${save}`);
  assert.equal(persisted.get('wol.replayPrune.alice'), String(save));
}
await createPruner()('alice');
assert.deepEqual(shallowCalls, ['rpm/alice'], 'the 50th save should list keys after a simulated restart per save');
assert.equal(persisted.get('wol.replayPrune.alice'), '0');
for (let save = 51; save < 100; save++) {
  await createPruner()('alice');
  assert.equal(shallowCalls.length, 1, `unexpected second listing after save ${save}`);
}
await createPruner()('alice');
assert.equal(shallowCalls.length, 2, 'the next listing should occur on save 100');

for (let i = 1; i <= 3002; i++) {
  const id = `k${String(i).padStart(4, '0')}`;
  cards.alice[id] = true;
  frames[id] = true;
}
persisted.set('wol.replayPrune.alice', '49');
deleted.length = 0;
await createPruner()('alice');
assert.equal(Object.keys(cards.alice).length, 3000);
assert.equal(cards.alice.k0001, undefined);
assert.equal(cards.alice.k0002, undefined);
assert.equal(frames.k0001, undefined);
assert.equal(frames.k0002, undefined);
assert.equal(cards.alice.k0003, true);
assert.equal(frames.k0003, true);
assert.equal(cards.alice.k3002, true);
assert.deepEqual(deleted, [
  'rpm/alice/k0001', 'rpd/k0001',
  'rpm/alice/k0002', 'rpd/k0002',
]);

console.log('Replay pruning cadence persists across restarts; listings occur every 50 saves and retain exactly the newest 3,000 cards/frames.');
