---
name: pr
description: Create, update, or manage pull requests via GitHub CLI
---

# Pull Request Management

Manage PRs using the GitHub CLI (`gh`).

## Actions

### Create a PR (default when no argument given)

1. Run `git status` to check for uncommitted changes — commit them first using the `/commit` skill if needed
2. Identify the current branch and the base branch (usually `main`)
3. Run `git log main..HEAD --oneline` to see all commits in this branch
4. Run `git diff main...HEAD` to understand the full scope of changes
5. Push the branch if not already pushed: `git push -u origin <branch>`
6. Create the PR with `gh pr create`:
   - **Title**: Short, imperative (max 70 chars)
   - **Body**:
     ```
     ## Summary
     <1-3 bullet points describing what and why>

     ## Changes
     <list of key changes by file/module>

     ## Test plan
     - [ ] `pnpm build` passes
     - [ ] <specific things to verify>
     ```

### Check PR status (`/pr status`)

1. Run `gh pr status` to show current PRs
2. Run `gh pr checks` if there's a PR for the current branch

### View PR details (`/pr view <number>`)

1. Run `gh pr view <number>` for the summary
2. Run `gh pr diff <number>` if the user wants to see changes
3. Run `gh api repos/{owner}/{repo}/pulls/<number>/comments` for review comments

### Update PR after review (`/pr update`)

1. Run `gh pr view` to get current PR info and review comments
2. Show the user what reviewers requested
3. After changes are made and committed, push with `git push`

## Rules

- Never force push unless explicitly asked
- Never push directly to main/master/prod branches
- Always push to a feature branch first
- PR description in English
- If the repo has no remote yet, tell the user to set one up first