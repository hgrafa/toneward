#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

tool_name="$(printf '%s' "$payload" | jq -r '.tool_name // .tool // empty' 2>/dev/null || true)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // .tool_input.cmd // empty' 2>/dev/null || true)"

if [[ -n "$file_path" ]]; then
	case "$file_path" in
		*pnpm-lock*)
			echo "BLOCK: Do not edit lock files directly. Use pnpm install." >&2
			exit 1
			;;
	esac
fi

if [[ "$tool_name" == "Bash" || -n "$command" ]]; then
	case "$command" in
		*"git merge"*)
			echo "BLOCK: git merge is not allowed. Use PRs instead." >&2
			exit 1
			;;
		*"git push"*main*|*"git push"*master*|*"git push"*production*|*"git push"*prod*)
			echo "BLOCK: Push to protected branches [main/master/production/prod] is not allowed. Push to a feature branch instead." >&2
			exit 1
			;;
		*"git push --force"*|*"git reset --hard"*|*"git clean -f"*)
			echo "BLOCK: destructive git command is not allowed without explicit user request." >&2
			exit 1
			;;
	esac
fi
