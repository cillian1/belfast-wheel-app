import assert from 'node:assert/strict';
import { fetchAllPages } from './github-pages.mjs';

const calls = [];
const request = async path => {
  calls.push(path);
  const page = Number(new URL(`https://example.test/${path}`).searchParams.get('page'));
  if (page === 1) return Array.from({ length: 100 }, (_, i) => ({ name: `branch-${i}` }));
  if (page === 2) return [{ name: 'update-32' }];
  throw new Error(`Unexpected page ${page}`);
};

const branches = await fetchAllPages(request, 'branches');
assert.equal(branches.length, 101);
assert.equal(branches.at(-1).name, 'update-32');
assert.deepEqual(calls, ['branches?per_page=100&page=1', 'branches?per_page=100&page=2']);
console.log('Tracker REST pagination: fetched all 101 branches, including update-32.');
