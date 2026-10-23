import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const TASK_LABELS = new Set(['copilot-task', 'renauw-task']);

function rejected(reason) {
  return { dispatch: false, reason };
}

function requestedAgents(body) {
  const requests = [];
  if (/(?:^|[^\w])@copilot\b/i.test(body) || /\bi\s+assign\s+copilot\b/i.test(body)) {
    requests.push('copilot');
  }
  if (/(?:^|[^\w])@renauw\b/i.test(body) || /\bi\s+assign\s+renauw\b/i.test(body)) {
    requests.push('renauw');
  }
  return requests;
}

export function resolveIssueComment({
  issueIsPullRequest,
  labels = [],
  body,
  authorAssociation,
  authorLogin,
  authorType,
  issueNumber,
}) {
  if (issueIsPullRequest) return rejected('Pull request comments do not start issue tasks.');
  if (authorType !== 'User' || authorLogin?.endsWith('[bot]') || !TRUSTED_ASSOCIATIONS.has(authorAssociation)) {
    return rejected('Only comments from trusted human collaborators (OWNER, MEMBER, or COLLABORATOR) can start a task.');
  }

  const comment = String(body || '');
  if (comment.includes('<!-- copilot-dispatch:profile-handoff -->')) {
    return rejected('Workflow-generated Renauw profile handoffs do not start another task.');
  }
  if (comment.trimStart().startsWith('DONE')) {
    return rejected('DONE status comments do not start tasks.');
  }
  if (!labels.some(label => TASK_LABELS.has(label))) {
    return rejected('Add the copilot-task or renauw-task label before requesting an agent.');
  }

  const agents = requestedAgents(comment);
  if (agents.length === 0) {
    return rejected('Use @copilot (optionally followed by /go), "I assign Copilot", @renauw, or "I assign Renauw".');
  }
  if (agents.length > 1) {
    return rejected('The comment requests both agents; name only one agent per assignment.');
  }

  return {
    dispatch: true,
    agent: agents[0],
    issue: String(issueNumber),
    task: comment,
    reason: `Trusted ${agents[0]} assignment accepted for issue #${issueNumber}.`,
  };
}

export function resolveWorkflowDispatch({ issue, task, agent = 'copilot' }) {
  const number = String(issue || '');
  const description = String(task || '');
  if (!/^\d+$/.test(number)) return rejected('Manual dispatch requires a numeric issue number.');
  if (!description.trim()) return rejected('Manual dispatch requires a non-empty task description.');
  if (!['copilot', 'renauw'].includes(agent)) {
    return rejected(`Unknown custom agent "${agent}"; choose copilot or renauw.`);
  }
  return {
    dispatch: true,
    agent,
    issue: number,
    task: description,
    reason: `Manual ${agent} assignment accepted for issue #${number}.`,
  };
}

function writeOutput(name, value) {
  const delimiter = `COPILOT_DISPATCH_${randomUUID()}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function main() {
  const eventName = process.env.EVENT_NAME;
  let result;

  if (eventName === 'workflow_dispatch') {
    result = resolveWorkflowDispatch({
      issue: process.env.INPUT_NUMBER,
      task: process.env.INPUT_TASK,
      agent: process.env.INPUT_AGENT || 'copilot',
    });
  } else if (eventName === 'issue_comment') {
    let labels = [];
    try {
      labels = JSON.parse(process.env.ISSUE_LABELS || '[]').map(label => label.name);
    } catch {
      result = rejected('Could not read issue labels from the event payload.');
    }
    if (!result) {
      result = resolveIssueComment({
        issueIsPullRequest: process.env.ISSUE_IS_PULL_REQUEST === 'true',
        labels,
        body: process.env.COMMENT_BODY,
        authorAssociation: process.env.COMMENT_AUTHOR_ASSOCIATION,
        authorLogin: process.env.COMMENT_AUTHOR_LOGIN,
        authorType: process.env.COMMENT_AUTHOR_TYPE,
        issueNumber: process.env.ISSUE_NUMBER,
      });
    }
  } else {
    result = rejected(`Unsupported event: ${eventName || '(missing)'}.`);
  }

  writeOutput('dispatch', String(result.dispatch));
  if (result.dispatch) {
    writeOutput('agent', result.agent);
    writeOutput('issue', result.issue);
    writeOutput('task', result.task);
  }
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Copilot dispatch: ${result.dispatch ? 'accepted' : 'ignored'}\n\n${result.reason}\n`,
  );
  console.log(result.reason);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
