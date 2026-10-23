// Fetch every item from a GitHub REST collection instead of silently accepting
// the first page. GitHub returns at most 100 results per page.
export async function fetchAllPages(request, path) {
  const separator = path.includes('?') ? '&' : '?';
  const results = [];
  for (let page = 1; ; page++) {
    const current = await request(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(current)) throw new TypeError(`Expected an array from ${path}`);
    results.push(...current);
    if (current.length < 100) return results;
  }
}
