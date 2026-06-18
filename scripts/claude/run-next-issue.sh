#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-hgrafa/fretboard-designer}"
READY_LABEL="${READY_LABEL:-claude:ready}"
IN_PROGRESS_LABEL="${IN_PROGRESS_LABEL:-claude:in-progress}"
REVIEW_LABEL="${REVIEW_LABEL:-claude:review}"

CLAUDE_MAX_TURNS="${CLAUDE_MAX_TURNS:-40}"
CLAUDE_PERMISSION_MODE="${CLAUDE_PERMISSION_MODE:-auto}"
CLAUDE_COMMAND_NAME="${CLAUDE_COMMAND_NAME:-/work-issue}"

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

require_cmd() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Missing required command: $1"
		exit 1
	fi
}

require_cmd gh
require_cmd git
require_cmd pnpm
require_cmd claude

# Important:
# If ANTHROPIC_API_KEY is present, Claude Code may use API billing instead of
# subscription/OAuth auth. This runner is intended for Claude Code subscription usage.
unset ANTHROPIC_API_KEY || true

echo "Repository: $REPO"
echo "Claude permission mode: $CLAUDE_PERMISSION_MODE"
echo "Claude max turns: $CLAUDE_MAX_TURNS"
echo

echo "Checking GitHub auth..."
gh auth status >/dev/null

echo "Checking Claude auth..."
claude auth status --text
echo

ISSUE_NUMBER="$(
	gh issue list \
		--repo "$REPO" \
		--state open \
		--label "$READY_LABEL" \
		--json number,updatedAt \
		--jq 'sort_by(.updatedAt) | .[0].number // empty'
)"

if [[ -z "$ISSUE_NUMBER" ]]; then
	echo "No open issue with label '$READY_LABEL'."
	exit 0
fi

ISSUE_JSON="$(
	gh issue view "$ISSUE_NUMBER" \
		--repo "$REPO" \
		--json number,title,labels,url,state
)"

TITLE="$(echo "$ISSUE_JSON" | jq -r '.title')"
ISSUE_URL="$(echo "$ISSUE_JSON" | jq -r '.url')"

echo "Selected issue #$ISSUE_NUMBER: $TITLE"
echo "$ISSUE_URL"
echo

# Infer branch prefix from labels/title.
LABELS="$(echo "$ISSUE_JSON" | jq -r '.labels[].name' || true)"

BRANCH_PREFIX="feat"

if echo "$LABELS" | grep -qx "type:bug"; then
	BRANCH_PREFIX="fix"
elif echo "$LABELS" | grep -qx "type:fix"; then
	BRANCH_PREFIX="fix"
elif echo "$LABELS" | grep -qx "type:refactor"; then
	BRANCH_PREFIX="refactor"
elif echo "$LABELS" | grep -qx "type:test"; then
	BRANCH_PREFIX="test"
elif echo "$LABELS" | grep -qx "type:docs"; then
	BRANCH_PREFIX="docs"
elif echo "$LABELS" | grep -qx "type:chore"; then
	BRANCH_PREFIX="chore"
elif echo "$TITLE" | grep -Eiq '^(fix|bug|bugfix):'; then
	BRANCH_PREFIX="fix"
elif echo "$TITLE" | grep -Eiq '^refactor:'; then
	BRANCH_PREFIX="refactor"
elif echo "$TITLE" | grep -Eiq '^test:'; then
	BRANCH_PREFIX="test"
elif echo "$TITLE" | grep -Eiq '^docs:'; then
	BRANCH_PREFIX="docs"
elif echo "$TITLE" | grep -Eiq '^chore:'; then
	BRANCH_PREFIX="chore"
fi

SLUG="$(
	echo "$TITLE" \
		| tr '[:upper:]' '[:lower:]' \
		| sed -E 's/^[a-z]+:[[:space:]]*//g' \
		| sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
		| cut -c1-56
)"

if [[ -z "$SLUG" ]]; then
	SLUG="work"
fi

BRANCH="${BRANCH_PREFIX}/issue-${ISSUE_NUMBER}-${SLUG}"

echo "Branch prefix: $BRANCH_PREFIX"
echo "Branch: $BRANCH"
echo

