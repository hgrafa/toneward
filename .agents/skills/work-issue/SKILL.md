---
name: work-issue
description: Work one GitHub issue end-to-end in autonomous Codex mode, including issue intake, isolated worktree setup, implementation, validation, checkpoints, and PR handoff. Use when the user asks Codex to work an issue, run an issue queue item, or continue a GitHub issue.
---

# Work Issue

Work on the GitHub issue identified in the user's prompt.

Operate autonomously. Do not ask for confirmation for routine engineering decisions. Make the smallest safe decision, document it, and continue. Ask for help only when blocked by missing product intent, missing credentials, destructive action risk, or ambiguity that would materially change the implementation.

## Required Operating Mode

### Step 0 - Resolve Inputs

Extract the issue number from the prompt.

Resolve repository and runner values:

```bash
ISSUE_NUMBER="<issue number>"
REPO="${CODEX_REPO:-${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}}"
CODEX_BRANCH="${CODEX_BRANCH:-}"
CODEX_BASE_REF="${CODEX_BASE_REF:-main}"
CODEX_BASE_PR="${CODEX_BASE_PR:-}"
CODEX_REVIEWER="${CODEX_REVIEWER:-$(gh repo view "$REPO" --json owner --jq '.owner.login' 2>/dev/null || true)}"
```

### Step 1 - Claim The Issue

Before implementation, label the issue WIP so parallel sessions do not pick it up:

```bash
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --add-label "automation:in-progress" \
  --remove-label "automation:ready" 2>/dev/null || true
```

### Step 2 - Read Context

1. Read root `AGENTS.md`.
2. Read nearby folder `AGENTS.md` files for every area you touch.
3. Read the issue body and comments:

   ```bash
   gh issue view "$ISSUE_NUMBER" --repo "$REPO" --comments
   ```

4. Inspect worktrees and git state:

   ```bash
   git worktree list
   git status
   git branch --show-current
   ```

### Step 3 - Set Up A Worktree

Always work in a git worktree for issue work.

- Worktrees live in `.agents/worktrees/<slug>` (git-ignored).
- Check for an existing worktree for this issue before creating one:

  ```bash
  git worktree list | grep "$ISSUE_NUMBER"
  ```

- If found, `cd` into it and continue.
- If not found, create one:

  ```bash
  git worktree add ".agents/worktrees/issue-$ISSUE_NUMBER-<short-slug>" -b "<branch-name>" "origin/$CODEX_BASE_REF"
  ```

- Branch names follow `AGENTS.md`: `feat/...`, `fix/...`, `refactor/...`, `test/...`, `docs/...`, or `chore/...`.
- Do not work directly on `main`. Do not commit in the main working tree.

### Step 4 - Post A Start Checkpoint

Post a checkpoint comment to the issue using the checkpoint format below. End the comment with `— Codex`.

## Issue Intake

Classify the issue before coding:

- `feature`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`

Estimate size:

- `size:s` - should fit in one focused change
- `size:m` - needs multiple files or tests
- `size:l` - should probably be split; proceed only if still safely one PR

If the issue is too large:

1. Propose a split in an issue comment.
2. Implement the smallest valuable vertical slice if possible.
3. Mark remaining work clearly.

## Implementation Rules

Follow repository architecture strictly:

1. `src/core/` must stay pure TypeScript.
   - No React.
   - No DOM APIs.
   - No browser APIs.
   - Keep functions unit-testable.
2. UI code must use existing project conventions.
   - Functional React components only.
   - Use shadcn/ui primitives for controls.
   - Use icons only from approved icon libraries already used by the repo.
   - Preserve Tailwind/shadcn style conventions.
3. State must stay focused.
   - Do not reintroduce broad god-context patterns.
   - Subscribe to the narrowest context/hook needed.
   - Add new context only when state does not belong in an existing focused context.
4. Music-theory logic must preserve the repo's source-of-truth model.
   - Pitch class is the core math source of truth.
   - Spelling and octave are additive layers.
   - Do not normalize away user-facing spelling unless existing domain code requires it.
5. Keep the change minimal.
   - Do not rewrite unrelated code.
   - Do not upgrade dependencies unless the issue explicitly requires it.
   - Do not change formatting outside touched files except through Biome.
6. Do not commit planning artifacts.
   - Treat `docs/superpowers/plans/`, `docs/superpowers/specs/`, `.superpowers/`, and `.claire/` as scratch/session artifacts unless the issue explicitly asks for docs.

## Checkpoints

Post checkpoint comments at meaningful moments:

- Start of work
- After planning
- After first implementation slice
- After tests/lint/build
- Before stopping because of blocker or context pressure
- After opening PR

Use this format:

```md
## Codex checkpoint

