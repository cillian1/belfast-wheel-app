#!/usr/bin/env bash
# Jimini, the read-only Gemini analyst (.github/workflows/jimini.yml). Two steps around the Gemini CLI run:
#   jimini.sh start   read the task, check the limits, say "on it"
#   jimini.sh finish  keep only jimini-out/, publish the report and wiki pages, report back
# Jimini never changes the game: everything outside jimini-out/ is thrown away, and nothing is pushed to
# main. Reports go to issues, wiki pages to the GitHub wiki (or the jimini-docs branch as a fallback).
# App comments post as jimini[bot]; legacy shared-token comments retain the prefix.
set -euo pipefail
BOT=github-actions[bot]
MAX_DAY=${MAX_DAY:-4} # tasks per UTC day (repo variable JIMINI_DAILY_CAP)
DOCS=jimini-docs      # fallback branch for reports and wiki pages

say(){ gh api "repos/$REPO/issues/$1/comments" -f body="Jimini: $2" > /dev/null; }
out(){ local d="EOF_$RANDOM$RANDOM"; { echo "$1<<$d"; echo "$2"; echo "$d"; } >> "$GITHUB_OUTPUT"; }

start(){
  if [ "${EVENT:-}" = issue_comment ] && { [ "${COMMENT_LOGIN:-}" = 'jimini[bot]' ] || { [ "${COMMENT_LOGIN:-}" = 'github-actions[bot]' ] && [[ ${COMMENT_BODY:-} == 'Jimini:'* ]]; }; }; then
    echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0
  fi
  rounds=$(gh api --paginate "repos/$REPO/issues/$NUM/comments?per_page=100" --jq '[.[] | select((.user.login == "jimini[bot]" or .user.login == "github-actions[bot]") and (.body | startswith("Jimini: on it")))] | length' | awk '{s+=$1} END {print s+0}')
  if [ "$rounds" -ge "${MAX_ROUNDS:-5}" ]; then
    echo "Thread ping limit reached"; echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0
  fi
  today=$(date -u +%F)
  day=$(gh api --paginate "repos/$REPO/issues/comments?since=${today}T00:00:00Z&per_page=100" --jq \
    "[.[] | select((.user.login == \"$BOT\" or .user.login == \"jimini[bot]\") and (.created_at | startswith(\"$today\")) and (.body | startswith(\"Jimini: on it\")))] | length" \
    | awk '{s+=$1} END {print s+0}')
  echo "Jimini tasks today: $day/$MAX_DAY"
  if [ "$day" -ge "$MAX_DAY" ]; then
    say "$NUM" "That's my $MAX_DAY reports for today. Ask again after midnight UTC, or raise the JIMINI_DAILY_CAP repo variable."
    echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; fi

  issue=$(gh api "repos/$REPO/issues/$NUM")
  title=$(jq -r .title <<<"$issue")
  case $EVENT in
    issue_comment) task=$COMMENT_BODY;;
    issues) task="$title
$(jq -r '.body // ""' <<<"$issue")";;
    *) task=$INPUT_TASK;;
  esac
  if jq -e .pull_request <<<"$issue" > /dev/null; then where="pull request #$NUM \"$title\""
    files=$(gh api --paginate "repos/$REPO/pulls/$NUM/files?per_page=100" --jq '.[].filename' | head -n 80)
    where="$where, which changes:
$files"
  else where="issue #$NUM \"$title\""; fi
  thread=$(gh api --paginate "repos/$REPO/issues/$NUM/comments?per_page=100" --jq '.[] | "[" + .user.login + "] " + .body' \
    | tail -c 8000)
  body=$(jq -r '.body // ""' <<<"$issue" | head -c 4000)

  prompt="You are Jimini, the read-only analyst on this repository (the Belfast Wheel). GEMINI.md describes the code and the team; you are not RolexG and you never change code. Your job is to read, analyse and write reports and documentation.

You were asked for this on $where:
---
$task
---

Context. The $( [ "$NUM" = 30 ] && echo "Banter chat" || echo "issue or PR" ) description:
$body

Comments so far (oldest first, may be cut):
$thread

How to work:
- Read whatever you need: README.md, HANDOFF.md, GEMINI.md, src/, tools/, host.html, chat.html, .github/. Skip game/index.html (a generated bundle of src/).
- You have no shell. Don't try to edit the code: any file you write outside jimini-out/ is thrown away.
- A report goes in jimini-out/report.md, in Markdown. Start with a one-paragraph summary, then findings, most important first. For each finding: what's wrong, where (file:line), why it matters for players on phones, and a concrete suggested fix. Say how sure you are, and don't invent problems to pad it out.
- Wiki pages go in jimini-out/wiki/, one Markdown file per page, named like Home.md, How-to-Play.md, Prizes-and-Odds.md (dashes, no spaces). Home.md is the front page and links the others as [[Page Name]]. Write for the friends who play, in plain words; put developer notes on their own pages. Only state rules and numbers you found in the code (src/config.json has the stakes and odds).
- Questions that need no document: just answer.

