#!/usr/bin/env bash
# Offline fixtures only: gh and jq are shell functions; no CLI or network is used.
set -euo pipefail
cd "$(dirname "$0")/../.."
run_case(){
  local author=$1 merger=$2 role=$3 expected=$4 ci_status=${5:-success}
  local result
  result=$(
    export FIX_AUTHOR="$author" FIX_MERGER="$merger" FIX_CI="$ci_status" REPO=example/repo
    gh(){
      case "$*" in
        'api graphql '*) echo "$FIX_MERGER";;
        'api repos/example/repo/pulls/1') printf '{"state":"open","draft":false,"user":{"login":"%s"},"head":{"repo":{"full_name":"example/repo"},"ref":"rolexg/fixture","sha":"abc"},"base":{"ref":"update-31"}}' "$FIX_AUTHOR";;
        'api repos/example/repo --jq .default_branch') echo main;;
        *check-runs*) printf '{"status":"completed","conclusion":"%s"}' "$FIX_CI";;
        *'--jq .commit.committer.date') echo 2026-10-23T00:00:00Z;;
        *'comments?per_page=100'*) [[ "$*" == *'gemini-reviewer[bot]'* ]] || exit 2; echo 'Verdict: merge';;
        'api -X PUT '*) echo FIXTURE_MERGED >&2;;
        *'comments -f body='*|'workflow run '*) :;;
        *) echo "Unexpected fixture request: $*" >&2; exit 2;;
      esac
    }
    jq(){ node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{let v=JSON.parse(s);for(const k of process.argv[1].slice(1).split("."))v=v[k];console.log(v)})' "$2"; }
    export -f gh jq
    bash .github/scripts/bot-merge.sh 1 "$role" 2>&1
  )
  if [ "$expected" = merge ]; then
    [[ "$result" == *FIXTURE_MERGED* ]] || { echo "$result"; return 1; }
  else
    [[ "$result" != *FIXTURE_MERGED* ]] || { echo "$result"; return 1; }
    [[ "$result" == *'Not merging'* ]] || { echo "$result"; return 1; }
  fi
}
run_case 'rolexg[bot]' 'gemini-reviewer[bot]' Gemini merge
run_case 'jimini[bot]' 'rolexg[bot]' RolexG merge
run_case 'rolexg[bot]' 'rolexg[bot]' RolexG refuse
run_case 'gemini-reviewer[bot]' 'gemini-reviewer[bot]' Gemini refuse
run_case 'github-actions[bot]' 'github-actions[bot]' Gemini refuse
run_case 'cillian1' 'gemini-reviewer[bot]' Gemini refuse failure
output=$(mktemp)
trap 'rm -f "$output"' EXIT
for name in rolexg jimini; do
  for login in "$name[bot]" 'github-actions[bot]'; do
    label=RolexG; [ "$name" = jimini ] && label=Jimini
    GITHUB_OUTPUT="$output" EVENT=issue_comment COMMENT_LOGIN="$login" \
      COMMENT_BODY="$label: @$name task" bash ".github/scripts/$name.sh" start
    grep -q 'skip=true' "$output"
    : > "$output"
  done
done
printf '%s\n' 'Bot merge login and CI fixture checks passed.'
