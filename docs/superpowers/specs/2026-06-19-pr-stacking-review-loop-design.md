# Stacked PRs + Review→Continue Loop — Design

Date: 2026-06-19
Status: approved (pending spec review)
Area: autonomous issue-handoff tooling (`scripts/claude/`, `.claude/skills/`)

## Problem

The current autonomous runner (`scripts/claude/run-next-issue.sh`) is one-shot and
only understands **new work**:

1. It always branches off `main`, so any unmerged related work is invisible to the
   agent. This already caused a real miss: issue #11 documented stale `SPEEDS` values
   because PR #10 (the change) was not on `main`.
2. After a human review there is no way to hand the work back to Claude — the runner
   only queries `automation:ready` **issues**, never **PRs**, and review feedback lives on
   the PR.
3. There is no concept of grouping multiple PRs that serve one issue, nor of stacking
   a dependent PR on top of the branch it depends on.

## Goals

- A human review loop: after review, the automation agent resumes on the **same PR** and addresses
  the feedback, looping until the human merges.
- Deterministic **stacked PRs**: a dependent PR branches off the branch it depends on
  (not `main`) and targets it as base, so it shows only its own diff.
- The PRs that serve one issue are **grouped** under that issue, and the repo owner is
  added as the **requested reviewer**.

## Non-goals (YAGNI)

- Continuous `while`-loop / cron wrapper for draining the queue. Orthogonal; easy to
  add later as `scripts/claude/run-loop.sh`.
- Auto-adding `automation:revise` from a GitHub "changes requested" review event. The label
  is added manually by the reviewer for now. A future GitHub Action could automate it.
- Migrating the runner to GitHub Actions / event-driven dispatch.

## Label state machine

One new label: **`automation:revise`** — "Reviewed, changes requested — Claude, resume on
this PR." It lives on the **PR**.

Lifecycle labels start on the **issue** during initial work, then the **PR** carries the
review-loop labels once it exists.

```
issue:  automation:ready ──▶ automation:in-progress ──(PR opened)──▶ automation:review
                                                                  │
PR:                              automation:review + owner requested as reviewer
                                                                  │
                        ┌──── owner approves ───▶ owner merges ─▶ closes issue ✓
                        └──── owner adds automation:revise (+ review comments)
                                                                  │
PR:  automation:revise ──(runner)──▶ automation:in-progress ──(fixes pushed)──▶ automation:review ──▶ (loop)
```

The reviewer only ever does two things: **merge** (approve) or **add `automation:revise`**
(with review comments).

## Components

### 1. Runner: two-queue dispatcher (`scripts/claude/run-next-issue.sh`)

On each invocation, in priority order:

1. **Revise queue (priority).** Pick the oldest open PR labelled `automation:revise`:
   ```bash
   gh pr list --repo "$REPO" --state open --label "$REVISE_LABEL" \
     --json number,updatedAt --jq 'sort_by(.updatedAt) | .[0].number // empty'
   ```
   If found → `dispatch_revise(PR)`.
2. **New queue (fallback).** Existing oldest `automation:ready` issue selection → `dispatch_new(ISSUE)`.
3. Neither → print "Nothing to do." and `exit 0`.

Priority order is env-configurable via `QUEUE_PRIORITY` (default `revise-first`).

`dispatch_revise(PR)`:
- Resolve the PR head branch: `gh pr view "$PR" --json headRefName`.
- `git fetch origin` then `git switch` to that branch (create tracking branch if needed).
- Flip PR label `automation:revise` → `automation:in-progress`.
- Post a start checkpoint **comment on the PR**.
- `export CLAUDE_PR_NUMBER="$PR"` and launch:
  ```bash
  claude -p --permission-mode "$CLAUDE_PERMISSION_MODE" --max-turns "$CLAUDE_MAX_TURNS" \
    "/address-review $PR"
  ```
- EXIT trap posts an exit checkpoint to the PR (reuse the existing trap pattern, keyed on
  `CLAUDE_PR_NUMBER` when set, else `CLAUDE_ISSUE_NUMBER`).

`dispatch_new(ISSUE)` — existing flow, plus **base-ref computation** (see §2). Exports
`CLAUDE_BASE_REF`, `CLAUDE_BASE_PR`, `CLAUDE_REVIEWER` for the skill, then launches
`/work-issue $ISSUE` as today.

### 2. Deterministic base-ref computation (runner, for the new queue)

Computed by the runner — never guessed by the agent:

1. Issue body contains `Depends on #N` **and** #N has an open PR
   → `CLAUDE_BASE_REF` = that PR's head branch, `CLAUDE_BASE_PR` = N.
2. Else an open PR already closes **this** issue (a prior slice)
   → `CLAUDE_BASE_REF` = the most-recently-updated such PR's head branch, `CLAUDE_BASE_PR` = that PR.
