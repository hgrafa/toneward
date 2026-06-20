#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-hgrafa/fretboard-designer}"
PR="${CLAUDE_PR_NUMBER:-}"
ISSUE="${CLAUDE_ISSUE_NUMBER:-}"

if [[ -z "$PR" && -z "$ISSUE" ]]; then
  exit 0
fi

BRANCH="$(git branch --show-current || true)"
STATUS="$(git status --short || true)"
LAST_COMMIT="$(git log -1 --oneline || true)"

if [[ -n "$PR" ]]; then
  gh pr comment "$PR" --repo "$REPO" --body "## Claude automatic session checkpoint

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
claude \"/address-review $PR\"
\`\`\`
"
else
  gh issue comment "$ISSUE" --repo "$REPO" --body "## Claude automatic session checkpoint

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
claude \"/work-issue $ISSUE\"
\`\`\`
"
fi
