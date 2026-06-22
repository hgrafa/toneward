#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}"
READY_LABEL="${READY_LABEL:-automation:ready}"
IN_PROGRESS_LABEL="${IN_PROGRESS_LABEL:-automation:in-progress}"
REVIEW_LABEL="${REVIEW_LABEL:-automation:review}"
REVISE_LABEL="${REVISE_LABEL:-automation:revise}"
BLOCKED_LABEL="${BLOCKED_LABEL:-automation:blocked}"
COMPLETED_LABEL="${COMPLETED_LABEL:-automation:completed}"
QUEUE_PRIORITY="${QUEUE_PRIORITY:-revise-first}"
DRY_RUN="${DRY_RUN:-0}"

CODEX_SANDBOX="${CODEX_SANDBOX:-workspace-write}"
CODEX_APPROVAL_POLICY="${CODEX_APPROVAL_POLICY:-never}"
CODEX_COMMAND_NAME="${CODEX_COMMAND_NAME:-work-issue}"

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
require_cmd jq
require_cmd pnpm
require_cmd codex

run() {
	if [[ "$DRY_RUN" == "1" ]]; then
		echo "[dry-run] $*"
	else
		"$@"
	fi
}

ensure_label() {
	local label="$1" color="$2" description="$3"
	gh label create "$label" --repo "$REPO" --color "$color" --description "$description" >/dev/null 2>&1 || true
}

ensure_labels() {
	ensure_label "$READY_LABEL" "0E8A16" "Ready for an automation runner to pick up"
	ensure_label "$IN_PROGRESS_LABEL" "FBCA04" "Automation work in progress"
	ensure_label "$REVIEW_LABEL" "5319E7" "Automation PR opened, waiting for review"
	ensure_label "$REVISE_LABEL" "D93F0B" "Reviewed, changes requested - automation should resume on the PR"
	ensure_label "$BLOCKED_LABEL" "B60205" "Automation blocked, human follow-up needed"
	ensure_label "$COMPLETED_LABEL" "0E8A16" "Automation work completed"
}

CODEX_REVIEWER="${CODEX_REVIEWER:-$(gh repo view "$REPO" --json owner --jq '.owner.login' 2>/dev/null || true)}"

echo "Repository: $REPO"
echo "Codex sandbox: $CODEX_SANDBOX"
echo "Codex approval policy: $CODEX_APPROVAL_POLICY"
echo

echo "Checking GitHub auth..."
gh auth status >/dev/null

echo "Checking Codex availability..."
codex --version >/dev/null
echo

ensure_labels

compute_base_ref() {
	local issue="$1" body dep_n base_pr base_ref

	body="$(gh issue view "$issue" --repo "$REPO" --json body --jq '.body' 2>/dev/null || true)"

	dep_n="$(printf '%s' "$body" | grep -oiE 'depends on #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
	if [[ -n "$dep_n" ]]; then
		base_ref="$(gh pr view "$dep_n" --repo "$REPO" --json headRefName,state \
			--jq 'select(.state=="OPEN") | .headRefName' 2>/dev/null || true)"
		if [[ -n "$base_ref" ]]; then
			printf '%s\t%s\n' "$base_ref" "$dep_n"
			return 0
		fi
	fi

	base_pr="$(gh pr list --repo "$REPO" --state open --search "#$issue in:body" \
		--json number,updatedAt --jq 'sort_by(.updatedAt) | last | .number // empty' 2>/dev/null || true)"
	if [[ -n "$base_pr" ]]; then
		base_ref="$(gh pr view "$base_pr" --repo "$REPO" --json headRefName --jq '.headRefName' 2>/dev/null || true)"
		if [[ -n "$base_ref" ]]; then
			printf '%s\t%s\n' "$base_ref" "$base_pr"
			return 0
		fi
	fi

	printf '%s\t%s\n' "main" ""
}

