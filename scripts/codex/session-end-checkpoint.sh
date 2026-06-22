#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-${CODEX_REPO:-hgrafa/toneward}}"
PR="${CODEX_PR_NUMBER:-}"
ISSUE="${CODEX_ISSUE_NUMBER:-}"

if [[ -z "$PR" && -z "$ISSUE" ]]; then
	exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
	exit 0
fi

BRANCH="$(git branch --show-current 2>/dev/null || true)"
STATUS="$(git status --short 2>/dev/null || true)"
LAST_COMMIT="$(git log -1 --oneline 2>/dev/null || true)"

if [[ -n "$PR" ]]; then
	gh pr comment "$PR" --repo "$REPO" --body "## Codex automatic session checkpoint

PR: #$PR
Branch: \`$BRANCH\`
Status: session-ended

### Last commit
\`\`\`
$LAST_COMMIT
\`\`\`

### Working tree
\`\`\`
$STATUS
\`\`\`

### Suggested resume command
\`\`\`bash
git switch $BRANCH
codex exec --sandbox workspace-write 'Use \$address-review to continue PR #$PR'
\`\`\`

— Codex
" >/dev/null 2>&1 || true
else
	gh issue comment "$ISSUE" --repo "$REPO" --body "## Codex automatic session checkpoint

Issue: #$ISSUE
Branch: \`$BRANCH\`
Status: session-ended

### Last commit
\`\`\`
$LAST_COMMIT
\`\`\`

### Working tree
\`\`\`
$STATUS
\`\`\`

### Suggested resume command
\`\`\`bash
git switch $BRANCH
codex exec --sandbox workspace-write 'Use \$work-issue to continue issue #$ISSUE'
\`\`\`

— Codex
" >/dev/null 2>&1 || true
fi
