---
name: work-issue
description: Work one GitHub issue end-to-end in autonomous mode, using Superpowers for planning, execution, checkpoints, and PR handoff
allowed-tools: Bash(gh *), Bash(git *), Bash(pnpm *), Bash(node *), Bash(ls *), Bash(cat *), Bash(grep *), Read, Edit, Write, MultiEdit, Grep, Glob, Task
---

You are working on GitHub issue $ARGUMENTS for this repository.

You are expected to run in autonomous mode. Do not ask for confirmation for routine engineering decisions. Make the smallest safe decision, document it, and continue. Ask for help only if the issue is genuinely blocked by missing product intent, missing credentials, destructive action risk, or ambiguity that would materially change the implementation.

## Required operating mode

Before doing implementation work:

1. Read root `CLAUDE.md`.
2. Read nearby folder `CLAUDE.md` files for every area you touch.
3. Read the issue body and comments:

```bash
gh issue view $ARGUMENTS --comments
```

4. Inspect existing branches and current git state:

```bash
git status
git branch --show-current
```

5. Post a start checkpoint comment to the issue.

## Superpowers usage

You must actively use Superpowers when available. Do not skip this just because the issue looks simple.

Use the best matching Superpower for the phase:

* Use `superpowers:brainstorming` when the issue needs product/design clarification, UX tradeoffs, architecture options, or decomposition.
* Use `superpowers:writing-plans` when the issue is medium/large or needs a multi-step implementation plan.
* Use `superpowers:executing-plans` when following a concrete checklist or implementation plan.
* Use `superpowers:subagent-driven-development` when the work benefits from isolated investigation, tests, review, or parallelizable subtasks.
* Use relevant review/debugging/testing Superpowers if tests fail, behavior is unclear, or the code change crosses module boundaries.

If Superpowers are installed, explicitly load/use the relevant skill before planning or implementation. If unavailable, state that in the checkpoint and proceed with the equivalent manual discipline.

## Issue intake

Classify the issue before coding:

* `feature`
* `fix`
* `refactor`
* `test`
* `docs`
* `chore`

Estimate size:

* `size:s`: should fit in one focused change
* `size:m`: needs multiple files or tests
* `size:l`: should probably be split; proceed only if still safely one PR

If the issue is too large, do not build a huge solution. Instead:

1. Propose a split in an issue comment.
2. Implement the smallest valuable vertical slice if possible.
3. Mark remaining work clearly.

## Branch rules

Create or reuse a branch named according to root `CLAUDE.md`.

Examples:

```bash
feat/issue-$ARGUMENTS-short-slug
fix/issue-$ARGUMENTS-short-slug
refactor/issue-$ARGUMENTS-short-slug
test/issue-$ARGUMENTS-short-slug
docs/issue-$ARGUMENTS-short-slug
chore/issue-$ARGUMENTS-short-slug
```

Do not work directly on `main`.

## Implementation rules

Follow repository architecture strictly:

1. `src/core/` must stay pure TypeScript.

   * No React.
   * No DOM APIs.
   * No browser APIs.
   * Keep functions unit-testable.

2. UI code must use existing project conventions.

   * Functional React components only.
   * Use shadcn/ui primitives for controls.
   * Use icons only from approved icon libraries already used by the repo.
   * Preserve Tailwind/shadcn style conventions.

3. State must stay focused.

   * Do not reintroduce broad god-context patterns.
   * Subscribe to the narrowest context/hook needed.
   * Add new context only when state does not belong in an existing focused context.

4. Music-theory logic must preserve the repo’s source-of-truth model.

   * Pitch class is the core math source of truth.
   * Spelling and octave are additive layers.
   * Do not normalize away user-facing spelling unless existing domain code requires it.

5. Keep the change minimal.

   * Do not opportunistically rewrite unrelated code.
   * Do not upgrade dependencies unless the issue explicitly requires it.
   * Do not change formatting outside touched files except through Biome.

## Autonomous progress expectations

Work continuously until one of these outcomes happens:

1. A PR is opened and ready for human review.
2. The issue is blocked and the exact blocker is documented.
3. The issue is too large and a smaller safe slice has been completed or proposed.

