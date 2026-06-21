# Stacked PRs + Review→Continue Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the autonomous issue runner into a two-queue dispatcher that supports a human review→continue loop (`claude:revise` + a new `/address-review` skill) and deterministic stacked PRs grouped under one issue.

**Architecture:** `scripts/claude/run-next-issue.sh` becomes a router: it first drains `claude:revise` PRs (checkout the PR branch → `/address-review`), else picks a `claude:ready` issue and computes a deterministic base ref (stacking) before launching `/work-issue`. Two skill prompt files carry the agent behavior. A `DRY_RUN=1` mode makes the routing/stacking logic testable without spawning a nested agent.

**Tech Stack:** Bash, GitHub CLI (`gh`), git, Claude Code CLI, Vitest config (TypeScript).

Spec: `docs/superpowers/specs/2026-06-19-pr-stacking-review-loop-design.md`

---

## File Structure

- **Modify** `vitest.config.ts` — add `test.exclude` covering defaults + `**/.claude/worktrees/**`.
- **Modify** `scripts/claude/run-next-issue.sh` — `run()` mutation wrapper + `DRY_RUN`, label setup, `CLAUDE_REVIEWER`, base-ref computation, revise queue, `dispatch_new`/`dispatch_revise`, generalized exit checkpoint.
- **Create** `.claude/skills/address-review/SKILL.md` — the review-loop skill.
- **Modify** `.claude/skills/work-issue/SKILL.md` — stacking & grouping section.

> Implementation order matters: Task 1 unblocks `pnpm test`, then the runner is built bottom-up (helpers → new queue → revise queue), then the two skills.

---

## Task 1: Vitest worktree exclude (companion fix)

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Confirm the failure exists**

Run: `pnpm test 2>&1 | tail -5`
Expected: failures referencing `.claude/worktrees/.../node_modules` (the phantom ~14).

- [ ] **Step 2: Add the exclude**

Replace the `test` block in `vitest.config.ts`:

```ts
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.claude/worktrees/**",
		],
	},
```

- [ ] **Step 3: Verify the suite is green**

Run: `pnpm test 2>&1 | tail -6`
Expected: all test files pass, no `.claude/worktrees` paths in output.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "test: exclude nested .claude worktrees from vitest runs"
```

---

## Task 2: Runner — `run()` wrapper, `DRY_RUN`, config, label setup

**Files:**
- Modify: `scripts/claude/run-next-issue.sh`

- [ ] **Step 1: Add config vars**

After the existing `CLAUDE_COMMAND_NAME` line near the top, add:

```bash
REVISE_LABEL="${REVISE_LABEL:-claude:revise}"
QUEUE_PRIORITY="${QUEUE_PRIORITY:-revise-first}"
DRY_RUN="${DRY_RUN:-0}"
```

- [ ] **Step 2: Add the mutation wrapper + reviewer resolver**

After the `require_cmd` definitions/calls, add:

```bash
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
	--description "Reviewed, changes requested — Claude resume on the PR" >/dev/null 2>&1 || true
