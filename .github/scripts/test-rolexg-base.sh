#!/usr/bin/env bash
# Offline regression cases: no GitHub requests, model calls, or real git mutations.
set -euo pipefail
cd "$(dirname "$0")/../.."
source .github/scripts/rolexg.sh

expect_base(){
  local result
  result=$(task_base "$1" "$2" "$3")
  [ "$result" = "$4" ] || { echo "Expected $4, got $result" >&2; exit 1; }
}
expect_base 'Please implement the pass.' 'base: update-32' main update-32
expect_base 'base: update-32' 'No base in this issue.' main update-32
expect_base 'Please implement the pass.' 'base: `update-32`' main update-32
expect_base 'No explicit field.' 'No explicit field.' main main
expect_base 'base: main' 'base: main' update-32 main
if task_base 'base: main' 'base: update-32' main >/dev/null 2>&1; then
  echo 'Conflicting explicit bases were accepted.' >&2; exit 1
fi
publication_base update-32 'base: update-32'
if publication_base main 'base: update-32' >/dev/null 2>&1; then
  echo 'A mid-run base change was accepted.' >&2; exit 1
fi

check_finish(){
  local issue_body=$1 pr_base=$2 expected=$3 result
  result=$(
    exec 2>&1
    export FIX_BODY="$issue_body" FIX_PR_BASE="$pr_base"
    export REPO=example/repo NUM=167 BASE=main BRANCH=rolexg/issue-167 GITHUB_RUN_ID=fixture
    export GH_TOKEN=fixture-token GEMINI_OK=success SUMMARY='Fixture implementation.' TITLE='Fixture task' RUN_URL=fixture
    say(){ printf 'FIXTURE_NOTE %s\n' "$*" >&2; }
    gh(){
      case "$*" in
        'api repos/example/repo/issues/167') command node -e 'console.log(JSON.stringify({state:"open",body:process.env.FIX_BODY}))';;
        *'pulls?head='*'--jq'*) [ -z "$FIX_PR_BASE" ] || echo 9;;
        *'pulls?head='*) command node -e 'console.log(JSON.stringify(process.env.FIX_PR_BASE ? [{number:9,base:{ref:process.env.FIX_PR_BASE}}] : []))';;
        'api repos/example/repo/issues/'*'/comments -f body='*) :;;
        'pr ready 9 -R example/repo --undo') echo FIXTURE_DRAFT >&2;;
        'api repos/example/repo/pulls '*) echo FIXTURE_READY_PR >&2; echo 9;;
        *'issues/9/labels '*) :;;
        'workflow run '*) :;;
        *) echo "Unexpected fixture request: $*" >&2; return 1;;
      esac
    }
    jq(){
      command node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{try{let v=JSON.parse(s);const q=process.argv[2].split(" // ")[0];for(const k of q.replace(/\[(\d+)\]/g,".$1").split(".").filter(Boolean))v=v?.[k];if(process.argv[1]==="-e"&&!v)process.exit(1);if(v!==undefined&&v!==null)console.log(typeof v==="object"?JSON.stringify(v):v)}catch{process.exit(1)}})' -- "$1" "$2"
    }
    git(){
      case "$*" in
        'status --porcelain -- .github') :;;
        'status --porcelain') echo ' M src/wallet/money.js';;
        'push '*) printf 'FIXTURE_PUSH %s\n' "$*" >&2;;
        *) :;;
      esac
    }
    node(){ :; }
    rm(){ if [ "$*" = '-f check.log' ]; then command rm -f check.log; fi; }
    bash(){ :; }
    finish
  )
  if [ "$expected" = recovery ]; then
    [[ "$result" == *'HEAD:refs/heads/rolexg/issue-167-recovery-fixture'* ]] || { echo "$result"; exit 1; }
    [[ "$result" != *FIXTURE_READY_PR* ]] || { echo "$result"; exit 1; }
  else
    [[ "$result" == *FIXTURE_READY_PR* ]] || { echo "$result"; exit 1; }
    [[ "$result" != *'recovery-fixture'* ]] || { echo "$result"; exit 1; }
  fi
}
check_finish 'base: update-32' '' recovery
check_finish 'base: main' update-32 recovery
check_finish 'base: main' '' ready
printf '%s\n' 'RolexG canonical base and publication recovery fixtures passed.'
