import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectNext, bots, main } from './claim-next.mjs';
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
// Exercise the actual gh subprocess path, rather than only fixture selection.
// Multiple paginated records, an empty collection and multiline comments must
// survive without requiring the newer --slurp flag or making any writes.
const directory = mkdtempSync(join(tmpdir(), 'claim-next-cli-'));
try {
  writeFileSync(join(directory, 'gh'), `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.length !== 5 || args[0] !== 'api' || args[1] !== '--paginate' || args[3] !== '--jq' || args[4] !== '.[] | @json') process.exit(9);
const endpoint = args[2];
let records;
if (endpoint.endsWith('issues?state=all&per_page=100')) records = [
  {number: 1, state: 'open', created_at: '2020-01-01T00:00:00Z', labels: [{name:'unassigned'}, {name:'size:big'}]},
  {number: 2, state: 'open', created_at: '2020-01-02T00:00:00Z', labels: [{name:'unassigned'}, {name:'size:big'}]}
];
else if (endpoint.includes('/comments?')) records = [{body: 'A comment\\nwith a newline' + 'x'.repeat(1024 * 1024), created_at: '2020-01-01T00:00:00Z'}];
else if (endpoint.includes('/1/timeline?')) records = [{source: {issue: {pull_request: {}, state: 'open'}}}];
else if (endpoint.includes('/2/timeline?')) records = [];
else process.exit(10);
for (const record of records) console.log(JSON.stringify(record));
`, { mode: 0o755 });
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('./claim-next.mjs', import.meta.url)), 'gambler', '--dry-run'], {
    encoding: 'utf8', env: { ...process.env, PATH: directory + delimiter + process.env.PATH, REPO: 'fixture/repo' },
  });
  assert.equal(output, 'gambler would claim #2\n');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log('claim-next: lane, age, PR, recent claim, active task, cap and read-only checks passed');
