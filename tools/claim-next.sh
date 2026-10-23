#!/usr/bin/env bash
# Phase one is intentionally read-only; live claims need the serialized DONE hook.
set -euo pipefail
exec node "$(dirname "$0")/claim-next.mjs" "$@"
