#!/usr/bin/env bash
# Writes the Banter chat (#30) to banter.json on the "banter" branch, plus typing.json saying who is writing
# a reply right now ($1, e.g. "gemini"; empty clears it), meta.json and seq/. chat.html reads them from raw.githubusercontent.com.
set -euo pipefail
typing=${1:-}
dir=$(mktemp -d)
gh api --paginate "repos/$REPO/issues/30/comments?per_page=100" \
  --jq '.[] | {body, at: .created_at, login: .user.login}' | jq -s '.' > "$dir/all.json"
jq '.[-300:]' "$dir/all.json" > "$dir/banter.json"
# seq/<n>.json: the same feed under the comment count n (and the 40 numbers below it; identical files cost git nothing). A page that hit
# GitHub's API limit polls seq/<n+1>.json: a brand-new path on raw.githubusercontent.com is fresh at once,
# unlike banter.json on the branch, which raw serves minutes stale.
n=$(jq length "$dir/all.json"); rm "$dir/all.json"; mkdir "$dir/seq"
jq -n --argjson n "$n" '{n: $n}' > "$dir/meta.json"
for k in $(seq $((n > 40 ? n - 40 : 0)) "$n"); do cp "$dir/banter.json" "$dir/seq/$k.json"; done
if [ -n "$typing" ]; then jq -n --arg who "$typing" '{who: $who, at: (now | todate)}'; else echo '{}'; fi > "$dir/typing.json"
cd "$dir" && git init -q && git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -q --orphan banter && git add banter.json typing.json meta.json seq && git commit -qm "Update banter.json"
# Two runs can write at once (a bot turn and the feed workflow). A force push then loses the race with
# "cannot lock ref"; try again a couple of times, and never fail the caller over a feed refresh.
for i in 1 2 3; do
  git push -qf "https://x-access-token:${GH_TOKEN}@github.com/$REPO.git" banter && exit 0
  sleep $((i * 2))
done
echo "Couldn't update the banter branch; the next run will." >&2
