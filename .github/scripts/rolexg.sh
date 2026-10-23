#!/usr/bin/env bash
# RolexG, the Gemini coding agent (.github/workflows/rolexg.yml). Two steps around the Gemini CLI run:
#   rolexg.sh start   read the task, check the limits, pick the branch, say "on it"
#   rolexg.sh finish  rebuild the bundle, commit, push, open or update the PR, report back
# RolexG never merges its own PRs. "@rolexg merge" on someone else's PR merges it through
# .github/scripts/bot-merge.sh (green CI, not into main).
# Its comments are posted as github-actions[bot] with "RolexG:" in front. Comments made with the
# workflow's own token never start workflows, so RolexG can't set itself off.
set -euo pipefail
BOT=github-actions[bot]
MAX_DAY=${MAX_DAY:-8}       # tasks per UTC day, across the whole repo (repo variable ROLEXG_DAILY_CAP)
MAX_ROUNDS=${MAX_ROUNDS:-5} # rounds on one issue or PR before it needs a human to step in

say(){ gh api "repos/$REPO/issues/$1/comments" -f body="RolexG: $2" > /dev/null; }
out(){ local d="EOF_$RANDOM$RANDOM"; { echo "$1<<$d"; echo "$2"; echo "$d"; } >> "$GITHUB_OUTPUT"; }

start(){
  # "@rolexg merge" on a PR is a merge, not a coding task (no Gemini call, doesn't count towards the limits).
  if [ "$EVENT" = issue_comment ] && grep -qiP '^\s*@rolexg\s+merge\b' <<<"$COMMENT_BODY"; then
    echo "skip=true" >> "$GITHUB_OUTPUT"
    "$(dirname "$0")/bot-merge.sh" "$NUM" RolexG; exit 0; fi
  today=$(date -u +%F)
  day=$(gh api --paginate "repos/$REPO/issues/comments?since=${today}T00:00:00Z&per_page=100" --jq \
    "[.[] | select(.user.login == \"$BOT\" and (.created_at | startswith(\"$today\")) and (.body | startswith(\"RolexG: on it\")))] | length" \
    | awk '{s+=$1} END {print s+0}')
  rounds=$(gh api --paginate "repos/$REPO/issues/$NUM/comments?per_page=100" --jq \
    "[.[] | select(.user.login == \"$BOT\" and (.body | startswith(\"RolexG: on it\")))] | length" | awk '{s+=$1} END {print s+0}')
  echo "RolexG tasks today: $day/$MAX_DAY, rounds on #$NUM: $rounds/$MAX_ROUNDS"
  if [ "$day" -ge "$MAX_DAY" ]; then
    say "$NUM" "I've hit today's limit of $MAX_DAY tasks, so I'm leaving this one. Ask again after midnight UTC, or raise the ROLEXG_DAILY_CAP repo variable."
    echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; fi
  if [ "$rounds" -ge "$MAX_ROUNDS" ]; then
    say "$NUM" "That's $MAX_ROUNDS rounds on this one, which is my limit. Claude or Cillian should take a look before I go again."
    echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; fi

  issue=$(gh api "repos/$REPO/issues/$NUM")
  title=$(jq -r .title <<<"$issue")
  case $EVENT in
    issue_comment) task=$COMMENT_BODY;;
    issues) task="$title
