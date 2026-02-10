---
name: commit
description: Stage changes and create a conventional commit with a clear message
---

# Commit

Create a well-structured git commit for the current changes.

## Steps

1. Run `git status` and `git diff --staged` and `git diff` to understand all changes
2. Run `git log --oneline -5` to match the existing commit message style
3. Analyze the changes and categorize them:
   - `feat:` — new functionality
   - `fix:` — bug fix
   - `refactor:` — code restructuring without behavior change
   - `style:` — formatting, whitespace (should be rare since Biome handles this)
   - `docs:` — documentation changes
   - `chore:` — build, config, dependencies
4. Stage the relevant files with `git add <specific files>` — never use `git add -A` or `git add .`
5. Do NOT stage `.env`, credentials, or secrets — warn the user if these appear in the diff
6. Write a commit message:
   - First line: `<type>: <imperative summary>` (max 72 chars)
   - Blank line, then body explaining **why** (not what) if the change isn't obvious
7. Create the commit

## Rules

- Always use conventional commit format
- Message in English
- Never amend a previous commit unless explicitly asked
- Never use `--no-verify`
- If `pnpm build` hasn't been run recently, run it first to catch type errors before committing