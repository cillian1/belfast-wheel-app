import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveIssueComment, resolveWorkflowDispatch } from './copilot-dispatch-policy.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseComment = {
  issueIsPullRequest: false,
  labels: ['renauw-task'],
  body: '@copilot',
  authorAssociation: 'OWNER',
  authorLogin: 'cillian1',
  authorType: 'User',
  issueNumber: 214,
};

function decision(overrides = {}) {
  return resolveIssueComment({ ...baseComment, ...overrides });
}

assert.deepEqual(
  { dispatch: decision().dispatch, agent: decision().agent },
  { dispatch: true, agent: 'copilot' },
  'trusted @copilot starts Copilot on a renauw-task issue',
);
assert.equal(decision({ body: '@copilot /go', labels: ['copilot-task'] }).agent, 'copilot');
assert.equal(decision({ body: 'I assign Copilot', labels: ['renauw-task'] }).agent, 'copilot');
assert.equal(decision({ body: '@renauw', labels: ['renauw-task'] }).agent, 'renauw');
assert.equal(decision({ body: 'I assign Renauw', labels: ['copilot-task'] }).agent, 'renauw');
assert.equal(decision({ body: '@COPILOT', authorAssociation: 'MEMBER' }).agent, 'copilot');
assert.equal(decision({ body: '@renauw', authorAssociation: 'COLLABORATOR' }).agent, 'renauw');

assert.equal(decision({ authorAssociation: 'CONTRIBUTOR' }).dispatch, false, 'low-trust commenters cannot dispatch');
assert.equal(decision({ authorAssociation: 'FIRST_TIME_CONTRIBUTOR' }).dispatch, false, 'first-time contributors cannot dispatch');
assert.equal(decision({ authorType: 'Bot' }).dispatch, false, 'bot comments cannot dispatch');
assert.equal(decision({ authorLogin: 'automation[bot]' }).dispatch, false, 'bot logins cannot dispatch');
assert.equal(decision({ issueIsPullRequest: true }).dispatch, false, 'PR comments cannot dispatch');
assert.equal(decision({ labels: ['bug'] }).dispatch, false, 'task label is required');
assert.equal(decision({ body: 'Please start the work' }).dispatch, false, 'explicit agent request is required');
assert.equal(decision({ body: '@copilot and @renauw' }).dispatch, false, 'ambiguous requests are ignored');
assert.equal(decision({ body: 'DONE: finished' }).dispatch, false, 'DONE comments do not dispatch');
assert.equal(
  decision({ body: '<!-- copilot-dispatch:profile-handoff --> @copilot Use the Renauw profile' }).dispatch,
  false,
  'workflow-generated Renauw handoff comments cannot loop into another Copilot assignment',
);

assert.equal(resolveWorkflowDispatch({ issue: '214', task: 'Read-only report', agent: 'renauw' }).agent, 'renauw');
assert.equal(resolveWorkflowDispatch({ issue: '214', task: 'Build task' }).agent, 'copilot');
assert.equal(resolveWorkflowDispatch({ issue: 'not-a-number', task: 'Build task' }).dispatch, false);
assert.equal(resolveWorkflowDispatch({ issue: '214', task: ' ' }).dispatch, false);
assert.equal(resolveWorkflowDispatch({ issue: '214', task: 'Build task', agent: 'unknown' }).dispatch, false);

const workflow = readFileSync(resolve(root, '.github/workflows/copilot-dispatch.yml'), 'utf8');
assert.match(workflow, /node tools\/copilot-dispatch-policy\.mjs/, 'workflow uses the tested dispatch policy');
assert.match(workflow, /github\.event_name == 'issue_comment'/, 'comment events run policy feedback instead of skipping');
assert.match(workflow, /if: steps\.policy\.outputs\.dispatch == 'true'/, 'assignment runs only for accepted policy results');
assert.match(workflow, /--remove-assignee @copilot/, 'only the Copilot assignee is refreshed');
assert.doesNotMatch(workflow, /--remove-assignee\s+(?!@copilot)\S+/, 'unrelated assignees are never removed');

console.log('Copilot dispatch policy checks passed.');
