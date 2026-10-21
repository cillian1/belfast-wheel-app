import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function buildReleaseNotes(pullRequests) {
  const tasks = pullRequests
    .filter(pr => pr.mergedAt)
    .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt) || a.number - b.number);
  if (!tasks.length) throw new Error('No merged task PRs found for this update branch');
  const notes = tasks.map(pr => pr.title.replace(/^Task \d+[A-Z]?:\s*/i, '')).join('; ');
  const markdown = `## What's new\n${tasks.map(pr => `- ${pr.title} (#${pr.number})`).join('\n')}\n\n${tasks.map(pr => `Closes #${pr.number}`).join('\n')}\n`;
  return { notes, markdown };
}

function main() {
  const [, , updateBranch, apply] = process.argv;
  if (!/^update-\d+$/.test(updateBranch || '') || (apply && apply !== '--apply')) {
    throw new Error('Usage: node tools/release-notes.mjs update-N [--apply]');
  }
  const pullRequests = JSON.parse(execFileSync('gh', [
    'pr', 'list', '--state', 'merged', '--base', updateBranch,
    '--json', 'number,title,mergedAt', '--limit', '100',
  ], { encoding: 'utf8' }));
  const release = buildReleaseNotes(pullRequests);
  process.stdout.write(release.markdown);
  if (apply === '--apply') {
    const versionPath = new URL('../version.json', import.meta.url);
    const version = JSON.parse(readFileSync(versionPath, 'utf8'));
    version.notes = release.notes;
    writeFileSync(versionPath, `${JSON.stringify(version, null, 2)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