Issue: #<issue>
Branch:
Status: in-progress | blocked | ready-for-review

### Mode
- Autonomous mode: yes
- Codex skills used:
  - ...

### Current understanding
- ...

### Done
- ...

### Files touched
- ...

### Decisions made
- ...

### Validation
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm test`

### Remaining work
- ...

### Next step
...

— Codex
```

If the session is about to stop, prioritize posting the checkpoint over further coding.

## Commit Discipline

Commit meaningful slices.

Good commit boundaries:

- tests added
- core logic implemented
- UI wired
- edge cases fixed
- docs updated
- review feedback addressed

Before each commit:

```bash
git status
git diff --check
```

Prefer clear conventional commits:

```bash
test: cover issue <issue> behavior
feat: implement issue <issue> core logic
feat: wire issue <issue> UI
fix: handle issue <issue> edge case
docs: document issue <issue> behavior
```

## Validation

Before opening a PR, run:

```bash
pnpm lint:fix
pnpm lint
pnpm build
pnpm test
```

If a command fails:

1. Fix failures related to your change.
2. Re-run the failed command.
3. Document remaining failures if unrelated or blocked.
4. Do not claim validation passed without running it.

## Stacking And Grouping

The runner may export `CODEX_BASE_REF` (default `main`), `CODEX_BASE_PR` (optional), and `CODEX_REVIEWER`. If exported, the runner already created the working branch off `CODEX_BASE_REF`; do not re-branch.

When opening the PR:

```bash
gh pr create --base "$CODEX_BASE_REF" --reviewer "$CODEX_REVIEWER" \
  --title "<type>: <summary>" --body "<body>"
```

If `CODEX_BASE_PR` is set, this PR is stacked on that PR. Say so in the PR body: `Stacked on #$CODEX_BASE_PR`.

Maintain a tracking comment on the issue, located by hidden marker `<!-- codex-pr-stack -->`. Read existing comments with `gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json comments`; if a comment contains the marker, update it, otherwise create it.

## Pull Request

PR body must include:

```md
## Summary

Closes #<issue>

## What changed

- ...

## Validation

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm test`

## Codex checkpoints

- ...

## Codex skills used

- ...

## Review notes

Focus on:
- Architecture boundaries
- Music-theory correctness
- UI regressions
- Tests

## Known limitations

- ...
```

After opening PR:

1. Comment on the issue with the PR link and end the comment with `— Codex`.
2. Add or update PR labels:
   - remove `automation:in-progress`
   - add `automation:review`
3. Mirror `automation:review` to the issue:

   ```bash
   gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
     --add-label "automation:review" \
     --remove-label "automation:in-progress" || true
   ```

4. Ensure `CODEX_REVIEWER` is requested as a reviewer when set.
5. Leave a final checkpoint with exact resume instructions.

## Blocker Policy

Only mark blocked when continuing would be reckless.

Valid blockers:

- Missing product requirement that changes behavior materially
- Conflicting acceptance criteria
- Missing secrets/credentials
- Destructive operation required
- Existing broken main branch prevents validation
- Test environment cannot run for external reasons

When blocked, comment:

````md
## Codex checkpoint

Issue: #<issue>
Branch:
Status: blocked

### Blocker
...

### What I tried
...

### Files touched
...

### Safe next options
1. ...
2. ...

### Resume command
```bash
git switch <branch>
codex exec --sandbox workspace-write 'Use $address-review or $work-issue to continue ...'
```

— Codex
````

Do not use blocked for ordinary implementation difficulty. Debug and continue.
