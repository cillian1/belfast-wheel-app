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
        *issues/comments?*) echo 0;;
      esac;;
    repos/*/issues/183) :;;
    repos/*/issues/183/comments) :;;
  esac
fi
EOF
chmod +x "$tmp/bin/gh"

PATH="$tmp/bin:$PATH" GH_LOG="$tmp/gh.log" GH_TOKEN=test REPO=owner/repo PING_FROM=claude \
  bash "$script_dir/ping.sh" renauw 183 "Please take the small docs task."

grep -Fq 'Claude ??? Renauw: Please take the small docs task.' "$tmp/gh.log"
grep -Fq 'repos/owner/repo/issues/183/labels -f labels[]=renauw-task' "$tmp/gh.log"
grep -Fq 'workflow run copilot-dispatch.yml -R owner/repo -f number=183 -f task=Please take the small docs task. -f agent=renauw' "$tmp/gh.log"

echo "Ping target tests passed."
