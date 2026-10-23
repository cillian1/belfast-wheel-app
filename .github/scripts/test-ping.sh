#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"
cat > "$tmp/bin/gh" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$GH_LOG"
if [ "$1" = api ]; then
  case "$2" in
    --paginate)
      case "$3" in
        *issues/comments?since=*) cat "$PING_FIXTURE";;
        *issues/*/comments?*) :;;
      esac;;
    repos/*/issues/183) :;;
    repos/*/issues/183/comments) :;;
  esac
fi
EOF
chmod +x "$tmp/bin/gh"
cat > "$tmp/bin/jq" <<'EOF'
#!/usr/bin/env bash
# The mocked GitHub API already returns the comment bodies selected by --jq.
# No issue comments are returned by the other mocked API calls in this test.
exit 0
EOF
chmod +x "$tmp/bin/jq"

make_fixture(){
  local primary=$1 mirrors=$2 quoted=$3
  : > "$tmp/comments.json"
  for ((i=0; i<primary; i++)); do printf 'Gemini ??? Claude: review %s\n' "$i" >> "$tmp/comments.json"; done
  for ((i=0; i<mirrors; i++)); do printf 'Gemini ??? Claude on #%s: mirrored handoff\n' "$i" >> "$tmp/comments.json"; done
  for ((i=0; i<quoted; i++)); do printf 'A quoted example: Gemini ??? Claude: %s\n' "$i" >> "$tmp/comments.json"; done
  export PING_FIXTURE="$tmp/comments.json"
}

# Mirroring a ping into Banter creates a second comment, and normal prose may
# quote the separator. Neither should consume the distinct-handoff budget.
make_fixture 15 15 5
PATH="$tmp/bin:$PATH" GH_LOG="$tmp/gh.log" GH_TOKEN=test REPO=owner/repo PING_FROM=claude \
  bash "$script_dir/ping.sh" renauw 183 "Please take the small docs task."

grep -Fq 'Claude ??? Renauw: Please take the small docs task.' "$tmp/gh.log"
grep -Fq 'repos/owner/repo/issues/183/labels -f labels[]=renauw-task' "$tmp/gh.log"
grep -Fq 'workflow run copilot-dispatch.yml -R owner/repo -f number=183 -f task=Please take the small docs task. -f agent=renauw' "$tmp/gh.log"

# Thirty actual handoffs still hit the guard, regardless of mirrors and quotes.
make_fixture 30 30 5
: > "$tmp/gh.log"
if PATH="$tmp/bin:$PATH" GH_LOG="$tmp/gh.log" GH_TOKEN=test REPO=owner/repo PING_FROM=claude \
  bash "$script_dir/ping.sh" renauw 183 "This must be capped." 2> "$tmp/cap.err"; then
  : # Hitting the cap exits cleanly so the workflow can report and stop.
else
  echo "The daily ping limit should stop cleanly." >&2
  exit 1
fi
grep -Fq 'Daily ping limit reached (30 distinct handoffs).' "$tmp/cap.err"
! grep -Fq 'workflow run copilot-dispatch.yml' "$tmp/gh.log"

echo "Ping target tests passed."
