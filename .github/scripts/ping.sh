#!/usr/bin/env bash
# Send a visible bot-to-bot ping and wake the target where supported.
set -euo pipefail
who=${1:?usage: ping.sh who issue-or-pr message}
number=${2:?usage: ping.sh who issue-or-pr message}
message=${3:?usage: ping.sh who issue-or-pr message}
repo=${REPO:-${GITHUB_REPOSITORY:?REPO or GITHUB_REPOSITORY required}}
: "${GH_TOKEN:?GH_TOKEN required}"
case "$who" in rolexg|jimini|gemini|copilot|gambler|stankman|claude|cillian) ;; *) echo "Unknown target: $who" >&2; exit 2;; esac
[[ "$number" =~ ^[0-9]+$ ]] || { echo "Issue/PR number must be numeric" >&2; exit 2; }
from=${PING_FROM:-${GITHUB_ACTOR:-bot}}
case "$from" in
  github-actions\[bot\]) from=${PING_BOT_NAME:-bot};;
  cillian1) from=cillian;;
esac
from=${from,,}
today=$(date -u +%F)
comments=$(gh api --paginate "repos/$repo/issues/$number/comments?per_page=100" --jq '[.[] | {body,login:.user.login,created_at}] | .[]')
day_count=$(gh api --paginate "repos/$repo/issues/comments?since=${today}T00:00:00Z&per_page=100" --jq '[.[] | select(.body | contains(" ??? "))] | length' | awk '{s+=$1} END {print s+0}')
if (( day_count >= 30 )); then echo "Daily ping limit reached (30)." >&2; exit 0; fi

# Human comments reset the pair limit. On PRs, a commit newer than the last ping also resets it.
case "$from" in rolexg) display_from=RolexG;; jimini) display_from=Jimini;; gemini) display_from=Gemini;; copilot) display_from=Copilot;; gambler) display_from=The\ Gambler;; stankman) display_from=The\ Stankman;; claude) display_from=Claude;; cillian) display_from=Cillian;; *) display_from="$from";; esac
case "$who" in rolexg) display_who=RolexG;; jimini) display_who=Jimini;; gemini) display_who=Gemini;; copilot) display_who=Copilot;; gambler) display_who=The\ Gambler;; stankman) display_who=The\ Stankman;; claude) display_who=Claude;; cillian) display_who=Cillian;; esac
reset_at=$(jq -r 'select(.login != "github-actions[bot]") | .created_at' <<<"$comments" | tail -n1)
if gh api "repos/$repo/issues/$number" --jq '.pull_request.url' 2>/dev/null | grep -q .; then
  newest_commit=$(gh api "repos/$repo/pulls/$number/commits?per_page=100" --jq '[.[].commit.committer.date] | max // ""' 2>/dev/null || true)
  [[ -n "$newest_commit" && "$newest_commit" > "${reset_at:-0000}" ]] && reset_at=$newest_commit
fi
pair_count=$(jq -r --arg sent "$display_from ??? $display_who: " --arg received "$display_who ??? $display_from: " --arg after "${reset_at:-0000}" '
  select(.created_at > $after and ((.body | startswith($sent)) or (.body | startswith($received)))) | .body' <<<"$comments" | wc -l)
if (( pair_count >= 3 )); then echo "Pair ping limit reached (3); waiting for a human comment or new commit." >&2; exit 0; fi
gh api "repos/$repo/issues/$number/comments" -f body="$display_from ??? $display_who: $message" >/dev/null
case "$who" in
  rolexg|jimini) gh workflow run "$who".yml -R "$repo" -f number="$number" -f task="$message";;
  gemini)
    if gh api "repos/$repo/issues/$number" --jq '.pull_request.url' 2>/dev/null | grep -q .; then gh workflow run gemini-review.yml -R "$repo" -f pr="$number"; else echo "Gemini review requires a pull request." >&2; fi;;
  copilot)
    gh api "repos/$repo/issues/$number/comments" -f body="@copilot $message" >/dev/null
    gh workflow run copilot-dispatch.yml -R "$repo" -f number="$number" -f task="$message";;
  gambler) gh api "repos/$repo/issues/$number/labels" -f 'labels[]=gambler-task' >/dev/null;;
  stankman) gh api "repos/$repo/issues/$number/labels" -f 'labels[]=stankman-task' >/dev/null;;
  claude|cillian)
    if [[ "$number" != 30 ]]; then gh api "repos/$repo/issues/30/comments" -f body="$display_from ??? $display_who on #$number: $message" >/dev/null; fi;;
esac
