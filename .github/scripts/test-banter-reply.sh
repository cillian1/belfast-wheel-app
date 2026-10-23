#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/banter-reply.sh"
comments_file=$(mktemp)
trap 'rm -f "$comments_file"' EXIT

printf '%s\n' '[{"body":"Gemini: I am concerned about making the Watch replay feel clear and consistent for everyone."}]' > "$comments_file"

calls=0
drafts=(
  "I am concerned about making the Watch replay feel clear and consistent for everyone."
  "Could we add a small replay marker so viewers can tell when the run has ended?"
)
speak() {
  if [ "$calls" -eq 1 ]; then
    [[ "$retry_hint" == *"was rejected"* ]] || {
      echo "Expected a rephrase hint on the retry." >&2
      exit 1
    }
  fi
  reply=${drafts[$calls]}
  calls=$((calls + 1))
}

next=Gemini
banter_generate_distinct "$comments_file"
[ "$calls" -eq 2 ] || { echo "Expected one retry after a duplicate, got $calls attempts." >&2; exit 1; }
[ "$reply" = "Could we add a small replay marker so viewers can tell when the run has ended?" ] || {
  echo "Expected the distinct retry to be selected." >&2
  exit 1
}

calls=0
drafts=("A distinct observation that does not repeat the previous chat.")
banter_generate_distinct "$comments_file"
[ "$calls" -eq 1 ] || { echo "Expected the first distinct reply to be accepted, got $calls attempts." >&2; exit 1; }
[ "$reply" = "A distinct observation that does not repeat the previous chat." ] || {
  echo "Expected the original distinct reply to be selected." >&2
  exit 1
}

calls=0
drafts=("Renauw: A fresh observation from the helper seat.")
next=Renauw
banter_generate_distinct "$comments_file"
[ "$calls" -eq 1 ] || { echo "Expected the Renauw reply to be accepted, got $calls attempts." >&2; exit 1; }
[ "$reply" = "A fresh observation from the helper seat." ] || {
  echo "Expected the Renauw prefix to be removed." >&2
  exit 1
}

echo "Banter reply retry tests passed."
