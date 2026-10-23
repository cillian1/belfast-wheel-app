import assert from 'node:assert/strict';
import { selectNext, bots, main, API_OUTPUT_LIMIT_BYTES, captureApiResponse } from './claim-next.mjs';
import { execPath } from 'node:process';
const now = Date.parse('2026-10-23T12:00:00Z');
const issue = (number, labels, extra = {}) => ({ number, labels: ['unassigned', ...labels], created_at: '2026-10-23T11:00:00Z', comments: [], linkedPRs: [], ...extra });
const big = issue(1, ['size:big']);
const small = issue(2, ['size:small']);
const workflow = issue(3, ['size:small', 'lane:workflow']);
const report = issue(4, ['size:big', 'lane:report']);
assert.deepEqual(bots.map(bot => selectNext([report, workflow, small, big], bot, now)?.number), [1, 1, 1, 2, 2, 4]);
assert.equal(selectNext([workflow], 'stankman', now), null);
assert.equal(selectNext([small], 'stankman', now), null);
assert.equal(selectNext([workflow], 'rolexg', now), null);
assert.equal(selectNext([big], 'jimini', now), null);
assert.equal(selectNext([small], 'gambler', now)?.number, 2);
assert.equal(selectNext([issue(5, ['size:small'], { created_at: '2026-10-23T11:45:00Z' })], 'gambler', now), null);
assert.equal(selectNext([issue(6, ['size:big'], { linkedPRs: [{ state: 'open' }] }), big], 'copilot', now)?.number, 1);
const claim = { body: 'The Gambler: CLAIMED: gambler', created_at: '2026-10-23T11:30:00Z' };
assert.equal(selectNext([issue(7, ['size:big'], { comments: [claim] })], 'copilot', now), null);
assert.equal(selectNext([issue(7, ['size:big'], { comments: [{ ...claim, created_at: '2026-10-23T09:00:00Z' }] })], 'copilot', now)?.number, 7);
const active = issue(8, [], { labels: ['gambler-task'], comments: [claim] });
assert.equal(selectNext([active, big], 'gambler', now), null);
assert.equal(selectNext([{ ...active, comments: [claim, { body: 'The Gambler: DONE: PR opened' }], linkedPRs: [{ state: 'open' }] }, big], 'gambler', now), null);
const completedClaims = Array.from({ length: 5 }, (_, n) => issue(20 + n, [], {
  labels: [], comments: [claim, { body: 'The Gambler: DONE: merged' }],
}));
assert.equal(selectNext([...completedClaims, big], 'gambler', now)?.number, 1);
const stankmanClaims = completedClaims.slice(0, 4).map(i => ({ ...i, comments: i.comments.map(c => ({ ...c, body: c.body.replaceAll('gambler', 'stankman') })) }));
assert.equal(selectNext([...stankmanClaims, big], 'stankman', now), null);
assert.equal(selectNext([big], 'gambler', now, { gambler: 0 }), null);
assert.equal(selectNext([issue(9, [])], 'copilot', now), null);
assert.throws(() => main(['gambler']), /Live claiming is a follow-up/);

const largeOutputBytes = 2 * 1024 * 1024;
const largeOutput = captureApiResponse(
  execPath,
  ['-e', `process.stdout.write('x'.repeat(${largeOutputBytes}))`],
);
assert.equal(largeOutput.length, largeOutputBytes, 'projected API output larger than Node’s default buffer is supported');
assert.equal(API_OUTPUT_LIMIT_BYTES, 8 * 1024 * 1024, 'API output has a fixed upper bound');
assert.throws(
  () => captureApiResponse(execPath, ['-e', "process.stdout.write('x'.repeat(2048))"], 1024),
  /GitHub API output exceeded its 1024-byte safety limit/,
  'oversized API output fails with a bounded, actionable error',
);
console.log('claim-next: lane, age, PR, recent claim, active task, cap, read-only and bounded API output checks passed');