export CLAUDE_ISSUE_NUMBER="$ISSUE_NUMBER"
export CLAUDE_REPO="$REPO"
export CLAUDE_BRANCH="$BRANCH"
export CLAUDE_EXPECTED_PERMISSION_MODE="$CLAUDE_PERMISSION_MODE"

post_runner_checkpoint() {
	local exit_code="$?"

	# Avoid posting noisy checkpoints when no issue was selected.
	if [[ -z "${CLAUDE_ISSUE_NUMBER:-}" ]]; then
		exit "$exit_code"
	fi

	# Allow disabling exit checkpoint if needed.
	if [[ "${CLAUDE_SKIP_EXIT_CHECKPOINT:-false}" == "true" ]]; then
		exit "$exit_code"
	fi

	local current_branch
	current_branch="$(git branch --show-current 2>/dev/null || true)"

	local status
	status="$(git status --short 2>/dev/null || true)"

	local last_commit
	last_commit="$(git log -1 --oneline 2>/dev/null || true)"

	local checkpoint_status="session-ended"
	if [[ "$exit_code" -ne 0 ]]; then
		checkpoint_status="runner-failed"
	fi

	gh issue comment "$CLAUDE_ISSUE_NUMBER" \
		--repo "$REPO" \
		--body "## Claude runner checkpoint

Issue: #$CLAUDE_ISSUE_NUMBER
Branch: \`$current_branch\`
Status: $checkpoint_status
Runner exit code: \`$exit_code\`

### Mode
- Autonomous mode: yes
- Permission mode expected: \`$CLAUDE_PERMISSION_MODE\`
- Max turns: \`$CLAUDE_MAX_TURNS\`

### Last commit

\`\`\`
$last_commit
\`\`\`

### Working tree

\`\`\`
$status
\`\`\`

### Resume command

\`\`\`bash
git switch $current_branch
claude -p --permission-mode $CLAUDE_PERMISSION_MODE --max-turns $CLAUDE_MAX_TURNS \"$CLAUDE_COMMAND_NAME $CLAUDE_ISSUE_NUMBER\"
\`\`\`
" >/dev/null || true

	exit "$exit_code"
}

trap post_runner_checkpoint EXIT

echo "Updating issue labels..."
gh issue edit "$ISSUE_NUMBER" \
	--repo "$REPO" \
	--remove-label "$READY_LABEL" \
	--add-label "$IN_PROGRESS_LABEL" || true

echo "Posting start checkpoint..."
gh issue comment "$ISSUE_NUMBER" \
	--repo "$REPO" \
	--body "## Claude checkpoint

Issue: #$ISSUE_NUMBER
Branch: \`$BRANCH\`
Status: in-progress

### Mode
- Autonomous mode: yes
- Permission mode expected: \`$CLAUDE_PERMISSION_MODE\`
- Max turns: \`$CLAUDE_MAX_TURNS\`
- Superpowers expected:
  - brainstorming when product/design planning is needed
  - writing-plans for medium/large work
  - executing-plans during implementation
  - subagent-driven-development when useful

### Current understanding
- Runner selected this issue from label \`$READY_LABEL\`.
- Claude should read \`CLAUDE.md\`, issue comments, relevant folder docs, then work end-to-end.

### Done
- Issue selected.
- Branch planned.
- Labels updated.

### Files touched
- None yet.

### Decisions made
- Branch name: \`$BRANCH\`
- Work mode: autonomous Claude Code execution.

### Validation
- [ ] \`pnpm lint\`
- [ ] \`pnpm build\`
- [ ] \`pnpm test\`

### Remaining work
- Inspect issue and repo.
- Use relevant Superpowers.
- Implement.
- Validate.
- Open PR.

### Next step
Start Claude Code with the work-issue skill."
echo

echo "Preparing git branch..."
git fetch origin main

CURRENT_BRANCH="$(git branch --show-current || true)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
	git switch main
fi

git pull --ff-only origin main

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
	git switch "$BRANCH"
elif git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
	git switch -c "$BRANCH" --track "origin/$BRANCH"
else
	git switch -c "$BRANCH"
fi

echo
echo "Starting Claude Code..."
echo

claude -p \
	--permission-mode "$CLAUDE_PERMISSION_MODE" \
	--max-turns "$CLAUDE_MAX_TURNS" \
	"$CLAUDE_COMMAND_NAME $ISSUE_NUMBER"

