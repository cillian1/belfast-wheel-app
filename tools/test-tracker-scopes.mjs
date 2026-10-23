import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { checkState, collectLive, generateTracker, resolveScopes } from './tracker.mjs';

const plan = JSON.parse(readFileSync(new URL('../tracker-plan.json', import.meta.url), 'utf8'));
const pr = (number, extra = {}) => ({ number, title: `Implementation ${number}`, state: 'open',
  body: '', base: { ref: 'update-32' }, head: { sha: `head-${number}` }, user: { login: 'worker' },
  updated_at: '2026-10-23T13:00:00Z', ci: 'passing', ...extra });
const comment = (body, extra = {}) => ({ body, user: { login: 'github-actions[bot]' },
  created_at: '2026-10-23T14:00:00Z', ...extra });
const merged = { state: 'closed', merged_at: '2026-10-23T12:00:00Z', merge_commit_sha: 'merge', inTarget: true, inMain: false };
const live = { issues: [199, 200, 209, 236].map(number => ({ number, state: 'closed', title: `Issue ${number}` })),
  comments: { 199: [comment('RolexG: on it. Working on old branch')] },
  prs: [
    pr(201, { user: { login: 'github-actions[bot]' }, head: { sha: '2541d3b' },
      comments: [comment('Gemini review:\nVerdict: merge\n2541d3b')],
      reviews: [{ state: 'APPROVED', commit_id: '2541d3b', user: { login: 'belfast-wheel-gemini[bot]' } }] }),
    pr(202, { base: { ref: 'main' } }),
    pr(218, merged), pr(219, { draft: true, body: '## HOLD: source-only instruction conflicts with CI' }),
    pr(238, { ...merged, body: 'Refs #209, #199' }),
    pr(232, { title: 'docs: plan', body: 'Closes #199' }),
    pr(242, merged), pr(244, { ...merged, body: 'Reverts #242' })
  ] };
let scopes = resolveScopes(plan, live);
const scope = id => scopes.find(s => s.id === id);
assert.equal(scopes.length, 9, 'Every approved scope remains visible, including previously unlinked additions');
assert.equal(scope('live-watch').owner, 'The Gambler');
assert.equal(scope('live-watch').deliverables[0].prs[0].number, 219);
assert.equal(scope('live-watch').deliverables[0].status, 'draft-hold');
assert.equal(scope('live-watch').deliverables[0].next.owner, 'Claude');
assert.equal(scope('live-watch').deliverables[0].prior[0].pr, 202);
assert.equal(scope('live-watch').deliverables[1].complete, false, 'Drawing fix does not prove chat regression');
assert.equal(scope('last-chicken').owner, 'The Gambler');
assert.equal(scope('last-chicken').implementationAuthor, 'RolexG');
assert.equal(scope('last-chicken').deliverables[0].status, 'awaiting-independent-review', 'Gemini is not independent of RolexG');
assert.equal(scope('last-chicken').deliverables[0].prs[0].head, '2541d3b');
assert.equal(scope('clean-recovery').status, 'partial');
assert.deepEqual(scope('clean-recovery').progress, { done: 1, total: 2 });
assert.deepEqual(scope('clean-recovery').deliverables.flatMap(d => d.prs.map(p => p.number)), [218, 219]);
assert.equal(scope('monster-d20').status, 'reverted');
assert.equal(scope('monster-d20').progress.done, 0);
assert.equal(scope('chicken-art').progress.done, 0, 'Closed issue is not shipping evidence');

const smallPlan = { update: 32, goals: ['verbatim goal'], cutLine: 'verbatim cut', scopes: [{
  id: 'stable', title: 'Stable title', description: 'Concrete approved scope', issues: [10],
  deliverables: [{ id: 'part', title: 'The part', prs: [20], prior: [{ pr: 19, reason: 'Superseded' }] }]
}] };
let small = { issues: [{ number: 10 }], comments: { 10: [
  comment('Copilot: Renauw picked this up, maybe'), comment('@rolexg please do #10'),
  comment('The Gambler: on it. Working on recovery'),
  comment('The Stankman: on it.', { user: { login: 'stranger' } })
] }, prs: [pr(19), pr(20, { state: 'closed' }), pr(21, { body: 'Closes #10' }),
  pr(22, { title: 'docs: planning report', body: 'Closes #10', updated_at: '2099' }),
  pr(23, { body: 'Mentions #10; unrelated changes', updated_at: '2099' })] };
let result = resolveScopes(smallPlan, small)[0];
assert.equal(result.id, 'stable');
assert.equal(result.title, 'Stable title');
assert.equal(result.owner, 'The Gambler');
assert.deepEqual(result.deliverables[0].prs.map(p => p.number), [21]);
smallPlan.scopes[0].issues = [11];
smallPlan.scopes[0].prior = [{ issue: 10, reason: 'Replaced by #11' }];
smallPlan.scopes[0].deliverables[0].prs = [24];
small = { issues: [{ number: 11, labels: [{ name: 'renauw-task' }], assignees: [{ login: 'Copilot' }] }],
  comments: { 11: [comment('The Gambler: on it.')] }, prs: [pr(24)] };
