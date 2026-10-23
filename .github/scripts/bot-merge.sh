#!/usr/bin/env bash
# Lets Gemini (the reviewer) and RolexG merge pull requests (Cillian, 2026-10-22), with three rules:
#  1. The authenticated merger login must differ from the PR author login.
#  2. CI ("ci") must be green on the PR's latest commit.
#  3. Not into main if it changes anything players get (game, app, src, assets, pages), because a push to
#     main is a release to every phone. PRs into main that only touch .github/, docs/, tools/, screenshots/
#     or top-level .md files ship nothing to players, so those merge too (Cillian, 2026-10-22).
#     BOT_MERGE_MAIN=on allows all.
# Usage: bot-merge.sh <pr> Gemini   called after CI or a Gemini review; merges only if the latest Gemini
#                                    review of the current commit says "Verdict: merge". Quiet otherwise,
#                                    because whichever of CI and the review finishes last does the merge.
#        bot-merge.sh <pr> RolexG   "@rolexg merge" from Cillian's account; says why if it can't.
set -euo pipefail
PR=$1; AS=$2; BOT=github-actions[bot]
say(){ gh api "repos/$REPO/issues/$PR/comments" -f body="$AS: $1" > /dev/null; }
no(){ echo "Not merging #$PR: $1"; [ "$AS" = RolexG ] && say "I can't merge this one: $1"; exit 0; }

# Workflows provide the token action's actual App slug or the fallback bot login.
# Outside Actions, resolve a personal token's user; never guess the merger identity.
MERGER=${BOT_MERGER_LOGIN:-}
if [ -z "$MERGER" ]; then MERGER=$(gh api user --jq .login 2>/dev/null || true); fi
[ -n "$MERGER" ] && [ "$MERGER" != null ] || no "cannot identify the authenticated merger."
GEMINI_REVIEW_LOGIN=${GEMINI_REVIEW_LOGIN:-belfast-wheel-gemini[bot]}

pr=$(gh api "repos/$REPO/pulls/$PR")
[ "$(jq -r .state <<<"$pr")" = open ] || no "it isn't open."
[ "$(jq -r .draft <<<"$pr")" = false ] || no "it's still a draft."
[ "$(jq -r '.head.repo.full_name' <<<"$pr")" = "$REPO" ] || no "it comes from a fork."
head=$(jq -r .head.ref <<<"$pr"); base=$(jq -r .base.ref <<<"$pr"); sha=$(jq -r .head.sha <<<"$pr")
[ "$(jq -r .user.login <<<"$pr")" != "$MERGER" ] || no "the PR author and merger are both $MERGER."
default=$(gh api "repos/$REPO" --jq .default_branch)
if [ "$base" = "$default" ] && [ "${BOT_MERGE_MAIN:-}" != on ]; then
  shipped=$(gh api --paginate "repos/$REPO/pulls/$PR/files?per_page=100" --jq '.[].filename' \
    | grep -vE '^(\.github/|docs/|tools/|screenshots/|[^/]*\.md$)' || true)
  [ -z "$shipped" ] || no "it goes into \`$default\` and changes what players get ($(head -n3 <<<"$shipped" | paste -sd, -)), so it's a release. Claude or Copilot merges those."
fi

ci=$(gh api "repos/$REPO/commits/$sha/check-runs?check_name=ci&per_page=20" \
  --jq '[.check_runs[] | {status, conclusion, started_at}] | sort_by(.started_at) | last // empty')
[ -n "$ci" ] || no "CI hasn't run on the latest commit yet."
[ "$(jq -r .status <<<"$ci")" = completed ] || no "CI is still running."
[ "$(jq -r .conclusion <<<"$ci")" = success ] || no "CI is red on the latest commit."

if [ "$AS" = Gemini ]; then
  since=$(gh api "repos/$REPO/commits/$sha" --jq .commit.committer.date)
  verdict=$(gh api --paginate "repos/$REPO/issues/$PR/comments?per_page=100" --jq \
    ".[] | select((.user.login == \"$BOT\" or .user.login == \"$GEMINI_REVIEW_LOGIN\") and (.body | startswith(\"Gemini review:\")) and .created_at >= \"$since\") | .body" \
    | grep -oiP '^\s*\**verdict:?\**\s*\K\w+' | tail -n1 || true)
  [ "${verdict,,}" = merge ] || no "no 'Verdict: merge' from Gemini on the latest commit (got '${verdict:-nothing}')."
fi

gh api -X PUT "repos/$REPO/pulls/$PR/merge" -f merge_method=merge -f sha="$sha" > /dev/null || no "GitHub refused the merge (conflict, or the branch moved)."
say "merged into \`$base\` (CI green$( [ "$AS" = Gemini ] && echo ", reviewed"))."
# Merges made with the workflow token don't start other workflows, so refresh the status board by hand.
gh workflow run status.yml -R "$REPO" || true
