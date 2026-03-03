#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found. Install with: brew install jq"
  exit 1
fi

FILE="${1:-}"
if [[ -z "$FILE" ]]; then
  echo "Usage: validate-json.sh <file.json>"
  exit 1
fi

jq -e . "$FILE" >/dev/null
echo "OK: valid JSON -> $FILE"
