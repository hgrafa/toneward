#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-hgrafa/fretboard-designer}"
READY_LABEL="${READY_LABEL:-automation:ready}"
IN_PROGRESS_LABEL="${IN_PROGRESS_LABEL:-automation:in-progress}"
REVIEW_LABEL="${REVIEW_LABEL:-automation:review}"

CLAUDE_MAX_TURNS="${CLAUDE_MAX_TURNS:-40}"
CLAUDE_PERMISSION_MODE="${CLAUDE_PERMISSION_MODE:-auto}"
CLAUDE_COMMAND_NAME="${CLAUDE_COMMAND_NAME:-/work-issue}"
REVISE_LABEL="${REVISE_LABEL:-automation:revise}"
QUEUE_PRIORITY="${QUEUE_PRIORITY:-revise-first}"
DRY_RUN="${DRY_RUN:-0}"

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

# Run a mutating command, or just print it under DRY_RUN.
run() {
	if [[ "$DRY_RUN" == "1" ]]; then
		echo "[dry-run] $*"
	else
		"$@"
	fi
}

# Reviewer defaults to the repo owner login unless overridden.
CLAUDE_REVIEWER="${CLAUDE_REVIEWER:-$(gh repo view "$REPO" --json owner --jq '.owner.login' 2>/dev/null || true)}"

# Ensure the review-loop label exists (idempotent).
gh label create "$REVISE_LABEL" --repo "$REPO" --color FBCA04 \
	--description "Reviewed, changes requested - automation should resume on the PR" >/dev/null 2>&1 || true

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

# Echoes "<base_ref>\t<base_pr>" for an issue. Deterministic, never guessed.
compute_base_ref() {
	local issue="$1" body dep_n base_pr base_ref

	body="$(gh issue view "$issue" --repo "$REPO" --json body --jq '.body' 2>/dev/null || true)"

	# 1. Explicit "Depends on #N" with an open PR.
	dep_n="$(printf '%s' "$body" | grep -oiE 'depends on #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
	if [[ -n "$dep_n" ]]; then
		base_ref="$(gh pr view "$dep_n" --repo "$REPO" --json headRefName,state \
			--jq 'select(.state=="OPEN") | .headRefName' 2>/dev/null || true)"
		if [[ -n "$base_ref" ]]; then
			printf '%s\t%s\n' "$base_ref" "$dep_n"
			return 0
		fi
	fi

	# 2. An open PR that already references this issue (a prior slice).
	base_pr="$(gh pr list --repo "$REPO" --state open --search "#$issue in:body" \
		--json number,updatedAt --jq 'sort_by(.updatedAt) | last | .number // empty' 2>/dev/null || true)"
	if [[ -n "$base_pr" ]]; then
		base_ref="$(gh pr view "$base_pr" --repo "$REPO" --json headRefName --jq '.headRefName' 2>/dev/null || true)"
		if [[ -n "$base_ref" ]]; then
			printf '%s\t%s\n' "$base_ref" "$base_pr"
			return 0
		fi
	fi

	# 3. Default: main.
	printf '%s\t%s\n' "main" ""
}