Do not stop after only planning unless the issue explicitly asks for planning only.

## Checkpoints

Post checkpoint comments to the issue or PR at meaningful moments:

* Start of work
* After planning/brainstorming
* After first implementation slice
* After tests/lint/build
* Before stopping because of blocker or context/token pressure
* After opening PR

Use this exact format:

```md
## Claude checkpoint

Issue: #$ARGUMENTS
Branch:
Status: in-progress | blocked | ready-for-review

### Mode
- Autonomous mode: yes
- Superpowers used:
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
```

If the session is about to stop, prioritize posting the checkpoint over further coding.

## Commit discipline

Commit meaningful slices.

Good commit boundaries:

* tests added
* core logic implemented
* UI wired
* edge cases fixed
* docs updated
* review feedback addressed

Before each commit, check:

```bash
git status
git diff --check
```

Prefer clear conventional commits:

```bash
test: cover issue $ARGUMENTS behavior
feat: implement issue $ARGUMENTS core logic
feat: wire issue $ARGUMENTS UI
fix: handle issue $ARGUMENTS edge case
docs: document issue $ARGUMENTS behavior
```

## Validation

Before opening PR, run:

```bash
pnpm lint:fix
pnpm lint
pnpm build
pnpm test
```

If a command fails:

1. Fix the cause if it is related to your change.
2. Re-run the failed command.
3. Document remaining failures if unrelated or blocked.
4. Do not pretend validation passed.

## Stacking & grouping

The runner exports `CLAUDE_BASE_REF` (default `main`), `CLAUDE_BASE_PR` (optional), and
`CLAUDE_REVIEWER`. The runner has already created the working branch off `CLAUDE_BASE_REF`
— do NOT re-branch.

When opening the PR, target the base ref and request the reviewer:

```bash
gh pr create --base "$CLAUDE_BASE_REF" --reviewer "$CLAUDE_REVIEWER" \
  --title "<type>: <summary>" --body "<body>"
```

If `CLAUDE_BASE_PR` is set, this PR is stacked on #$CLAUDE_BASE_PR — say so in the PR body
("Stacked on #$CLAUDE_BASE_PR").

Maintain a tracking comment on the issue, located by the hidden marker
`<!-- claude-pr-stack -->`. Read existing comments with
`gh issue view $ARGUMENTS --json comments`; if a comment contains the marker, update it,
otherwise create it:

```md
<!-- claude-pr-stack -->
## Claude PR stack for #$ARGUMENTS
- [ ] #<base_pr> — <title> (base: <its base>)
- [ ] #<this_pr> — <title> (stacked on #<base_pr>)
```

## Pull request

Open the PR per the Stacking & grouping section (base `$CLAUDE_BASE_REF`, reviewer `$CLAUDE_REVIEWER`).

PR body must include:

```md
## Summary

Closes #$ARGUMENTS

## What changed

- ...

## Validation

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm test`

## Claude checkpoints

- ...

## Superpowers used

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

1. Comment on the issue with the PR link.
2. Add or update labels:

   * remove `claude:in-progress`
   * add `claude:review`
3. Mirror `claude:review` to the issue (so the issue reflects current status without drilling into the PR):

   ```bash
   gh issue edit "$CLAUDE_ISSUE_NUMBER" \
     --repo "$CLAUDE_REPO" \
     --add-label "claude:review" \
     --remove-label "claude:in-progress" || true
   ```
4. Ensure `CLAUDE_REVIEWER` is requested as a reviewer (if `gh pr create` didn't already).
5. Leave a final checkpoint with exact resume instructions.

## Blocker policy

Only mark blocked when continuing would be reckless.

Valid blockers:

* Missing product requirement that changes behavior materially
* Conflicting acceptance criteria
* Missing secrets/credentials
* Destructive operation required
* Existing broken main branch prevents validation
* Test environment cannot run for external reasons

When blocked, comment:

````md
## Claude checkpoint

Issue: #$ARGUMENTS
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
claude "/work-issue $ARGUMENTS"
````

```

Do not use “blocked” for ordinary implementation difficulty. Debug and continue.
```

