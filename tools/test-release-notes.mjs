import assert from 'node:assert/strict';
import { buildReleaseNotes } from './release-notes.mjs';

const release = buildReleaseNotes([
  { number: 42, title: 'Task 11B: fewer live notifications', mergedAt: '2026-10-22T02:00:00Z' },
  { number: 39, title: 'Task 11A: CI and housekeeping', mergedAt: '2026-10-22T01:00:00Z' },
  { number: 99, title: 'Unmerged change', mergedAt: null },
]);
assert.equal(release.notes, 'CI and housekeeping; fewer live notifications');
assert.equal(release.markdown, '## What\'s new\n- Task 11A: CI and housekeeping (#39)\n- Task 11B: fewer live notifications (#42)\n\nCloses #39\nCloses #42\n');

console.log('Release notes include merged PR titles in merge order and exclude unmerged PRs.');