codex_exec() {
	local workdir="$1" prompt="$2"
	local args=(--ask-for-approval "$CODEX_APPROVAL_POLICY" --cd "$workdir")
	if [[ -n "${CODEX_MODEL:-}" ]]; then
		args+=("--model" "$CODEX_MODEL")
	fi

	run codex "${args[@]}" exec --sandbox "$CODEX_SANDBOX" "$prompt"
}

post_runner_checkpoint() {
	local exit_code="$?"
	local target="${CODEX_PR_NUMBER:-${CODEX_ISSUE_NUMBER:-}}"
	if [[ -z "$target" ]]; then
		exit "$exit_code"
	fi

	local header resume_prompt workdir
	workdir="${CODEX_WORKDIR:-$ROOT_DIR}"
	if [[ -n "${CODEX_PR_NUMBER:-}" ]]; then
		header="PR: #$target"
		resume_prompt="Use \$address-review to continue PR #$target."
	else
		header="Issue: #$target"
		resume_prompt="Use \$$CODEX_COMMAND_NAME to continue issue #$target."
	fi

	if [[ "${CODEX_SKIP_EXIT_CHECKPOINT:-false}" == "true" || "$DRY_RUN" == "1" ]]; then
		exit "$exit_code"
	fi

	local current_branch status last_commit checkpoint_status
	current_branch="$(git -C "$workdir" branch --show-current 2>/dev/null || true)"
	status="$(git -C "$workdir" status --short 2>/dev/null || true)"
	last_commit="$(git -C "$workdir" log -1 --oneline 2>/dev/null || true)"

	checkpoint_status="session-ended"
	if [[ "$exit_code" -ne 0 ]]; then
		checkpoint_status="runner-failed"
	fi

	local body
	body="## Codex runner checkpoint

$header
Branch: \`$current_branch\`
Status: $checkpoint_status
Runner exit code: \`$exit_code\`

### Mode
- Autonomous mode: yes
- Sandbox: \`$CODEX_SANDBOX\`
- Approval policy: \`$CODEX_APPROVAL_POLICY\`

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
codex --cd "$workdir" exec --sandbox "$CODEX_SANDBOX" '$resume_prompt'
\`\`\`

— Codex
"

	if [[ -n "${CODEX_PR_NUMBER:-}" ]]; then
		gh pr comment "$target" --repo "$REPO" --body "$body" >/dev/null 2>&1 || true
	else
		gh issue comment "$target" --repo "$REPO" --body "$body" >/dev/null 2>&1 || true
	fi

	exit "$exit_code"
}

prepare_worktree() {
	local worktree="$1" branch="$2" base_ref="$3"

	if git worktree list --porcelain | grep -Fqx "worktree $ROOT_DIR/$worktree"; then
		printf '%s\n' "$ROOT_DIR/$worktree"
		return 0
	fi

	mkdir -p "$(dirname "$worktree")"
	git fetch origin "$base_ref"

	if git show-ref --verify --quiet "refs/heads/$branch"; then
		run git worktree add "$worktree" "$branch" >&2
	else
		run git worktree add "$worktree" -b "$branch" "origin/$base_ref" >&2
	fi

	printf '%s\n' "$ROOT_DIR/$worktree"
}

dispatch_new() {
	local ISSUE_NUMBER="$1"

	local ISSUE_JSON TITLE ISSUE_URL LABELS BRANCH_PREFIX SLUG BRANCH BASE_REF BASE_PR WORKTREE WORKDIR
	ISSUE_JSON="$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json number,title,labels,url,state)"
	TITLE="$(echo "$ISSUE_JSON" | jq -r '.title')"
	ISSUE_URL="$(echo "$ISSUE_JSON" | jq -r '.url')"

	echo "Selected issue #$ISSUE_NUMBER: $TITLE"
	echo "$ISSUE_URL"
	echo

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
	IFS=$'\t' read -r BASE_REF BASE_PR < <(compute_base_ref "$ISSUE_NUMBER")
	WORKTREE=".agents/worktrees/issue-${ISSUE_NUMBER}-${SLUG}"

	echo "Branch: $BRANCH"
	echo "Base ref: $BASE_REF${BASE_PR:+ (stacked on #$BASE_PR)}"
	echo "Worktree: $WORKTREE"
	echo

	export CODEX_ISSUE_NUMBER="$ISSUE_NUMBER"
	export CODEX_REPO="$REPO"
	export CODEX_BRANCH="$BRANCH"
	export CODEX_BASE_REF="$BASE_REF"
	export CODEX_BASE_PR="$BASE_PR"
	export CODEX_REVIEWER
	trap post_runner_checkpoint EXIT

	echo "Updating issue labels..."
	run gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
		--remove-label "$READY_LABEL" \
		--add-label "$IN_PROGRESS_LABEL" || true

	if [[ -n "${BASE_PR:-}" ]]; then
		run gh pr edit "$BASE_PR" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
	fi

	echo "Posting start checkpoint..."
	run gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "## Codex checkpoint

Issue: #$ISSUE_NUMBER
Branch: \`$BRANCH\`
Status: in-progress

### Mode
- Autonomous mode: yes
- Sandbox: \`$CODEX_SANDBOX\`
- Approval policy: \`$CODEX_APPROVAL_POLICY\`

### Current understanding
- Runner selected this issue from label \`$READY_LABEL\`.
- Codex should read \`AGENTS.md\`, issue comments, relevant folder docs, then work end-to-end.

### Done
- Issue selected.
- Branch planned.
- Labels updated.

### Files touched
- None yet.

### Decisions made
- Branch name: \`$BRANCH\`
- Work mode: autonomous Codex execution.

### Validation
- [ ] \`pnpm lint\`
- [ ] \`pnpm build\`
- [ ] \`pnpm test\`

### Remaining work
- Inspect issue and repo.
- Implement.
- Validate.
- Open PR.

### Next step
Start Codex with the \$work-issue skill.

— Codex"

	WORKDIR="$(prepare_worktree "$WORKTREE" "$BRANCH" "$BASE_REF")"
	export CODEX_WORKDIR="$WORKDIR"

	codex_exec "$WORKDIR" "Use \$$CODEX_COMMAND_NAME to work GitHub issue #$ISSUE_NUMBER end-to-end."
}

dispatch_revise() {
	local PR="$1" BRANCH SLUG WORKTREE WORKDIR LINKED_ISSUE
	BRANCH="$(gh pr view "$PR" --repo "$REPO" --json headRefName --jq '.headRefName')"
	SLUG="$(echo "$BRANCH" | sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-64)"
	WORKTREE=".agents/worktrees/pr-${PR}-${SLUG:-review}"

	echo "Selected revise PR #$PR on branch $BRANCH"
	echo "Worktree: $WORKTREE"

	export CODEX_PR_NUMBER="$PR"
	export CODEX_REPO="$REPO"
	export CODEX_REVIEWER
	trap post_runner_checkpoint EXIT

	git fetch origin "$BRANCH"
	WORKDIR="$(prepare_worktree "$WORKTREE" "$BRANCH" "$BRANCH")"
	export CODEX_WORKDIR="$WORKDIR"

	run gh pr edit "$PR" --repo "$REPO" \
		--remove-label "$REVISE_LABEL" --add-label "$IN_PROGRESS_LABEL" || true

	LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json closingIssuesReferences \
		--jq '.closingIssuesReferences[0].number // empty' 2>/dev/null || true)"
	if [[ -z "$LINKED_ISSUE" ]]; then
		LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json body --jq '.body' \
			| grep -oiE '(closes|fixes) #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
	fi
	if [[ -n "$LINKED_ISSUE" ]]; then
		run gh issue edit "$LINKED_ISSUE" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
	fi

	run gh pr comment "$PR" --repo "$REPO" --body "## Codex runner checkpoint

PR: #$PR
Branch: \`$BRANCH\`
Status: addressing-review

— Codex" || true

	codex_exec "$WORKDIR" "Use \$address-review to address review feedback on PR #$PR."
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