post_runner_checkpoint() {
	local exit_code="$?"

	# Works for an issue OR a PR — whichever is set.
	local target="${CLAUDE_PR_NUMBER:-${CLAUDE_ISSUE_NUMBER:-}}"
	if [[ -z "$target" ]]; then
		exit "$exit_code"
	fi

	local header resume_arg
	if [[ -n "${CLAUDE_PR_NUMBER:-}" ]]; then
		header="PR: #$target"
		resume_arg="/address-review $target"
	else
		header="Issue: #$target"
		resume_arg="$CLAUDE_COMMAND_NAME $target"
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

	local body
	body="## Claude runner checkpoint

$header
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
claude -p --permission-mode $CLAUDE_PERMISSION_MODE --max-turns $CLAUDE_MAX_TURNS \"$resume_arg\"
\`\`\`
"

	if [[ -n "${CLAUDE_PR_NUMBER:-}" ]]; then
		gh pr comment "$target" --repo "$REPO" --body "$body" >/dev/null 2>&1 || true
	else
		gh issue comment "$target" --repo "$REPO" --body "$body" >/dev/null 2>&1 || true
	fi

	exit "$exit_code"
}

dispatch_new() {
	local ISSUE_NUMBER="$1"

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

	local BASE_REF BASE_PR
	IFS=$'\t' read -r BASE_REF BASE_PR < <(compute_base_ref "$ISSUE_NUMBER")
	echo "Base ref: $BASE_REF${BASE_PR:+ (stacked on #$BASE_PR)}"

	export CLAUDE_ISSUE_NUMBER="$ISSUE_NUMBER"
	export CLAUDE_REPO="$REPO"
	export CLAUDE_BRANCH="$BRANCH"
	export CLAUDE_EXPECTED_PERMISSION_MODE="$CLAUDE_PERMISSION_MODE"
	export CLAUDE_BASE_REF="$BASE_REF" CLAUDE_BASE_PR="$BASE_PR" CLAUDE_REVIEWER="$CLAUDE_REVIEWER"

	trap post_runner_checkpoint EXIT

	echo "Updating issue labels..."
	run gh issue edit "$ISSUE_NUMBER" \
		--repo "$REPO" \
		--remove-label "$READY_LABEL" \
		--add-label "$IN_PROGRESS_LABEL" || true

	# If stacking on an existing PR, mirror in-progress there too so the stack is visibly active.
	if [[ -n "${BASE_PR:-}" ]]; then
		run gh pr edit "$BASE_PR" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
	fi

	echo "Posting start checkpoint..."
	run gh issue comment "$ISSUE_NUMBER" \
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
	git fetch origin "$BASE_REF"
	run git switch -c "$BRANCH" "origin/$BASE_REF" 2>/dev/null \
		|| { run git switch "$BRANCH" && run git reset --hard "origin/$BASE_REF"; }

	echo
	echo "Starting Claude Code..."
	echo

	run claude -p \
		--permission-mode "$CLAUDE_PERMISSION_MODE" \
		--max-turns "$CLAUDE_MAX_TURNS" \
		"$CLAUDE_COMMAND_NAME $ISSUE_NUMBER"
}

dispatch_revise() {
	local PR="$1" BRANCH
	BRANCH="$(gh pr view "$PR" --repo "$REPO" --json headRefName --jq '.headRefName')"
	echo "Selected revise PR #$PR on branch $BRANCH"

	export CLAUDE_PR_NUMBER="$PR" CLAUDE_REPO="$REPO" CLAUDE_REVIEWER="$CLAUDE_REVIEWER"
	export CLAUDE_EXPECTED_PERMISSION_MODE="$CLAUDE_PERMISSION_MODE"
	trap post_runner_checkpoint EXIT

	git fetch origin "$BRANCH"
	run git switch "$BRANCH" 2>/dev/null || run git switch -c "$BRANCH" --track "origin/$BRANCH"

	run gh pr edit "$PR" --repo "$REPO" \
		--remove-label "$REVISE_LABEL" --add-label "$IN_PROGRESS_LABEL" || true

	# Mirror automation:in-progress to the linked issue so the issue reflects active work.
	local LINKED_ISSUE
	LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json closingIssuesReferences \
		--jq '.closingIssuesReferences[0].number // empty' 2>/dev/null || true)"
	if [[ -z "$LINKED_ISSUE" ]]; then
		LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json body --jq '.body' \
			| grep -oiE '(closes|fixes) #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
	fi
	if [[ -n "$LINKED_ISSUE" ]]; then
		run gh issue edit "$LINKED_ISSUE" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
	fi

	run gh pr comment "$PR" --repo "$REPO" --body "## Claude runner checkpoint

PR: #$PR
Branch: \`$BRANCH\`
Status: addressing-review" || true

	run claude -p --permission-mode "$CLAUDE_PERMISSION_MODE" \
		--max-turns "$CLAUDE_MAX_TURNS" "/address-review $PR"
}

REVISE_PR="$(gh pr list --repo "$REPO" --state open --label "$REVISE_LABEL" \
	--json number,updatedAt --jq 'sort_by(.updatedAt) | .[0].number // empty')"

if [[ "$QUEUE_PRIORITY" == "revise-first" && -n "$REVISE_PR" ]]; then
	dispatch_revise "$REVISE_PR"
	exit 0
fi

ISSUE_NUMBER="$(gh issue list --repo "$REPO" --state open --label "$READY_LABEL" \
	--json number,updatedAt --jq 'sort_by(.updatedAt) | .[0].number // empty')"

if [[ -n "$ISSUE_NUMBER" ]]; then
	dispatch_new "$ISSUE_NUMBER"
	exit 0
fi

if [[ -n "$REVISE_PR" ]]; then
	dispatch_revise "$REVISE_PR"
	exit 0
fi

echo "Nothing to do (no $REVISE_LABEL PRs, no $READY_LABEL issues)."
exit 0
