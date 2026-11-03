// Stable planned scopes + read-only live GitHub evidence. Importing performs no I/O.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fetchAllPages } from './github-pages.mjs';

const seats = { 'copilot-task': 'Copilot', 'renauw-task': 'Renauw', rolexg: 'RolexG',
  'jimini-task': 'Jimini', 'gambler-task': 'The Gambler', 'stankman-task': 'The Stankman' };
const names = /^(The Gambler|The Stankman|RolexG|Renauw|Copilot|Claude|Gemini|Jimini):\s*/i;
const canonical = s => {
  const bot = s?.match(/^belfast-wheel-(gemini|copilot|claude)\[bot\]$/i)?.[1];
  return Object.values(seats).concat(['Claude', 'Gemini']).find(n => n.toLowerCase() === (bot || s)?.toLowerCase()) || s;
};
const trusted = c => /^(cillian1|github-actions\[bot\]|Copilot|belfast-wheel-(?:gemini|copilot|claude|rolexg|renauw|jimini|gambler|stankman)\[bot\])$/i.test(c.user?.login || '');
function statement(c) {
  if (!trusted(c)) return null;
  const claim = (c.body || '').trim().match(/^(?:The Gambler:\s*)?CLAIMED:\s*(copilot|gambler|stankman|rolexg|renauw|jimini)\b/i);
  if (claim) {
    const key = claim[1].toLowerCase();
    return { owner: seats[key === 'rolexg' ? key : `${key}-task`], text: c.body.trim(), url: c.html_url, at: c.created_at || '' };
  }
  const m = (c.body || '').trim().match(names);
  if (!m) return null;
  const text = c.body.trim().slice(m[0].length);
  // Requests, mentions, chat and worker-trigger handoffs are not claims.
  if (!/^(?:on it\b|CLAIMED:|Working on\b|Recover(?:ed|y)\b|opened #|pushed to #|BLOCKED:|CURRENT:|DONE:)/i.test(text)) return null;
  return { owner: canonical(m[1]), text, url: c.html_url, at: c.created_at || '' };
}
const newest = xs => [...xs].sort((a, b) => (b.created_at || b.submitted_at || '').localeCompare(a.created_at || a.submitted_at || ''));
const url = (n, pr = false) => `https://github.com/cillian1/belfast-wheel-app/${pr ? 'pull' : 'issues'}/${n}`;
const unique = xs => [...new Set(xs)];
const linked = (n, prs) => prs.some(p => p.number === n);

export function checkState(runs = [], statuses = [], unavailable = false) {
  // A rerun supersedes the earlier run with the same app/name.
  const latest = new Map();
  for (const r of [...runs].sort((a, b) => (b.id || 0) - (a.id || 0))) {
    const key = `${r.app?.id || ''}:${r.name}`;
    if (!latest.has(key)) latest.set(key, r);
  }
  const contexts = new Map();
  for (const s of newest(statuses)) if (!contexts.has(s.context)) contexts.set(s.context, s);
  const rs = [...latest.values()], ss = [...contexts.values()];
  if (rs.some(r => ['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale'].includes(r.conclusion)) ||
      ss.some(s => ['failure', 'error'].includes(s.state))) return 'failing';
  if (unavailable) return 'unknown';
  if (!rs.length && !ss.length) return 'pending';
  if (rs.some(r => r.status !== 'completed' || !['success', 'neutral', 'skipped'].includes(r.conclusion)) ||
      ss.some(s => s.state !== 'success')) return 'pending';
  return 'passing';
}

function fallbackOwner(issues, comments) {
  for (const i of issues) {
    const label = i.labels?.map(l => typeof l === 'string' ? l : l.name).find(l => seats[l]);
    if (label) return seats[label];
  }
  for (const i of issues) if (i.assignees?.length || i.assignee) return canonical(i.assignees?.[0]?.login || i.assignee.login);
  return newest(comments).map(statement).find(Boolean)?.owner || 'Unassigned';
}

function implementation(p, issueNumbers, comments) {
  if (/\b(?:docs?|planning|read.only|audit|report.only)\b/i.test(p.title || '')) return false;
  // Only explicit closing syntax or an actual worker's work-link, never arbitrary #refs.
  return issueNumbers.some(n => new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+(?:[\\w.-]+/[\\w.-]+)?#${n}\\b`, 'i').test(p.body || '')) ||
    comments.some(c => {
      const s = statement(c);
      return s && /^(?:Recover(?:ed|y)\b|opened|pushed to|DONE:)/i.test(s.text) && new RegExp(`#${p.number}\\b`).test(s.text);
    });
}

function independentApproval(p, policy) {
  const excluded = new Set([policy.implementationAuthor, policy.owner, p.authorSeat,
    ...Object.keys(seats).filter(l => p.labels?.some(x => (x.name || x) === l)).map(l => seats[l])].filter(Boolean));
  if (excluded.has('RolexG') || excluded.has('Gemini')) { excluded.add('RolexG'); excluded.add('Gemini'); }
  const allowed = seat => !excluded.has(seat) && (!policy.reviewers || policy.reviewers.includes(seat));
  const reviews = new Map();
  for (const r of newest(p.reviews || [])) {
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state) ||
        r.commit_id !== p.head?.sha || reviews.has(r.user?.login)) continue;
    reviews.set(r.user?.login, r);
  }
  if ([...reviews.values()].some(r => r.state === 'CHANGES_REQUESTED')) return false;
  return [...reviews.values()].some(r => r.state === 'APPROVED' && r.user?.login !== p.user?.login &&
    allowed(canonical(r.user?.login))) ||
    (p.comments || []).some(c => {
      if (!trusted(c)) return false;
      const seat = c.body?.match(/^(Claude|Copilot|Gemini)(?: review)?:/i)?.[1] ||
        c.user?.login?.match(/^belfast-wheel-(claude|copilot|gemini)\[bot\]$/i)?.[1];
      // Bot verdicts count only when explicitly tied to this head.
      return seat && allowed(canonical(seat)) && /Verdict:\s*merge\b/i.test(c.body) &&
        c.body.includes(p.head?.sha || '\0');
    });
}

export function resolveScopes(plan, live) {
  const issues = live.issues || [], prs = live.prs || [], comments = live.comments || {};
  const target = `update-${plan.update}`;
  return (plan.scopes || []).map(scope => {
    const issueNumbers = unique([...(scope.issues || []), ...scope.deliverables.flatMap(d => d.issues || [])]);
    const sis = issues.filter(i => issueNumbers.includes(i.number));
    const cs = issueNumbers.flatMap(n => comments[n] || []).concat(
      prs.filter(p => scope.deliverables.some(d => d.prs?.includes(p.number))).flatMap(p => p.comments || []));
    const owner = scope.owner || fallbackOwner(sis, cs);
    const deliverables = scope.deliverables.map(d => {
      const prior = d.prior || [];
      const ns = d.issues?.length ? d.issues : scope.issues || [];
      const workComments = ns.flatMap(n => comments[n] || []);
      const candidates = prs.filter(p => !prior.some(x => x.pr === p.number) &&
        (d.prs?.includes(p.number) || (d.discover !== false && p.base?.ref === target && implementation(p, ns, workComments))));
      // Explicit current links are authoritative; newer real closing/work links can replace them.
      candidates.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      const active = candidates.filter(p => p.state === 'open');
      const chosen = active.length ? active : candidates.slice(0, 1);
      const verifiedRevert = r => prs.some(revert => revert.number === r.pr && revert.merged_at && revert.inTarget === true &&
        new RegExp(`\\bReverts\\s+#${r.reverts}\\b`, 'i').test(revert.body || ''));
      const invalidated = (p, seen = new Set()) => (scope.reverts || []).some(r => r.reverts === p.number &&
        !seen.has(r.pr) && verifiedRevert(r) && !invalidated({ number: r.pr }, new Set([...seen, p.number])));
      const states = chosen.map(p => {
        if (p.merged_at) {
          if (invalidated(p)) return 'reverted';
          if (p.inMain === true) return 'released';
          if (p.inTarget === true) return 'merged-update';
          return 'unverified-merge';
        }
        if (p.state !== 'open') return 'closed-unmerged';
        if (p.draft || /(?:^|\n)#{0,3}\s*HOLD\b/i.test(p.body || '')) return 'draft-hold';
        if (p.base?.ref !== target) return 'wrong-target';
        if (p.ci === 'failing') return 'blocked';
        return independentApproval(p, { ...scope, owner }) ? 'awaiting-independent-merge' : 'awaiting-independent-review';
      });
      const work = newest(workComments.concat(chosen.flatMap(p => p.comments || []))).map(statement).find(Boolean);
      let status = states[0] || (/^BLOCKED:/i.test(work?.text || '') ? 'blocked' : 'working');
      if (states.length > 1 && !states.every(s => s === status)) status = 'partial';
      if (!chosen.some(p => p.state === 'open' && !p.merged_at && p.draft) && /^BLOCKED:/i.test(work?.text || '') &&
          (!chosen.length || work.at >= chosen.map(p => p.merged_at || p.created_at || '').sort().at(-1))) status = 'blocked';
      const complete = status !== 'blocked' && states.length > 0 && states.every(s => ['released', 'merged-update'].includes(s));
      const hold = chosen.find(p => p.state === 'open' && !p.merged_at && (p.draft || /\bHOLD\b/.test(p.body || '')));
      const blocker = hold ? (hold.body || '').match(/(?:^|\n)#{0,3}\s*HOLD[^\n]*/i)?.[0]?.trim() || 'Draft PR — not ready to merge' :
        status === 'blocked' ? (chosen.some(p => p.ci === 'failing') ? 'Latest head has failing checks' : work?.text) :
        status === 'reverted' ? 'Implementation was reverted on the update branch' :
        status === 'unverified-merge' ? 'Merge ancestry could not be verified in the update branch or main' :
        status === 'wrong-target' ? `Implementation does not target ${target}` : '';
      const reviewOwner = scope.reviewers?.join(' / ') || 'Independent reviewer (not the author)';
      const nextOwner = complete ? 'Release coordinator' : status === 'draft-hold' ? d.holdOwner || owner :
        status.startsWith('awaiting-independent-') ? reviewOwner : d.nextOwner || owner;
      const action = complete ? (status === 'released' ? 'Released on main' : 'Include in independently reviewed release to main') :
        status === 'draft-hold' ? d.holdAction || 'Resolve HOLD and make PR ready; do not merge draft' :
        status === 'awaiting-independent-merge' ? 'Merge only after independent approval and green latest-head CI' :
        status === 'awaiting-independent-review' ? 'Review this head independently, then merge only with green CI' :
        d.nextAction || (status === 'blocked' ? 'Fix the blocker and rerun checks' : 'Implement and provide regression evidence');
      return { id: d.id, title: d.title, status, complete, owner: d.owner || owner, blocker,
        issues: (d.issues || []).map(n => ({ number: n, url: url(n), state: issues.find(i => i.number === n)?.state || 'unknown' })),
        prs: chosen.map(p => ({ number: p.number, title: p.title, url: p.html_url || url(p.number, true),
          state: states[chosen.indexOf(p)], ci: p.ci || 'unknown', head: p.head?.sha, author: p.user?.login,
          inTarget: p.inTarget ?? null, inMain: p.inMain ?? null })),
        prior: [...prior, ...candidates.filter(p => !linked(p.number, chosen)).map(p => ({ pr: p.number, reason: 'Prior implementation' }))],
        reverts: (scope.reverts || []).map(r => ({ ...r, verified: verifiedRevert(r) })),
        next: { owner: nextOwner, action } };
    });
    const done = deliverables.filter(d => d.complete).length;
    return { id: scope.id, title: scope.title, description: scope.description, owner,
      implementationAuthor: scope.implementationAuthor || null,
      issues: (scope.issues || []).map(n => ({ number: n, url: url(n), title: issues.find(i => i.number === n)?.title || '', state: issues.find(i => i.number === n)?.state || 'unknown' })),
      prior: scope.prior || [], dependencies: scope.dependencies || [], deliverables, progress: { done, total: deliverables.length },
      status: done === deliverables.length ? (deliverables.every(d => d.status === 'released') ? 'released' : 'merged-update') :
        done ? 'partial' : deliverables.length === 1 ? deliverables[0].status : 'in-progress',
      blocked: deliverables.some(d => !!d.blocker),
      lastActivity: [...sis.map(i => i.updated_at), ...cs.map(c => c.created_at),
        ...prs.filter(p => deliverables.some(d => linked(p.number, d.prs))).map(p => p.updated_at)].filter(Boolean).sort().at(-1) || null };
  });
}

// Injectable request keeps pagination, targeted recovery lookup and ancestry testable offline.
export async function collectLive(plan, request) {
  const warnings = [], cache = new Map();
  const get = path => {
    if (!cache.has(path)) cache.set(path, request(path));
    return cache.get(path);
  };
  const optional = async (path, fallback) => {
    try { return await get(path); } catch (e) { warnings.push(`${path}: ${e.message}`); return fallback; }
  };
  const [branches, issueList, prList] = await Promise.all([
    fetchAllPages(get, 'branches'), fetchAllPages(get, 'issues?state=all'), fetchAllPages(get, 'pulls?state=all')
  ]);
  const target = branches.find(b => b.name === `update-${plan.update}`);
  const main = branches.find(b => b.name === 'main');
  if (!target || !main) throw new Error(`Missing planned update-${plan.update} or main branch`);
  const issues = issueList.filter(i => !i.pull_request), prs = [...prList], comments = {};
  const ns = unique(plan.scopes.flatMap(s => [...s.issues, ...s.deliverables.flatMap(d => d.issues || []),
    ...(s.prior || []).map(x => x.issue), ...s.deliverables.flatMap(d => (d.prior || []).map(x => x.issue))]).filter(Number.isInteger));
  const explicit = unique(plan.scopes.flatMap(s => [...(s.prior || []).map(x => x.pr),
    ...s.deliverables.flatMap(d => [...(d.prs || []), ...(d.prior || []).map(x => x.pr)]),
    ...(s.reverts || []).map(r => r.pr)]).filter(Number.isInteger));
  for (const n of ns) {
    // Targeted lookup is deliberate even when the global list has rolled past the issue.
    const i = await optional(`issues/${n}`, null);
    if (i) { const at = issues.findIndex(x => x.number === n); if (at < 0) issues.push(i); else issues[at] = i; }
    try { comments[n] = await fetchAllPages(get, `issues/${n}/comments`); }
    catch (e) { warnings.push(`Comments #${n}: ${e.message}`); comments[n] = []; }
  }
  // Actual work comments can name replacement PRs outside the list window.
  for (const cs of Object.values(comments)) for (const c of cs) {
    const s = statement(c);
    if (s && /^(?:Recover(?:ed|y)\b|opened|pushed to|DONE:)/i.test(s.text)) {
      for (const m of s.text.matchAll(/#(\d+)\b/g)) explicit.push(+m[1]);
    }
  }
  for (const n of unique(explicit)) {
    const p = await optional(`pulls/${n}`, null);
    if (p) { const at = prs.findIndex(x => x.number === n); if (at < 0) prs.push(p); else prs[at] = p; }
  }
  const relevant = prs.filter(p => explicit.includes(p.number) || (p.base?.ref === target.name &&
    implementation(p, ns, Object.values(comments).flat())));
  for (let p of relevant) {
    // List responses lack merge details; fetch the individual PR.
    const detail = await optional(`pulls/${p.number}`, null);
    if (detail) Object.assign(p, detail);
    try { p.comments = await fetchAllPages(get, `issues/${p.number}/comments`); }
    catch (e) { warnings.push(`PR comments #${p.number}: ${e.message}`); p.comments = []; }
    if (p.merged_at && p.merge_commit_sha) {
      for (const [field, b] of [['inTarget', target], ['inMain', main]]) {
        const c = await optional(`compare/${p.merge_commit_sha}...${b.commit.sha}`, null);
        p[field] = c ? ['ahead', 'identical'].includes(c.status) : null;
      }
    } else if (p.state === 'open' && p.head?.sha) {
      const pages = async (path, field) => {
        try { return await fetchAllPages(async page => { const r = await get(page); return field ? r[field] : r; }, path); }
        catch (e) { warnings.push(`${path}: ${e.message}`); return null; }
      };
      const [runs, statuses, reviews] = await Promise.all([
        pages(`commits/${p.head.sha}/check-runs`, 'check_runs'),
        pages(`commits/${p.head.sha}/statuses`), pages(`pulls/${p.number}/reviews`)
      ]);
      p.ci = checkState(runs || [], statuses || [], runs === null || statuses === null);
      p.reviews = reviews || [];
    }
  }
  return { issues, prs: relevant, comments, warnings, branches };
}

export async function generateTracker(plan, request, previous = null, history = []) {
  const live = await collectLive(plan, request);
  const scopes = resolveScopes(plan, live);
  if (previous?.update?.number < plan.update && !history.some(h => h.number === previous.update.number)) {
    history = [{ ...previous.update, ...(previous.scopes ? { scopes: previous.scopes } : { tasks: previous.tasks || [] }),
      snapshotAt: previous.generatedAt }, ...history];
  }
  return { generatedAt: new Date().toISOString(), update: { number: plan.update, name: plan.name || `Update ${plan.update}`,
    branch: `update-${plan.update}`, goals: plan.goals || [], cutLine: plan.cutLine || '',
    progress: { done: scopes.filter(s => ['released', 'merged-update'].includes(s.status)).length, total: scopes.length } },
    scopes, warnings: live.warnings, history,
    merges: live.prs.filter(p => p.merged_at && p.inTarget === true).sort((a, b) => b.merged_at.localeCompare(a.merged_at)).slice(0, 8)
      .map(p => ({ number: p.number, title: p.title, url: p.html_url, mergedAt: p.merged_at })) };
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || 'cillian1/belfast-wheel-app';
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) headers.Authorization = 'Bearer ' + process.env.GH_TOKEN;
  const request = async path => {
    const r = await fetch(`https://api.github.com/repos/${repo}/${path}`, { headers });
    if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}`);
    return r.json();
  };
  const published = async file => {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
    try {
      const content = await request(`contents/${file}?ref=tracker`);
      return JSON.parse(Buffer.from(content.content, 'base64').toString('utf8'));
    } catch (e) {
      if (!e.message.includes('GitHub 404')) throw e; // Do not silently erase existing history on API failure.
      return null;
    }
  };
  const plan = JSON.parse(readFileSync('tracker-plan.json', 'utf8'));
  const data = await generateTracker(plan, request, await published('tracker.json'), await published('tracker-history.json') || []);
  writeFileSync('tracker.json', JSON.stringify(data, null, 2) + '\n');
  writeFileSync('tracker-history.json', JSON.stringify(data.history, null, 2) + '\n');
  console.log(`tracker.json: update ${plan.update}, ${data.scopes.length} scopes; ${data.warnings.length} evidence warnings`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
