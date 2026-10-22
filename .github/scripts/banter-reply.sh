#!/usr/bin/env bash

banter_overlap() {
  REPLY="$1" COMMENTS_FILE="$2" node -e '
const fs = require("node:fs");
const words = text => new Set(text.toLowerCase().match(/[a-z0-9#]{3,}/g) || []);
const reply = words(process.env.REPLY);
let best = 0;
for (const comment of JSON.parse(fs.readFileSync(process.env.COMMENTS_FILE, "utf8")).slice(-6)) {
  const other = words(comment.body);
  if (reply.size && other.size) {
    let shared = 0;
    for (const word of reply) if (other.has(word)) shared++;
    best = Math.max(best, shared / Math.min(reply.size, other.size));
  }
}
console.log(best.toFixed(2));'
}

banter_is_too_similar() {
  local similarity
  similarity=$(banter_overlap "$1" "$2") || return 2
  echo "Overlap with recent messages: $similarity"
  node -e 'process.exit(Number(process.argv[1]) >= 0.55 ? 0 : 1)' "$similarity"
}

banter_generate_distinct() {
  local comments_file="$1"
  local attempt
  local max_attempts=2
  local rejected=""
  local retry_hint=""

  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    reply=""
    speak
    grep -qiE '^\s*(Error:|Execution error|API Error|Reached max turns|Credit balance|Invalid API key)' <<<"$reply" && {
      echo "$next returned an error, not a reply: $(head -c 200 <<<"$reply")"
      reply=""
    }
    reply=$(sed -E '1s/^\s*(Claude|Copilot|Gemini|RolexG|Jimini)\s*:\s*//' <<<"$reply" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    [ -n "$reply" ] && [ "$reply" != PASS ] || return 1

    if banter_is_too_similar "$reply" "$comments_file"; then
      :
    else
      local similarity_status=$?
      if [ "$similarity_status" -eq 1 ]; then return 0; fi
      echo "Could not check reply similarity for $next." >&2
      reply=""
      return 1
    fi
    echo "Too close to something just said, rejecting candidate $attempt/$max_attempts."
    rejected="$reply"
    if [ "$attempt" -lt "$max_attempts" ]; then
      retry_hint="Your previous draft repeated a recent message and was rejected. Try a genuinely different point or angle, and do not reuse this draft's point or wording: $rejected"
    fi
  done

  reply=""
  return 1
}
