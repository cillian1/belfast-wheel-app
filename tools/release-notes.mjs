import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const [branch, ...args] = process.argv.slice(2);
if (!branch || !/^update-\d+$/.test(branch) || args.some(arg => arg !== '--apply')) {
  throw new Error('Usage: node tools/release-notes.mjs update-N [--apply]');
}
if (args.filter(arg => arg === '--apply').length > 1) throw new Error('Use --apply only once.');

function repositoryName() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const path = remote.replace(/\.git$/, '').split(/[:/]/).slice(-2).join('/');
  if (!path.includes('/')) throw new Error(`Cannot determine GitHub repository from origin: ${remote}`);
  return path;
}

const repository = repositoryName();
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error(`Invalid GitHub repository: ${repository}`);

const titles = [];
for (let page = 1; page <= 10; page++) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'belfast-wheel-app-release-notes' };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.authorization = 'Bearer ' + token;
  const url = new URL(`https://api.github.com/repos/${repository}/pulls`);
  url.search = new URLSearchParams({ state: 'closed', base: branch, per_page: '100', page: String(page) });
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
  const pulls = await response.json();
  titles.push(...pulls.filter(pull => pull.merged_at && pull.title).map(pull => ({
    title: pull.title.trim(),
    mergedAt: pull.merged_at,
  })));
  if (pulls.length < 100) break;
}

titles.sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
const uniqueTitles = [...new Set(titles.map(item => item.title))];
if (!uniqueTitles.length) throw new Error(`No merged pull requests found for ${branch}.`);

const notes = uniqueTitles.join('; ');
console.log(`### What's new\n\n${uniqueTitles.map(title => `- ${title}`).join('\n')}\n`);
if (args.includes('--apply')) {
  const path = new URL('../version.json', import.meta.url);
  const version = JSON.parse(await readFile(path, 'utf8'));
  version.notes = notes;
  await writeFile(path, `${JSON.stringify(version, null, 2)}\n`);
  console.log(`Updated version.json notes for ${branch}.`);
}