When you're done, end with a short summary for the humans: what you looked at and the headline findings, in plain words, 3 to 6 lines, no headings."
  out prompt "$prompt"
  out title "$(head -n1 <<<"$task" | sed -E 's/@jimini//Ig; s/^[[:space:],:.—–-]+//' | cut -c1-70)"
  echo "skip=false" >> "$GITHUB_OUTPUT"
  say "$NUM" "on it, reading the code now ($RUN_URL)."
  if [ "$NUM" != 30 ]; then
    say 30 "reading up for #$NUM: $(head -n1 <<<"$task" | sed -E 's/@jimini//Ig; s/^[[:space:],:.—–-]+//' | cut -c1-80)"
    gh workflow run banter-feed.yml -R "$REPO" || true
  fi
}

# Adds files from $1 under path $2 on the jimini-docs branch (created on first use) and pushes it.
to_docs_branch(){
  local src=$1 dest=$2 dir; dir=$(mktemp -d)
  if ! git clone -q --depth 1 --branch "$DOCS" "https://x-access-token:$GH_TOKEN@github.com/$REPO.git" "$dir" 2>/dev/null; then
    git -C "$dir" init -q && git -C "$dir" checkout -q --orphan "$DOCS"
    printf '# Jimini docs\n\nReports and wiki pages written by Jimini (.github/workflows/jimini.yml). Nothing here is part of the game.\n' > "$dir/README.md"
  fi
  mkdir -p "$dir/$dest" && cp -r "$src"/. "$dir/$dest/"
  git -C "$dir" -c user.name=Jimini -c user.email=41898282+github-actions[bot]@users.noreply.github.com add -A
  git -C "$dir" -c user.name=Jimini -c user.email=41898282+github-actions[bot]@users.noreply.github.com \
    commit -qm "Jimini: ${TITLE:-task from #$NUM}" -m "$RUN_URL" || return 0
  git -C "$dir" push -q "https://x-access-token:$GH_TOKEN@github.com/$REPO.git" "HEAD:refs/heads/$DOCS"
}

finish(){
  keep=$(mktemp -d)
  [ -d jimini-out ] && cp -r jimini-out/. "$keep/"
  git checkout -q -- . && git clean -fdq # whatever else he touched goes
  if [ "$GEMINI_OK" != success ]; then
    say "$NUM" "I got stuck before finishing, so there's no report this time. The run log has the details: $RUN_URL"; exit 1; fi
  summary=${SUMMARY:-}
  if jq -e . > /dev/null 2>&1 <<<"$summary"; then summary=$(jq -r '.response // ""' <<<"$summary"); fi
  [ -n "${summary// }" ] || summary="Done."
  links=""; stamp=$(date -u +%F)-$NUM

  if [ -s "$keep/report.md" ]; then
    mkdir -p "$keep/r" && cp "$keep/report.md" "$keep/r/$stamp.md"
    full="https://github.com/$REPO/blob/$DOCS/docs/reports/$stamp.md"
    to_docs_branch "$keep/r" docs/reports || full=""
    text=$(head -c 60000 "$keep/report.md")
    [ "$(wc -c < "$keep/report.md")" -gt 60000 ] && text="$text

(Cut here, the full report is too long for an issue${full:+: $full})"
    if gh api "repos/$REPO/issues/$NUM" --jq '.pull_request' | grep -q url; then
      say "$NUM" "$text"; links="Report: above."
    else
      gh api "repos/$REPO/labels" -f name=jimini-report -f color=f27aa8 > /dev/null 2>&1 || true
      rep=$(gh api "repos/$REPO/issues" -f title="Jimini report: ${TITLE:-#$NUM}" -f body="$text

---
Asked for on #$NUM. Jimini only reads and reports: turning a finding into a fix is a separate task for Copilot, RolexG or Claude.${full:+ Full copy: $full}
Run: $RUN_URL" -f "labels[]=jimini-report" --jq .number)
      links="Report: #$rep."
    fi
  fi

  if [ -d "$keep/wiki" ] && [ -n "$(ls -A "$keep/wiki")" ]; then
    wiki=$(mktemp -d)
    if git clone -q --depth 1 "https://x-access-token:$GH_TOKEN@github.com/$REPO.wiki.git" "$wiki" 2>/dev/null; then
      cp -r "$keep/wiki"/. "$wiki/"
      git -C "$wiki" -c user.name=Jimini -c user.email=41898282+github-actions[bot]@users.noreply.github.com add -A
      git -C "$wiki" -c user.name=Jimini -c user.email=41898282+github-actions[bot]@users.noreply.github.com \
        commit -qm "Jimini: ${TITLE:-task from #$NUM}" -m "$RUN_URL" || true
      if git -C "$wiki" push -q origin HEAD 2>/dev/null; then links="$links Wiki: https://github.com/$REPO/wiki"
      else wiki=""; fi
    else wiki=""; fi
    if [ -z "$wiki" ]; then
      to_docs_branch "$keep/wiki" docs/wiki
      links="$links Wiki pages: https://github.com/$REPO/tree/$DOCS/docs/wiki (the GitHub wiki isn't open to me yet. Cillian: tick Wikis under Settings → General → Features, create any first page, then ask me again and I'll move them there)."
    fi
  fi

  say "$NUM" "$summary${links:+

$links}"
  if [ "$NUM" != 30 ]; then
    say 30 "done with #$NUM. ${links:-$(head -c 200 <<<"$summary")}"
    gh workflow run banter-feed.yml -R "$REPO" || true
  fi
}

"$@"
