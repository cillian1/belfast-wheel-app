#!/usr/bin/env bash
# Writes the Banter chat (#30) to banter.json on the "banter" branch, plus typing.json saying who is writing
# a reply right now ($1, e.g. "gemini"; empty clears it). chat.html reads both from raw.githubusercontent.com.
set -euo pipefail
typing=${1:-}
dir=$(mktemp -d)
gh api --paginate "repos/$REPO/issues/30/comments?per_page=100" \
  --jq '.[] | {body, at: .created_at, login: .user.login}' | jq -s '.[-300:]' > "$dir/banter.json"
if [ -n "$typing" ]; then jq -n --arg who "$typing" '{who: $who, at: (now | todate)}'; else echo '{}'; fi > "$dir/typing.json"
cd "$dir" && git init -q && git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -q --orphan banter && git add banter.json typing.json && git commit -qm "Update banter.json"
# Two runs can write at once (a bot turn and the feed workflow). A force push then loses the race with
# "cannot lock ref"; try again a couple of times, and never fail the caller over a feed refresh.
for i in 1 2 3; do
  git push -qf "https://x-access-token:${GH_TOKEN}@github.com/$REPO.git" banter && exit 0
  sleep $((i * 2))
done
echo "Couldn't update the banter branch; the next run will." >&2
