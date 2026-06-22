---
name: address-review
description: Address human review feedback on a GitHub PR in autonomous Codex mode by reading review comments, applying minimal fixes on the same branch, replying to threads, validating, and re-requesting review. Use when the user asks Codex to address PR review feedback or continue a reviewed PR.
---

# Address Review

Address human review feedback on the PR identified in the user's prompt.

Autonomous mode: do not ask for confirmation on routine engineering decisions. Make the smallest safe change, document it, and continue. Stop only on a genuine blocker.

## Intake

1. Resolve the PR number and repository:

   ```bash
   PR_NUMBER="<pr number>"
   REPO="${CODEX_REPO:-${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}}"
   CODEX_REVIEWER="${CODEX_REVIEWER:-$(gh repo view "$REPO" --json owner --jq '.owner.login' 2>/dev/null || true)}"
   ```

2. Read the PR and all feedback:

   ```bash
   gh pr view "$PR_NUMBER" --repo "$REPO" --comments
   gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/comments"
   gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/reviews"
   ```

3. Read root `AGENTS.md` and folder `AGENTS.md` files for every area you touch.
4. Confirm you are on the PR's head branch:

   ```bash
   gh pr checkout "$PR_NUMBER" --repo "$REPO"
   git branch --show-current
   ```

## Applying Feedback

Verify each comment technically before acting.

- Actionable + correct: apply the smallest fix.
- Disputed, out-of-scope, or technically wrong: do not change code; reply on the thread with reasoning.
- Keep changes minimal and within repo architecture rules.
- Do not rewrite unrelated code.

## Validate

```bash
pnpm lint:fix
pnpm lint
pnpm build
pnpm test
```

Fix failures you caused. Document unrelated or pre-existing failures. Never claim validation passed without running it.

## Handoff

1. Commit with `fix: address review feedback on #<PR_NUMBER>`.
2. Push to the same branch.
3. Reply to each addressed review thread noting what changed. Every comment must end with `— Codex`.
4. Post a final checkpoint comment on the PR summarizing changes per comment. End it with `— Codex`.
5. Labels: remove `automation:in-progress`, add `automation:review`.
6. Mirror `automation:review` to the linked issue:

   ```bash
   LINKED_ISSUE="$(gh pr view "$PR_NUMBER" --repo "$REPO" \
     --json closingIssuesReferences \
     --jq '.closingIssuesReferences[0].number // empty' 2>/dev/null || true)"

   if [[ -z "$LINKED_ISSUE" ]]; then
     LINKED_ISSUE="$(gh pr view "$PR_NUMBER" --repo "$REPO" --json body --jq '.body' \
       | grep -oiE '(closes|fixes) #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
   fi

   if [[ -n "$LINKED_ISSUE" ]]; then
     gh issue edit "$LINKED_ISSUE" --repo "$REPO" \
       --add-label "automation:review" \
       --remove-label "automation:in-progress" || true
   fi
   ```

   If the linked issue cannot be resolved, log a warning and continue.

7. Re-request review when `CODEX_REVIEWER` is set:

   ```bash
   gh pr edit "$PR_NUMBER" --repo "$REPO" --add-reviewer "$CODEX_REVIEWER"
   ```

## Blocker Policy

Only block when continuing would be reckless: conflicting feedback, missing intent, missing credentials, or destructive action risk.

When blocked:

1. Add `automation:blocked`.
2. Remove `automation:in-progress`.
3. Post the exact blocker and safe next options in a PR comment ending with `— Codex`.
