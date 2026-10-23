#!/usr/bin/env bash
# Run by the watcher/operator with repository permissions, never by sandboxed workers.
set -euo pipefail
repo=${REPO:-${GITHUB_REPOSITORY:?REPO or GITHUB_REPOSITORY required}}
while IFS='|' read -r name color description; do
  gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force
done <<'LABELS'
size:small|c2e0c6|One file or one small change; about 20 minutes or less
size:big|d93f0b|Longer or tricky development: several files, physics, animation or state
lane:workflow|5319e7|Workflows, actions or bot setup touching .github/
lane:report|0075ca|Read-only analysis or review
unassigned|fbca04|Ready to claim; nobody working on it yet
LABELS