```

- [ ] **Step 3: Syntax check**

Run: `bash -n scripts/claude/run-next-issue.sh && echo OK`
Expected: `OK`

- [ ] **Step 4: Dry-run smoke (config prints, no mutations)**

Run: `DRY_RUN=1 bash scripts/claude/run-next-issue.sh 2>&1 | head -20`
Expected: runs through auth/selection; any `gh issue edit`/`comment`/`git switch`/`claude` lines appear as `[dry-run] ...` once those are wrapped in later tasks. For now, confirms no syntax error and reviewer resolves.

- [ ] **Step 5: Commit**

```bash
git add scripts/claude/run-next-issue.sh
git commit -m "chore: add dry-run wrapper, revise config, label setup to runner"
```

---

## Task 3: Runner — refactor the new-issue flow into `dispatch_new` with base-ref stacking

**Files:**
- Modify: `scripts/claude/run-next-issue.sh`

This wraps the existing selection→branch→launch logic into a function and adds deterministic base-ref computation. The existing trap and mutating calls move inside and get the `run()` wrapper.

- [ ] **Step 1: Add base-ref computation helper**

Add above where the old top-level selection logic began:

```bash
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
```

- [ ] **Step 2: Wrap the existing flow in `dispatch_new`**

Wrap the existing block (from issue selection through `claude -p ...`) inside:

```bash
dispatch_new() {
	local ISSUE_NUMBER="$1"
	# ... existing ISSUE_JSON / TITLE / branch-prefix / SLUG / BRANCH logic unchanged ...

	# Compute stacking base ref.
	local BASE_REF BASE_PR
	IFS=$'\t' read -r BASE_REF BASE_PR < <(compute_base_ref "$ISSUE_NUMBER")
	echo "Base ref: $BASE_REF${BASE_PR:+ (stacked on #$BASE_PR)}"

	export CLAUDE_ISSUE_NUMBER="$ISSUE_NUMBER" CLAUDE_REPO="$REPO" CLAUDE_BRANCH="$BRANCH"
	export CLAUDE_BASE_REF="$BASE_REF" CLAUDE_BASE_PR="$BASE_PR" CLAUDE_REVIEWER="$CLAUDE_REVIEWER"
	export CLAUDE_EXPECTED_PERMISSION_MODE="$CLAUDE_PERMISSION_MODE"

	trap post_runner_checkpoint EXIT

	run gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
		--remove-label "$READY_LABEL" --add-label "$IN_PROGRESS_LABEL" || true
	# ... existing start-checkpoint comment, wrapped in run ... 

	git fetch origin "$BASE_REF"
	run git switch -c "$BRANCH" "origin/$BASE_REF" 2>/dev/null || run git switch "$BRANCH"

	run claude -p --permission-mode "$CLAUDE_PERMISSION_MODE" \
		--max-turns "$CLAUDE_MAX_TURNS" "/work-issue $ISSUE_NUMBER"
}
```

> Replace the old hardcoded `git fetch origin main` / `git switch main` / branch creation with the `BASE_REF` version above. Wrap every mutating `gh`/`git`/`claude` call in `run`.

- [ ] **Step 3: Syntax check**

Run: `bash -n scripts/claude/run-next-issue.sh && echo OK`
Expected: `OK`

- [ ] **Step 4: Dry-run, default base (no dep) → main**

Pre: ensure a `claude:ready` issue with no `Depends on` exists (or reuse an existing test issue).
Run: `DRY_RUN=1 bash scripts/claude/run-next-issue.sh 2>&1 | grep -E 'Base ref|dry-run'`
Expected: `Base ref: main` and `[dry-run] git switch -c ...`, `[dry-run] claude -p ... /work-issue N`. No real label/branch mutation.

- [ ] **Step 5: Commit**

```bash
git add scripts/claude/run-next-issue.sh
git commit -m "feat: deterministic base-ref stacking in runner new-issue flow"
```

---

## Task 4: Runner — revise queue + `dispatch_revise` + router

**Files:**
- Modify: `scripts/claude/run-next-issue.sh`

- [ ] **Step 1: Generalize the exit checkpoint for PRs**

In `post_runner_checkpoint`, change the early-return guard so it fires for either an issue or a PR, and target the right thing:

```bash
	local target="${CLAUDE_PR_NUMBER:-${CLAUDE_ISSUE_NUMBER:-}}"
	if [[ -z "$target" ]]; then exit "$exit_code"; fi
```

Use `gh pr comment "$target"` when `CLAUDE_PR_NUMBER` is set, else `gh issue comment "$target"`.

- [ ] **Step 2: Add `dispatch_revise`**

```bash
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
	run gh pr comment "$PR" --repo "$REPO" --body "## Claude runner checkpoint

PR: #$PR
Branch: \`$BRANCH\`
Status: addressing-review" || true

	run claude -p --permission-mode "$CLAUDE_PERMISSION_MODE" \
		--max-turns "$CLAUDE_MAX_TURNS" "/address-review $PR"
}
```

- [ ] **Step 3: Add the top-level router**

Replace the old direct call to the new-issue flow with:

```bash
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
```

- [ ] **Step 4: Syntax check**

Run: `bash -n scripts/claude/run-next-issue.sh && echo OK`
Expected: `OK`

- [ ] **Step 5: Dry-run, revise priority**

Pre: label any open throwaway PR with `claude:revise`.
Run: `DRY_RUN=1 bash scripts/claude/run-next-issue.sh 2>&1 | grep -E 'revise PR|dry-run'`
Expected: `Selected revise PR #X` and `[dry-run] claude -p ... /address-review X`. Remove the label after.

- [ ] **Step 6: Commit**

```bash
git add scripts/claude/run-next-issue.sh
git commit -m "feat: add revise queue and PR-review dispatch to runner"
```

---

## Task 5: Create the `address-review` skill

**Files:**
- Create: `.claude/skills/address-review/SKILL.md`

- [ ] **Step 1: Write the skill file**

