// Generates tracker.json and preserves the previous update's final snapshot in tracker-history.json.
// The workflow publishes these files on the tracker branch for GitHub Pages.
import { botName } from './bot-identities.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY || 'cillian1/belfast-wheel-app';
const headers = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' };
async function gh(path) {
  const r = await fetch(`https://api.github.com/repos/${repo}/${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}`);
  return r.json();
}
const plan = JSON.parse(readFileSync('tracker-plan.json', 'utf8'));
const branches = await gh('branches?per_page=100');
const updates = branches.map(b => ({ name: b.name, n: +(b.name.match(/^update-(\d+)$/)?.[1] || 0) }))
  .filter(b => b.n).sort((a, b) => b.n - a.n);
const branch = updates[0];
if (!branch) throw new Error('No update-N branch found');
const allIssues = await gh('issues?state=all&per_page=100');
const issueComments = await gh('issues/comments?sort=created&direction=desc&per_page=100');
const allPrs = await gh('pulls?state=all&per_page=100');
const currentIssues = (plan.issues || []).map(x => typeof x === 'number' ? x : x.issue);
const commentsByIssue = new Map();
for (const c of issueComments) {
  const n = +c.issue_url.split('/').pop();
  if (!commentsByIssue.has(n)) commentsByIssue.set(n, []);
  commentsByIssue.get(n).push(c);
}
const linkedToBranch = new Set(allPrs.filter(p => p.base.ref === branch.name)
  .flatMap(p => [...`${p.title} ${p.body || ''}`.matchAll(/#(\d+)\b/g)].map(m => +m[1])));
const taskIssues = allIssues.filter(i => !i.pull_request && (currentIssues.includes(i.number) || linkedToBranch.has(i.number) ||
  ((i.labels || []).some(l => /^(copilot-task|rolexg|jimini-task|gambler-task)$/.test(l.name)) && i.title.startsWith('Task '))));
const selected = currentIssues.length ? taskIssues.filter(i => currentIssues.includes(i.number)) : taskIssues;
function owner(i) {
  const assigned = i.assignees?.[0]?.login || i.assignee?.login;
  if (botName(assigned)) return botName(assigned);
  const label = (i.labels || []).find(l => /^(copilot-task|rolexg|jimini-task|gambler-task)$/.test(l.name));
  if (label) return ({'copilot-task':'Copilot',rolexg:'RolexG','jimini-task':'Jimini','gambler-task':'The Gambler'})[label.name];
  const login = i.assignees?.[0]?.login || i.assignee?.login || 'Unassigned';
  return botName(login, i.title) || login;
}
function activity(i, p) {
  const dates = [i.updated_at, ...(commentsByIssue.get(i.number) || []).map(c => c.updated_at), ...p.map(x => x.updated_at)];
  return dates.filter(Boolean).sort().at(-1) || i.created_at;
}
const tasks = selected.map(i => {
  const ps = allPrs.filter(p => new RegExp(`#${i.number}\\b`).test(`${p.title} ${p.body || ''}`));
  const p = ps.sort((a,b) => +new Date(b.updated_at)-+new Date(a.updated_at))[0];
  const prState = !p ? 'none' : p.merged_at ? 'merged' : p.draft ? 'open' : 'review';
  const latestWord = (commentsByIssue.get(i.number) || []).find(c => /^(BLOCKED|DONE)\b/i.test(c.body.trim()));
  const blocked = latestWord && /^BLOCKED\b/i.test(latestWord.body.trim());
  return { issue:i.number, title:i.title, url:i.html_url, owner:owner(i), blocked:!!blocked,
    blockedText:blocked ? latestWord.body.trim().split('\n')[0].slice(0,180) : '', pr:p ? {number:p.number,title:p.title,url:p.html_url,state:prState} : null,
    prState, ci:p ? (p.statuses_url ? null : null) : null, lastActivity:activity(i,ps) };
});
// Check suites are queried only for the current open/review PRs; absent checks are reported as pending.
for (const t of tasks) if (t.pr && t.pr.state !== 'merged') {
  const p = allPrs.find(x => x.number === t.pr.number);
  try {
    const runs = await gh(`commits/${p.head.sha}/check-runs`);
    const arr = runs.check_runs || [];
    t.ci = !arr.length ? 'pending' : arr.some(x => x.conclusion === 'failure' || x.conclusion === 'cancelled') ? 'failing' :
      arr.every(x => x.status === 'completed') ? 'passing' : 'pending';
  } catch { t.ci = 'pending'; }
}
const targetPrs = allPrs.filter(p => p.base.ref === branch.name);
const merged = targetPrs.filter(p => p.merged_at).sort((a,b)=>+new Date(b.merged_at)-+new Date(a.merged_at)).slice(0,8);
let history = existsSync('tracker-history.json') ? JSON.parse(readFileSync('tracker-history.json','utf8')) : [];
// A previous update is archived once a newer update branch exists. Never replace an existing entry.
if (updates.length > 1) {
  const old = updates[1], oldPrs = allPrs.filter(p => p.base.ref === old.name && p.merged_at);
  const release = allPrs.find(p => p.base.ref === 'main' && p.merged_at &&
    new RegExp(`(?:update[- ]?)${old.n}\\b`, 'i').test(`${p.title} ${p.body || ''}`));
  const oldTasks = oldPrs.map(p => {
    const n = +(`${p.title} ${p.body || ''}`.match(/#(\d+)\b/) || [])[1];
    const issue = allIssues.find(i => i.number === n);
    return { owner:issue ? owner(issue) : botName(p.user?.login, p.title) || p.user?.login || 'Unassigned', issue:n || null,
      pr:p.number,title:p.title,url:p.html_url };
  });
  const oldEntry = { number:old.n, name:plan.previousName || `Update ${old.n}`, build:plan.previousBuild || null,
    releaseDate:release?.merged_at || null,
    releasePr:release ? {number:release.number,url:release.html_url} : null,
    tasks:oldTasks };
  if (!history.some(x=>x.number===old.n)) history.unshift(oldEntry);
}
history.sort((a,b)=>b.number-a.number);
const completed = tasks.filter(t=>t.prState==='merged' || (t.prState==='none' && allIssues.find(i=>i.number===t.issue)?.state==='closed')).length;
const data = { generatedAt:new Date().toISOString(), update:{number:branch.n,name:plan.name||`Update ${branch.n}`,branch:branch.name,
  goals:plan.goals||[],cutLine:plan.cutLine||'',progress:{done:completed,total:tasks.length}}, tasks,
  merges:merged.map(p=>({number:p.number,title:p.title,url:p.html_url,mergedAt:p.merged_at,owner:botName(p.user?.login, p.title)||p.user?.login||''})), history };
writeFileSync('tracker.json', JSON.stringify(data,null,2)+'\n');
writeFileSync('tracker-history.json', JSON.stringify(history,null,2)+'\n');
console.log(`tracker.json: update ${branch.n}, ${tasks.length} tasks, ${merged.length} merges, ${history.length} history entries`);