3. Else → `CLAUDE_BASE_REF` = `main`, `CLAUDE_BASE_PR` = "" (today's behavior).

Detection helpers:
- `Depends on #N`: `grep -oiE 'depends on #[0-9]+'` over the issue body.
- "PR closes this issue": GraphQL `closingIssuesReferences`, or fallback search
  `gh pr list --search "#$ISSUE in:body" --state open`.

The runner cuts the new branch off `origin/$CLAUDE_BASE_REF` (instead of always `main`).

### 3. `work-issue` skill changes (`.claude/skills/work-issue/SKILL.md`)

Add a "Stacking & grouping" section:
- Read `CLAUDE_BASE_REF` (default `main`), `CLAUDE_BASE_PR` (optional), `CLAUDE_REVIEWER`
  (default repo owner login).
- The runner has already created/checked out the working branch off `$CLAUDE_BASE_REF`
  (§2); the skill reuses the current branch and does **not** re-branch.
- Open the PR with `gh pr create --base "$CLAUDE_BASE_REF" --reviewer "$CLAUDE_REVIEWER"`.
- **Upsert a tracking comment on the issue** (located by a hidden HTML-comment marker
  `<!-- claude-pr-stack -->`), listing the stack in order:
  ```
  <!-- claude-pr-stack -->
  ## Claude PR stack for #N
  - [ ] #12 — base slice (base: main)
  - [ ] #13 — second slice (stacked on #12)
  ```
  Find existing via `gh issue view N --json comments`; update if present, else create.

### 4. New skill: `.claude/skills/address-review/SKILL.md`

Args: PR number. Operating mode mirrors `work-issue` (autonomous, checkpoints, minimal
diffs, repo architecture rules).

Flow:
1. Read PR + review feedback:
   - `gh pr view $PR --comments`
   - inline comments: `gh api repos/{owner}/{repo}/pulls/$PR/comments`
   - reviews: `gh api repos/{owner}/{repo}/pulls/$PR/reviews`
2. Read root `CLAUDE.md` and the folder `CLAUDE.md` for every area touched.
3. Ensure the PR head branch is checked out (runner already switched to it).
4. Use `superpowers:receiving-code-review` — verify each comment technically; do not
   blindly comply. Apply minimal fixes; for disputed/out-of-scope items, reply with
   reasoning instead of changing code.
5. Validate: `pnpm lint:fix`, `pnpm lint`, `pnpm build`, `pnpm test`.
6. Commit `fix: address review feedback on #PR`, push to the **same** branch.
7. Reply to the addressed review threads and post a final checkpoint summarizing what
   changed per comment.
8. Flip PR label `automation:in-progress` → `automation:review`; re-request review from
   `CLAUDE_REVIEWER`.
9. If genuinely blocked, follow the existing blocker policy (label `automation:blocked`,
   documented blocker).

### 5. Configuration (env, with defaults)

Added to the runner:
- `REVISE_LABEL=automation:revise`
- `QUEUE_PRIORITY=revise-first`
- `CLAUDE_REVIEWER` — default = repo owner login (`gh repo view --json owner --jq .owner.login`).

Exported to skills: `CLAUDE_BASE_REF`, `CLAUDE_BASE_PR`, `CLAUDE_REVIEWER`, plus the
existing `CLAUDE_ISSUE_NUMBER` / new `CLAUDE_PR_NUMBER`.

### 6. Companion fixes (required for the loop to pass)

- **`vitest.config.ts`**: add `test.exclude` covering the defaults plus
  `**/.claude/worktrees/**`, so the validation step stops failing on stale worktree
  copies (the 14 phantom failures observed during the #11 run). Verify a bare
  `pnpm test` is green afterward.
- **One-time label setup**: the runner ensures the label exists, idempotently:
  ```bash
  gh label create "$REVISE_LABEL" --color FBCA04 \
    --description "Reviewed, changes requested - automation should resume on the PR" 2>/dev/null || true
  ```

## Error handling

- Revise PR branch merged/deleted before dispatch → skip, log, move on.
- Base PR merged between detection and `pr create` → fall back to `--base main`, note it
  in the PR body.
- Stack base branch advanced → the agent rebases the stacked branch, or flags a blocker
  if it cannot cleanly.
- `CLAUDE_REVIEWER` unresolvable → skip the reviewer request, warn (non-fatal).
- `automation:revise` label missing → created idempotently at runner start.

## Testing

- `bash -n` on every script.
- `DRY_RUN=1` mode in the runner: prints the selected queue, item, computed base ref, and
  the command it *would* run; performs no label flips, comments, branch switches, or
  `claude` launch. Makes queue/stacking logic testable without a nested agent.
- Skills are prompt files (no unit tests). Document the manual end-to-end revise-loop
  test: open a throwaway PR, add `automation:revise` + a review comment, run the runner, and
  confirm the fix is pushed to the same branch and the label returns to `automation:review`.

## Rollout notes

- The runner and skills only exist on the tooling branch until PR #7 merges to `main`;
  this work extends that branch. The runner must be on `main` before the routine runs
  from a clean checkout.
