---
name: commit
description: Stage changes and create a conventional commit with a clear message. Use when the user asks Codex to commit, checkpoint, or organize local changes into a reviewable commit.
---

# Commit

Create a well-structured git commit for the current changes.

## Steps

1. Run `git status`, `git diff --staged`, and `git diff` to understand all changes.
2. Run `git log --oneline -5` to match the existing commit message style.
3. Categorize the changes:
   - `feat:` - new functionality
   - `fix:` - bug fix
   - `refactor:` - code restructuring without behavior change
   - `style:` - formatting, whitespace
   - `docs:` - documentation changes
   - `chore:` - build, config, dependencies
   - `test:` - tests only
4. Stage relevant files with `git add <specific files>`. Do not use `git add -A` or `git add .`.
5. Do not stage `.env`, credentials, or secrets. Warn the user if these appear in the diff.
6. Write a commit message:
   - First line: `<type>: <imperative summary>` (max 72 chars)
   - Blank line, then body explaining why when the reason is not obvious.
7. Create the commit.

## Rules

- Always use conventional commit format.
- Write commit messages in English.
- Never amend a previous commit unless explicitly asked.
- Never use `--no-verify`.
- If `pnpm build` has not been run recently, run it before committing.