result = resolveScopes(smallPlan, small)[0];
assert.equal(result.id, 'stable', 'Replacing issue and PR preserves scope identity');
assert.equal(result.description, 'Concrete approved scope');
assert.equal(result.prior[0].issue, 10);
assert.equal(result.owner, 'Renauw', 'Task labels take precedence over assignees and claims');
small.issues[0].labels = [];
assert.equal(resolveScopes(smallPlan, small)[0].owner, 'Copilot');
assert.equal(resolveScopes(smallPlan, { issues: [], comments: { 11: [comment('CLAIMED: gambler')] }, prs: [] })[0].owner, 'The Gambler');
small.prs[0].ci = 'failing';
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].status, 'blocked');
small.prs[0].ci = 'pending';
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].complete, false);
small.prs[0].reviews = [{ state: 'APPROVED', commit_id: 'old-head', user: { login: 'Claude' } }];
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].status, 'awaiting-independent-review');
small.prs[0].reviews[0].commit_id = 'head-24';
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].status, 'awaiting-independent-merge');
small.prs[0].reviews.unshift({ state: 'CHANGES_REQUESTED', commit_id: 'head-24', user: { login: 'Claude' }, submitted_at: '2099' });
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].status, 'awaiting-independent-review', 'A newer changes-requested verdict supersedes approval');
small.prs[0] = pr(24, { ...merged, inTarget: false });
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].status, 'unverified-merge');
small.prs[0].inTarget = true;
assert.equal(resolveScopes(smallPlan, small)[0].status, 'merged-update');
small.prs[0].inMain = true;
assert.equal(resolveScopes(smallPlan, small)[0].status, 'released');
small.comments[11] = [comment('The Gambler: BLOCKED: wrong-target merge requires coordinator recovery')];
assert.equal(resolveScopes(smallPlan, small)[0].status, 'blocked', 'Live recovery blocker survives a merged PR');
assert.equal(resolveScopes(smallPlan, small)[0].progress.done, 0);
assert.equal(resolveScopes(smallPlan, small)[0].deliverables[0].prs[0].state, 'released', 'Still report code ancestry on main honestly');
small.comments[11] = [comment('RolexG: on it.', { user: { login: 'belfast-wheel-rolexg[bot]' } })];
small.issues[0].assignees = [];
assert.equal(resolveScopes(smallPlan, small)[0].owner, 'RolexG', 'Recognize actual RolexG App work comments');
live.prs.find(p => p.number === 244).inTarget = false;
assert.equal(resolveScopes(plan, live).find(s => s.id === 'monster-d20').status, 'merged-update', 'Unverified revert is not silently accepted');

for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']) {
  assert.equal(checkState([{ name: 'CI', status: 'completed', conclusion }]), 'failing');
}
assert.equal(checkState([]), 'pending');
assert.equal(checkState([], [], true), 'unknown');
assert.equal(checkState([{ name: 'CI', status: 'completed', conclusion: 'failure' }], [], true), 'failing');
assert.equal(checkState([{ name: 'CI', status: 'in_progress' }]), 'pending');
assert.equal(checkState([{ name: 'CI', status: 'completed', conclusion: null }]), 'pending');
assert.equal(checkState([{ name: 'CI', status: 'completed', conclusion: 'success' }], [{ context: 'legacy', state: 'error' }]), 'failing');
assert.equal(checkState([{ id: 2, name: 'CI', status: 'completed', conclusion: 'success' },
  { id: 1, name: 'CI', status: 'completed', conclusion: 'failure' }]), 'passing', 'Latest rerun wins');
assert.equal(checkState([], [{ context: 'ci', state: 'success', created_at: '2026-10-23' },
  { context: 'ci', state: 'failure', created_at: '2026-10-22' }]), 'passing');

// All list endpoints paginate; older explicit links and replacement work links get targeted lookup.
const calls = [];
const remotePlan = { ...smallPlan, scopes: [{ ...smallPlan.scopes[0], issues: [11], prior: [],
  deliverables: [{ id: 'part', title: 'Part', prs: [24] }] }] };