$(jq -r '.body // ""' <<<"$issue")";;
    *) task=$INPUT_TASK;;
  esac

  default=$(gh api "repos/$REPO" --jq .default_branch)
  if jq -e .pull_request <<<"$issue" > /dev/null; then
    pr=$(gh api "repos/$REPO/pulls/$NUM")
    head=$(jq -r .head.ref <<<"$pr"); fork=$(jq -r '.head.repo.full_name != .base.repo.full_name' <<<"$pr")
    [ "$fork" = true ] && { say "$NUM" "This PR comes from a fork, so I can't work on it."; echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; }
    if [[ $head == rolexg/* ]]; then branch=$head; base=$(jq -r .base.ref <<<"$pr")
    else branch="rolexg/pr-$NUM"; base=$head; fi # someone else's PR: a follow-up PR on top of it
    where="pull request #$NUM \"$title\" (branch $head)"
  else
    branch="rolexg/issue-$NUM"
    # "base: update-28" anywhere in the task picks the branch to work from and open the PR into.
    base=$(grep -oiP '\bbase:\s*\K[A-Za-z0-9._/-]+' <<<"$task" | head -n1 || true)
    base=${base:-$default}
    where="issue #$NUM \"$title\""
  fi
  gh api "repos/$REPO/branches/$base" > /dev/null 2>&1 || { say "$NUM" "I can't find a branch called \`$base\` to work from."; echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; }
  # Carry on from the branch only while its PR is open; otherwise start fresh from the base (the push
  # then overwrites whatever an earlier, failed run left there).
  open=$(gh api "repos/$REPO/pulls?head=${REPO%%/*}:$branch&state=open" --jq 'length')
  if [ "$open" -gt 0 ]; then from=$branch; else from=$base; fi

  # The thread so far, newest last, so RolexG knows what was already said.
  thread=$(gh api --paginate "repos/$REPO/issues/$NUM/comments?per_page=100" --jq '.[] | "[" + .user.login + "] " + .body' \
    | tail -c 12000)
  body=$(jq -r '.body // ""' <<<"$issue" | head -c 6000)

  prompt="You are RolexG, a coding agent built on Gemini, working in this repository (the Belfast Wheel). GEMINI.md has the house rules: follow them.
When you finish, get blocked, or are waiting on someone, invoke .github/scripts/ping.sh straight away and name exactly what you need. Ping Gemini for review when you open a PR, and Jimini too for money PRs; ping the author or merger when a review or merge is needed.

You were asked for this on $where:
---
$task
---

Context. The $( [ "$NUM" = 30 ] && echo "Banter chat" || echo "issue or PR" ) description:
$body

Comments so far (oldest first, may be cut):
$thread

Do the task by editing files in the working tree. Don't run git commit, git push or gh, and don't open PRs: the workflow commits your changes, opens the pull request and posts your summary when you finish. If the task is only a question, answer it and change nothing. If the task is unclear or too big for one go (about 20 minutes of work), do the most useful clear part and say what's left.

When you're done, end with a short summary for the humans: what you changed and why, in plain words, 3 to 6 lines, no headings."
  out prompt "$prompt"
  out title "$(head -n1 <<<"$task" | sed -E 's/@rolexg//Ig; s/\bbase:\s*\S+//Ig; s/^[[:space:],:.—–-]+//' | cut -c1-70)"
  echo "branch=$branch" >> "$GITHUB_OUTPUT"; echo "base=$base" >> "$GITHUB_OUTPUT"; echo "from=$from" >> "$GITHUB_OUTPUT"
  echo "skip=false" >> "$GITHUB_OUTPUT"
  say "$NUM" "on it. Working on \`$branch\` from \`$from\` ($RUN_URL)."
  # Progress in Banter too (Cillian, 2026-10-22), unless the task came from there.
  if [ "$NUM" != 30 ]; then
    say 30 "starting on #$NUM: $(head -n1 <<<"$task" | sed -E 's/@rolexg//Ig; s/^[[:space:],:.—–-]+//' | cut -c1-80)"
    gh workflow run banter-feed.yml -R "$REPO" || true
  fi
}

finish(){
  # The CLI's settings file and anything under .github never go in RolexG's commits
  # (the workflow token can't push workflow changes anyway).
  rm -rf .gemini gemini-artifacts gha-creds-*.json; git checkout -- .github 2>/dev/null || true; git clean -fdq -- .github
  if [ "$GEMINI_OK" != success ]; then
    say "$NUM" "I got stuck before finishing, so I've changed nothing. The run log has the details: $RUN_URL"
    PING_FROM=rolexg REPO="$REPO" GH_TOKEN="$GH_TOKEN" bash "$(dirname "$0")/ping.sh" claude "$NUM" "RolexG is blocked on #$NUM; please inspect the run log and unblock the task: $RUN_URL" || true
    exit 1; fi
  node tools/bundle.mjs
  summary=${SUMMARY:-}
  # With no final text, the action hands over the CLI's raw JSON instead; keep only its response.
  if jq -e . > /dev/null 2>&1 <<<"$summary"; then summary=$(jq -r '.response // ""' <<<"$summary"); fi
  [ -n "${summary// }" ] || summary="I didn't write a summary this time. Changed: $(git status --porcelain | awk '{print $2}' | grep -v '^game/index.html$' | tr '\n' ' ')"
  if [ -z "$(git status --porcelain)" ]; then say "$NUM" "$summary"; exit 0; fi

  checks="passed"; node tools/check.mjs > check.log 2>&1 || checks="FAILED (see the run log)"
  cat check.log; rm -f check.log
  git config user.name RolexG
  git config user.email 41898282+github-actions[bot]@users.noreply.github.com
  git add -A
  git commit -q -m "RolexG: ${TITLE:-task from #$NUM}" -m "Asked for on #$NUM. $RUN_URL"
  git push -q -f "https://x-access-token:$GH_TOKEN@github.com/$REPO.git" "HEAD:refs/heads/$BRANCH"

  pr=$(gh api "repos/$REPO/pulls?head=${REPO%%/*}:$BRANCH&state=open" --jq '.[0].number // empty')
  if [ -z "$pr" ]; then
    pr=$(gh api "repos/$REPO/pulls" -f title="RolexG: ${TITLE:-task from #$NUM}" -f head="$BRANCH" -f base="$BASE" -f body="RolexG (Gemini) did this, asked for on #$NUM.

$summary

Checks (tools/check.mjs): $checks.

RolexG doesn't merge its own PRs: Claude, Gemini's review or Cillian does.
Run: $RUN_URL" --jq .number) || {
      say "$NUM" "I pushed my work to \`$BRANCH\` but GitHub wouldn't let me open the PR. Cillian: tick \"Allow GitHub Actions to create and approve pull requests\" under Settings → Actions → General, then ask me again. $RUN_URL"
      exit 1; }
    gh api "repos/$REPO/issues/$pr/labels" -f "labels[]=rolexg" > /dev/null || true
    msg="opened #$pr into \`$BASE\`."
  else msg="pushed to #$pr."; fi
  # PRs and pushes made with the workflow token don't start other workflows, so start CI by hand.
  gh workflow run ci.yml -R "$REPO" --ref "$BRANCH" || true
  PING_FROM=rolexg REPO="$REPO" GH_TOKEN="$GH_TOKEN" bash "$(dirname "$0")/ping.sh" gemini "$pr" "Please review PR #$pr; merge it if the verdict is merge and CI is green." || true
  if [[ "$TITLE" =~ [Mm]oney ]]; then PING_FROM=rolexg REPO="$REPO" GH_TOKEN="$GH_TOKEN" bash "$(dirname "$0")/ping.sh" jimini "$pr" "Please check the money changes and report any concerns." || true; fi

  say "$NUM" "$msg

$summary

Checks: $checks."
  # A one-liner in Banter so the chat sees what RolexG is up to (unless the task came from there).
  if [ "$NUM" != 30 ]; then
    say 30 "$msg Asked for on #$NUM: ${TITLE:-}"
    gh workflow run banter-feed.yml -R "$REPO" || true
  fi
}

"$@"
