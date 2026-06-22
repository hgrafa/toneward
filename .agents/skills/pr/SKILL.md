---
name: pr
description: Create, update, or inspect pull requests with GitHub CLI. Use when the user asks Codex to open a PR, update a PR, check PR status, or prepare a branch for review.
---

# Pull Request Management

Manage PRs using the GitHub CLI (`gh`).

## Create a PR

Default to creating a PR when no specific action is given.

1. Run `git status` to check for uncommitted changes. Commit them first with `$commit` if needed.
2. Identify the current branch and base branch, usually `main`.
3. Run `git log main..HEAD --oneline` to see branch commits.
4. Run `git diff main...HEAD` to understand the full scope.
5. Push the branch if needed: `git push -u origin <branch>`.
6. Create the PR with `gh pr create`.

PR title:

- Short, imperative, max 70 chars.

PR body:

```md
## Summary

- ...

## What changed

- ...

## Validation

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm test`

## Codex checkpoints

Relevant issue/PR comments:
- ...

## Review notes

Focus on:
- Architecture boundaries
- Music theory correctness
- UI regressions
- Tests

## Known limitations

- ...
```

## Other Actions

- PR status: run `gh pr status`, then `gh pr checks` for the current branch if there is a PR.
- View PR details: run `gh pr view <number>`; run `gh pr diff <number>` only when needed.
- Update after review: read `gh pr view`, inspect review comments, apply changes, commit, and push.

## Rules

- Never force push unless explicitly asked.
- Never push directly to `main`, `master`, `production`, or `prod`.
- Always push to a feature branch first.
- PR descriptions must be in English.
- If the repo has no remote yet, tell the user to set one up first.
- Any GitHub comment posted by Codex must end with `— Codex`.