const request = async path => {
  calls.push(path);
  const u = new URL(`https://fixture/${path}`), page = Number(u.searchParams.get('page'));
  const p = u.pathname.slice(1);
  const noise = n => Array.from({ length: 100 }, (_, i) => ({ number: n + i }));
  if (p === 'branches') return page === 1 ? Array.from({ length: 100 }, (_, i) => ({ name: `branch-${i}` })) :
    [{ name: 'update-32', commit: { sha: 'target' } }, { name: 'main', commit: { sha: 'main' } }, { name: 'update-99' }];
  if (p === 'issues') return page === 1 ? noise(1000) : [{ number: 1999 }];
  if (p === 'pulls') return page === 1 ? noise(2000) : [];
  if (p === 'issues/11') return { number: 11, state: 'closed' };
  if (p === 'issues/11/comments') return page === 1 ? Array.from({ length: 100 }, () => comment('Chat, not work')) :
    [comment('The Gambler: opened #25 into update-32')];
  if (p === 'pulls/24') return pr(24, { ...merged, inTarget: undefined, inMain: undefined });
  if (p === 'pulls/25') return pr(25, { body: 'Closes #11' });
  if (p === 'issues/24/comments' || p === 'issues/25/comments' || p === 'pulls/25/reviews') return [];
  if (p === 'commits/head-25/check-runs') return { check_runs: page === 1 ?
    Array.from({ length: 100 }, (_, i) => ({ id: i, name: `check-${i}`, status: 'completed', conclusion: 'success' })) :
    [{ name: 'late check', status: 'completed', conclusion: 'timed_out' }] };
  if (p === 'commits/head-25/statuses') return [];
  if (p === 'compare/merge...target') return { status: 'ahead' };
  if (p === 'compare/merge...main') return { status: 'diverged' };
  throw new Error(`Unexpected request: ${path}`);
};
const fetched = await collectLive(remotePlan, request);
assert.equal(fetched.issues.some(i => i.number === 11), true);
assert.equal(fetched.prs.find(p => p.number === 24).inTarget, true);
assert.equal(fetched.prs.find(p => p.number === 24).inMain, false);
assert.equal(fetched.prs.find(p => p.number === 25).ci, 'failing');
for (const path of ['branches', 'issues', 'pulls', 'issues/11/comments', 'commits/head-25/check-runs']) {
  assert.ok(calls.some(c => c.startsWith(path + '?') && c.includes('page=2')), `Paginated ${path}`);
}
const generated = await generateTracker(remotePlan, request, { update: { number: 31 }, generatedAt: 'yesterday', tasks: [] }, []);
assert.equal(generated.update.branch, 'update-32', 'Do not accidentally follow a newer unrelated branch');
assert.deepEqual(generated.update.goals, remotePlan.goals);
assert.equal(generated.update.cutLine, remotePlan.cutLine);
assert.equal(generated.history[0].number, 31);
const failed = await collectLive(remotePlan, async path => {
  if (path.includes('/check-runs') || path.includes('compare/')) throw Error('403 fixture');
  return request(path);
});
assert.equal(failed.prs.find(p => p.number === 25).ci, 'unknown');
assert.equal(failed.prs.find(p => p.number === 24).inTarget, null);
assert.ok(failed.warnings.length);
const failedReviews = await collectLive(remotePlan, async path => {
  if (path.startsWith('pulls/25/reviews')) throw Error('403 reviews fixture');
  return request(path);
});
assert.equal(failedReviews.prs.find(p => p.number === 25).ci, 'failing', 'Review API failure cannot hide known failing CI');

// Exercise the real inline renderer without network/DOM dependencies, including escaping.
const html = readFileSync(new URL('../tracker.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
const document = { getElementById: id => {
  if (!elements.has(id)) elements.set(id, { style: {}, innerHTML: '', textContent: '', hidden: false });
  return elements.get(id);
} };
const context = vm.createContext({ document, console, setInterval() {},
  fetch: async () => ({ ok: true, json: async () => ({ scopes: [] }) }) });
vm.runInContext(script.replace('load();setInterval(load,60000);', ''), context);
context.data = { ...generated, scopes: resolveScopes(plan, live), warnings: ['API evidence unavailable'] };
context.data.scopes[0].description = '<img src=x onerror=alert(1)>';
vm.runInContext('render(data, [])', context);
assert.ok(elements.get('tasks').innerHTML.includes('&lt;img'));
assert.ok(!elements.get('tasks').innerHTML.includes('<img'));
assert.ok(elements.get('tasks').innerHTML.includes('Claude / Copilot'));
assert.ok(elements.get('tasks').innerHTML.includes('Draft / HOLD'));
assert.ok(elements.get('tasks').innerHTML.includes('Superseded'));
assert.ok(elements.get('evidence').textContent.includes('API evidence unavailable'));
assert.ok(html.includes('@media(max-width:600px)'));
vm.runInContext('render(data, [{number:31,releaseDate:"2026-10-23",releasePr:{number:221,url:"https://example.test/221"}}])', context);
assert.ok(elements.get('history').innerHTML.includes('not live-verified'), 'Legacy inferred release records are not fresh shipping proof');
vm.runInContext('render({update:{},tasks:[]}, [])', context);
assert.ok(elements.get('evidence').textContent.includes('has not been published'));
console.log('Tracker scopes: ownership, replacement, partial/reverted/released states, checks, paginated live evidence and renderer passed.');