```markdown
---
name: address-review
description: Address human review feedback on a PR in autonomous mode — read review comments, apply minimal fixes on the same branch, re-request review
allowed-tools: Bash(gh *), Bash(git *), Bash(pnpm *), Bash(node *), Bash(ls *), Bash(cat *), Bash(grep *), Read, Edit, Write, MultiEdit, Grep, Glob, Task
---

You are addressing human review feedback on GitHub PR $ARGUMENTS.

Autonomous mode: do not ask for confirmation on routine engineering decisions. Make the
smallest safe change, document it, continue. Stop only on a genuine blocker.

## Intake

1. Read the PR and all feedback:

   ```bash
   gh pr view $ARGUMENTS --repo "$CLAUDE_REPO" --comments
   gh api "repos/{owner}/{repo}/pulls/$ARGUMENTS/comments"   # inline comments
   gh api "repos/{owner}/{repo}/pulls/$ARGUMENTS/reviews"    # review verdicts
   ```
2. Read root `CLAUDE.md` and the folder `CLAUDE.md` for every area you touch.
3. Confirm you are on the PR's head branch (`git branch --show-current`). The runner has
   already checked it out.

## Applying feedback

Use `superpowers:receiving-code-review`: verify each comment technically before acting.
- Actionable + correct → apply the smallest fix.
- Disputed / out-of-scope / technically wrong → do NOT change code; reply on the thread
  with your reasoning.
- Keep changes minimal and within repo architecture rules (see `work-issue` skill).

## Validate

```bash
pnpm lint:fix && pnpm lint && pnpm build && pnpm test
```

Fix failures you caused; document unrelated/pre-existing ones. Never claim validation
passed without running it.

## Handoff

1. Commit: `fix: address review feedback on #$ARGUMENTS`, push to the SAME branch.
2. Reply to each addressed review thread noting what changed.
3. Post a final checkpoint comment on the PR summarizing changes per comment.
4. Labels: remove `claude:in-progress`, add `claude:review`.
5. Re-request review:

   ```bash
   gh pr edit $ARGUMENTS --repo "$CLAUDE_REPO" --add-reviewer "$CLAUDE_REVIEWER"
   ```

## Blocker policy

Only if continuing would be reckless (conflicting feedback, missing intent, destructive
action). Add `claude:blocked`, remove `claude:in-progress`, document the exact blocker and
safe next options.
```

- [ ] **Step 2: Verify the file is well-formed**

Run: `head -5 .claude/skills/address-review/SKILL.md`
Expected: YAML frontmatter with `name: address-review`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/address-review/SKILL.md
git commit -m "feat: add address-review skill for the PR review loop"
```

---

## Task 6: `work-issue` skill — stacking & grouping section

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md`

- [ ] **Step 1: Insert a "Stacking & grouping" section before "## Pull request"**

```markdown
## Stacking & grouping

The runner exports `CLAUDE_BASE_REF` (default `main`), `CLAUDE_BASE_PR` (optional), and
`CLAUDE_REVIEWER`. The runner has already created the working branch off `CLAUDE_BASE_REF`
— do NOT re-branch.

When opening the PR, target the base ref and request the reviewer:

\`\`\`bash
gh pr create --base "$CLAUDE_BASE_REF" --reviewer "$CLAUDE_REVIEWER" \
  --title "<type>: <summary>" --body "<body>"
\`\`\`

If `CLAUDE_BASE_PR` is set, this PR is stacked on #$CLAUDE_BASE_PR — say so in the PR body
("Stacked on #$CLAUDE_BASE_PR").

Maintain a tracking comment on the issue, located by the hidden marker
`<!-- claude-pr-stack -->`. Read existing comments with
`gh issue view $ARGUMENTS --json comments`; if a comment contains the marker, update it,
otherwise create it:

\`\`\`md
<!-- claude-pr-stack -->
## Claude PR stack for #$ARGUMENTS
- [ ] #<base_pr> — <title> (base: <its base>)
- [ ] #<this_pr> — <title> (stacked on #<base_pr>)
\`\`\`
```

- [ ] **Step 2: Update the "After opening PR" labels step**

Ensure the existing step still removes `claude:in-progress` / adds `claude:review`, and add:
"Request `CLAUDE_REVIEWER` as reviewer if not already requested by `gh pr create`."

- [ ] **Step 3: Verify**

Run: `grep -n "Stacking & grouping" .claude/skills/work-issue/SKILL.md`
Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/work-issue/SKILL.md
git commit -m "feat: stacking, grouping and reviewer handoff in work-issue skill"
```

---

## Task 7: Full dry-run integration check + manual-test doc

**Files:**
- None (verification only); optionally append a "Manual E2E" note to the spec.

- [ ] **Step 1: Syntax + both queues dry-run**

Run: `bash -n scripts/claude/run-next-issue.sh && DRY_RUN=1 bash scripts/claude/run-next-issue.sh 2>&1 | tail -20`
Expected: clean syntax; router selects revise-or-new correctly; all mutations show `[dry-run]`.

- [ ] **Step 2: Document the manual revise-loop E2E**

Confirm these steps are written in the spec's Testing section (they are). Run them once
manually outside this plan when ready: throwaway PR → add `claude:revise` + a comment →
run the runner (real) → confirm a `fix:` commit on the same branch and the label back to
`claude:review`.

- [ ] **Step 3: Final lint/build/test of the repo (unaffected by tooling, but confirm green)**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: all green.

---

## Notes

- The runner/skills only take effect on `main` once PR #7 (plus this work) merges.
- `claude:revise` is added manually by the reviewer; auto-adding it from a "changes
  requested" review is a deliberate future follow-on (see spec non-goals).
