#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-hgrafa/fretboard-designer}"
ISSUE="${CLAUDE_ISSUE_NUMBER:-}"

if [[ -z "$ISSUE" ]]; then
  exit 0
fi

BRANCH="$(git branch --show-current || true)"
STATUS="$(git status --short || true)"
LAST_COMMIT="$(git log -1 --oneline || true)"

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
