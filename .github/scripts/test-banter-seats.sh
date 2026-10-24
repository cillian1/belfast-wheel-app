#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/work/.github/scripts"
cp "$script_dir/banter-turn.sh" "$script_dir/banter-reply.sh" "$tmp/work/.github/scripts/"
cat > "$tmp/work/.github/scripts/banter-feed.sh" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$tmp/bin/gh" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = api ] && [ "$2" = --paginate ]; then
  jq -c '.[]' "$GH_FIXTURE"
else
  printf '%s\n' "$*" >> "$GH_LOG"
fi
EOF
cat > "$tmp/bin/copilot" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$COPILOT_LOG"
if [[ "$*" == *"You are Renauw,"* ]] && [ "${COPILOT_RENAUW_SUPPORT:-}" != yes ]; then
  echo "Renauw seat unavailable" >&2
  exit 2
fi
echo 'A fresh observation about the lighthouse keeper.'
EOF
cat > "$tmp/bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$tmp/work/.github/scripts/banter-feed.sh" "$tmp/bin/gh" "$tmp/bin/copilot" "$tmp/bin/sleep"

today=$(date -u +%F)
printf '[{"body":"Renauw","created_at":"%sT12:00:00Z","user":{"login":"cillian1"}}]\n' "$today" > "$tmp/one.json"
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/one.json" \
    GH_LOG="$tmp/gh.log" COPILOT_LOG="$tmp/copilot.log" COPILOT_GITHUB_TOKEN=test \
    COPILOT_RENAUW_SUPPORT=yes BANTER_REQUESTED_SPEAKER=Renauw bash .github/scripts/banter-turn.sh
)
grep -Fq 'You are Renauw, a general helper' "$tmp/copilot.log"
grep -Fq 'Renauw: A fresh observation about the lighthouse keeper.' "$tmp/gh.log"

rm -f "$tmp/copilot.log"
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/one.json" \
    GH_LOG="$tmp/unsupported-gh.log" COPILOT_LOG="$tmp/copilot.log" COPILOT_GITHUB_TOKEN=test \
    COPILOT_RENAUW_SUPPORT=no bash .github/scripts/banter-turn.sh
)
grep -Fq 'You are Renauw, a general helper' "$tmp/copilot.log"
grep -Fq 'You are GitHub Copilot' "$tmp/copilot.log"
grep -Fq 'Copilot: A fresh observation about the lighthouse keeper.' "$tmp/unsupported-gh.log"

{
  printf '['
  sep=
  for n in $(seq 1 25); do
    if (( n % 2 )); then speaker=Copilot; else speaker=Renauw; fi
    printf '%s{"body":"%s: capped reply %s","created_at":"%sT12:00:00Z","user":{"login":"github-actions[bot]"}}' "$sep" "$speaker" "$n" "$today"
    sep=,
  done
  printf '%s{"body":"Renauw","created_at":"%sT12:30:00Z","user":{"login":"cillian1"}}]\n' "$sep" "$today"
} > "$tmp/capped.json"
rm -f "$tmp/copilot.log"
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/capped.json" \
    GH_LOG="$tmp/capped-gh.log" COPILOT_LOG="$tmp/copilot.log" COPILOT_GITHUB_TOKEN=test \
    BANTER_COPILOT_DAY_CAP=25 bash .github/scripts/banter-turn.sh
)
[ ! -s "$tmp/copilot.log" ] || { echo "Copilot/Renauw ran after their shared daily cap." >&2; exit 1; }

echo "Banter seat selection and shared cap tests passed."

# Unavailable Claude must never consume a model call, even when explicitly requested.
cat > "$tmp/bin/claude" <<'CLAUDE_STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$CLAUDE_LOG"
echo 'A fresh note about choosing a library photo.'
CLAUDE_STUB
chmod +x "$tmp/bin/claude"
printf '[{"body":"Claude","created_at":"%sT12:00:00Z","user":{"login":"cillian1"}}]\n' "$today" > "$tmp/claude.json"
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/claude.json" \
    GH_LOG="$tmp/paused-gh.log" CLAUDE_LOG="$tmp/claude.log" CLAUDE_CODE_OAUTH_TOKEN=test \
    BANTER_REQUESTED_SPEAKER=Claude bash .github/scripts/banter-turn.sh
)
[ ! -s "$tmp/claude.log" ] || { echo "Paused Claude was invoked." >&2; exit 1; }
[ ! -s "$tmp/paused-gh.log" ] || { echo "Paused Claude posted or dispatched a turn." >&2; exit 1; }
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/claude.json" \
    GH_LOG="$tmp/enabled-gh.log" CLAUDE_LOG="$tmp/claude.log" CLAUDE_CODE_OAUTH_TOKEN=test \
    BANTER_CLAUDE_ENABLED=on BANTER_REQUESTED_SPEAKER=Claude bash .github/scripts/banter-turn.sh
)
[ -s "$tmp/claude.log" ] || { echo "Explicitly enabled Claude was not invoked." >&2; exit 1; }
grep -Fq 'Claude: A fresh note about choosing a library photo.' "$tmp/enabled-gh.log"
echo "Claude pause and explicit resume tests passed."
