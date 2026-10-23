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
if [ "$1" = --help ]; then
  if [ "${COPILOT_AGENT_FLAG_SUPPORT:-}" = yes ]; then
    echo 'Usage: copilot [--agent name]'
  else
    echo 'Usage: copilot [options]'
  fi
else
  printf '%s\n' "$*" >> "$COPILOT_LOG"
  echo 'A fresh observation about the lighthouse keeper.'
fi
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
    COPILOT_AGENT_FLAG_SUPPORT=yes bash .github/scripts/banter-turn.sh
)
grep -Fq -- '--agent renauw' "$tmp/copilot.log"
grep -Fq 'Renauw: A fresh observation about the lighthouse keeper.' "$tmp/gh.log"

rm -f "$tmp/copilot.log"
(
  cd "$tmp/work"
  PATH="$tmp/bin:$PATH" REPO=owner/repo GH_TOKEN=test GH_FIXTURE="$tmp/one.json" \
    GH_LOG="$tmp/unsupported-gh.log" COPILOT_LOG="$tmp/copilot.log" COPILOT_GITHUB_TOKEN=test bash .github/scripts/banter-turn.sh
)
grep -Fq -- '-p ' "$tmp/copilot.log"
if grep -Fq -- '--agent' "$tmp/copilot.log"; then
  echo "Renauw used an unsupported Copilot CLI agent flag." >&2
  exit 1
fi

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
    GH_LOG="$tmp/capped-gh.log" COPILOT_LOG="$tmp/copilot.log" COPILOT_GITHUB_TOKEN=test bash .github/scripts/banter-turn.sh
)
[ ! -s "$tmp/copilot.log" ] || { echo "Copilot/Renauw ran after their shared daily cap." >&2; exit 1; }

echo "Banter seat selection and shared cap tests passed."
