import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const bots = ['copilot', 'gambler', 'stankman', 'rolexg', 'renauw', 'jimini'];
const owner = body => body.match(/(?:^|\n)(?:The Gambler: )?CLAIMED: (copilot|gambler|stankman|rolexg|renauw|jimini)\b/i)?.[1].toLowerCase();
export function selectNext(issues, bot, now = Date.now(), caps = {}) {
  if (!bots.includes(bot)) throw new Error(`Unknown bot: ${bot}`);
  const today = new Date(now).toISOString().slice(0, 10);
  const comments = issues.flatMap(i => i.comments);
  const count = comments.filter(c => owner(c.body) === bot && c.created_at.startsWith(today)).length;
  const cap = caps[bot] ?? ({ stankman: 4, rolexg: 8, copilot: 15 }[bot] ?? Infinity);
  if (count >= cap) return null;
  // Treat assigned, unfinished issues as active, even if their claim is older than two hours.
  if (issues.some(i => !i.labels.includes('unassigned') &&
    (i.labels.includes(`${bot}-task`) || i.comments.some(c => owner(c.body) === bot)) &&
    (i.linkedPRs.some(p => p.state === 'open') || !i.comments.some(c => /^(?:[^\n:]+: )?DONE:/m.test(c.body))))) return null;
  return issues.filter(i => {
    const labels = i.labels;
    if (!labels.includes('unassigned') || i.linkedPRs.some(p => p.state === 'open')) return false;
    if (i.comments.some(c => owner(c.body) && now - Date.parse(c.created_at) < 2 * 3600000)) return false;
    if (labels.includes('size:big') === labels.includes('size:small')) return false;
    if (labels.includes('lane:report')) return bot === 'jimini' && !labels.includes('lane:workflow');
    if (labels.includes('lane:workflow')) return ['copilot', 'gambler'].includes(bot);
    if (labels.includes('size:big')) return ['copilot', 'gambler', 'stankman'].includes(bot);
    return ['rolexg', 'renauw'].includes(bot) ||
      (['copilot', 'gambler'].includes(bot) && now - Date.parse(i.created_at) > 30 * 60000);
  }).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.number - b.number)[0] ?? null;
}

function api(repo, endpoint) {
  return JSON.parse(execFileSync('gh', ['api', '--paginate', '--slurp', `repos/${repo}/${endpoint}`], { encoding: 'utf8' })).flat();
}
function snapshot(repo) {
  // Include closed issues for today's claim count; paginate every collection.
  return api(repo, 'issues?state=all&per_page=100').filter(i => !i.pull_request).map(i => ({
    number: i.number, state: i.state, created_at: i.created_at,
    labels: i.labels.map(l => l.name),
    comments: api(repo, `issues/${i.number}/comments?per_page=100`),
    linkedPRs: api(repo, `issues/${i.number}/timeline?per_page=100`)
      .filter(e => e.source?.issue?.pull_request).map(e => e.source.issue),
  }));
}
export function main(args) {
  const bot = args[0];
  if (!args.includes('--dry-run') || !(bots.includes(bot) || bot === 'all')) {
    throw new Error('Usage: claim-next.sh <bot|all> --dry-run [--fixture snapshot.json]. Live claiming is a follow-up.');
  }
  const fixtureIndex = args.indexOf('--fixture');
  const repo = process.env.REPO || process.env.GITHUB_REPOSITORY;
  if (fixtureIndex < 0 && !repo) throw new Error('REPO or GITHUB_REPOSITORY required');
  const data = fixtureIndex >= 0 ? JSON.parse(readFileSync(args[fixtureIndex + 1], 'utf8')) : { issues: snapshot(repo) };
  // Closed issues count toward caps but never toward selection or active tasks.
  for (const name of bot === 'all' ? bots : [bot]) {
    const now = data.now ? Date.parse(data.now) : Date.now();
    const cap = name === 'rolexg' ? Number(process.env.ROLEXG_DAILY_CAP || 8) : undefined;
    const closedClaims = data.issues.filter(i => i.state === 'closed').flatMap(i => i.comments)
      .filter(c => owner(c.body) === name && c.created_at.startsWith(new Date(now).toISOString().slice(0, 10))).length;
    const limit = cap ?? ({ stankman: 4, copilot: 15 }[name] ?? Infinity);
    const issue = selectNext(data.issues.filter(i => i.state !== 'closed'), name, now, { [name]: limit - closedClaims });
    if (issue) console.log(`${name} would claim #${issue.number}`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
