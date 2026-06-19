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
