#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

if [[ -z "$file_path" || ! -f "$file_path" ]]; then
	exit 0
fi

case "$file_path" in
	*.ts|*.tsx|*.js|*.jsx|*.json|*.css)
		npx @biomejs/biome check --fix --unsafe "$file_path" >/dev/null 2>&1 || true
		;;
esac
