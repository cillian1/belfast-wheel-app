import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'src/wallet/db.js'), 'utf8');
const match = source.match(/  const db = \{[\s\S]*?\n  \};/);
if (!match) throw new Error('Could not find db in src/wallet/db.js');

const response = (value, tag = '"v1"', status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: key => key === 'ETag' ? tag : null },
  json: async () => value,
});
function createDb(replies) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, ...options });
    assert.ok(replies.length, 'unexpected fetch');
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const db = new Function('fetch', 'CFG', `${match[0]}; return db;`)(fetch, { db: 'https://example.invalid' });
  return { db, calls };
}

const retryPut = createDb([
  response(100, '"v1"'), new TypeError('network'),
  response(120, '"v2"'), response(null),
  response(130, '"v3"'), response(null),
]);
assert.equal(await retryPut.db.txn('users/test/balance', value => value + 10), 130);
assert.equal(await retryPut.db.txn('users/test/balance', value => value + 10), 140);
assert.deepEqual(retryPut.calls.filter(call => call.method === 'PUT').map(call => call.headers), [
  { 'if-match': '"v1"' }, { 'if-match': '"v2"' }, { 'if-match': '"v3"' },
]);
assert.deepEqual(retryPut.calls.filter(call => call.method === 'PUT').map(call => JSON.parse(call.body)), [110, 130, 140]);
assert.notEqual(retryPut.db.tags, false, 'a failed PUT must not disable ETags for later transactions');

const retryRead = createDb([new TypeError('network'), response(100), response(null)]);
assert.equal(await retryRead.db.txn('users/test/balance', value => value + 10), 110);
assert.deepEqual(retryRead.calls.slice(0, 2).map(call => call.headers), [
  { 'X-Firebase-ETag': 'true' }, { 'X-Firebase-ETag': 'true' },
]);
assert.deepEqual(retryRead.calls[2].headers, { 'if-match': '"v1"' });
assert.notEqual(retryRead.db.tags, false, 'a failed read must not disable ETags');

const noTags = createDb([response(100, null), response(null), response(110, null), response(null)]);
assert.equal(await noTags.db.txn('users/test/balance', value => value + 10), 110);
assert.equal(noTags.db.tags, false, 'a successful read without an ETag enables the unsupported-header fallback');
assert.equal(await noTags.db.txn('users/test/balance', value => value + 10), 120);
assert.deepEqual(noTags.calls.map(call => call.headers), [{ 'X-Firebase-ETag': 'true' }, {}, {}, {}]);

for (const failure of ['read', 'put', 'conflict']) {
  const replies = Array.from({ length: 8 }, () => failure === 'read'
    ? [new TypeError('network')]
    : [response(100), failure === 'put' ? new TypeError('network') : response(null, null, 412)]).flat();
  const busy = createDb(replies);
  await assert.rejects(busy.db.txn('users/test/balance', value => value + 10), /busy, try again/);
  assert.equal(busy.calls.filter(call => !call.method).length, 8, `${failure} retries must stop after eight attempts`);
  assert.notEqual(busy.db.tags, false);
  for (const call of busy.calls.filter(call => call.method === 'PUT')) {
    assert.deepEqual(call.headers, { 'if-match': '"v1"' });
  }
}

const abort = createDb([response(100)]);
assert.equal(await abort.db.txn('users/test/balance', () => undefined), 100);
assert.equal(abort.calls.length, 1, 'an aborted transaction must not write');

console.log('Wallet transactions retain ETags after network failures, refresh retries, and stop after eight attempts.');
