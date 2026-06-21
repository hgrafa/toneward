---
name: new-issue
description: Create a GitHub issue with automatic type/size/queue classification — asks only when genuinely ambiguous
allowed-tools: Bash(gh *), Bash(git *)
---

You are creating a new GitHub issue. Classify it automatically and ask only when the classification is genuinely uncertain.

## Input

`$ARGUMENTS` is the issue description. If empty, ask the user for a one-line description before proceeding.

## Classification

### Type (ask at most once if unclear)

| Signals in description | Label |
|------------------------|-------|
| "add", "build", "support", "allow", "new", "implement" | `type:feature` |
| "broken", "wrong", "crash", "not working", "fix", "error", "bug" | `type:bug` |
| "document", "note", "update readme", "write docs" | `type:docs` |
| "refactor", "rename", "cleanup", "chore", "reorganize" | `type:chore` |

If the description clearly matches one category, apply it with no question. If genuinely unclear, ask **one** question: "Is this a feature, bug, docs change, or chore?" Then proceed with the answer — do not ask again.

### Size (default silently — never ask)

| Signals | Label |
|---------|-------|
| "small", "quick", "just", "one line", "minor", "tiny" | `size:s` |
| "redesign", "refactor", "multiple", "overhaul", "new page", "large" | `size:l` |
| anything else | `size:m` |

### Queue readiness (default to omitted — never ask)

Add `claude:ready` only if the description is specific and actionable with no open product questions (e.g. "Fix the audio slider snapping to wrong values" is actionable; "Improve UX somehow" is not). Omit silently otherwise.

## Title format

`[PREFIX] <concise title under 60 chars>`

| Type label | Prefix |
|------------|--------|
| `type:feature` | `[FEAT]` |
| `type:bug` | `[FIX]` |
| `type:docs` | `[DOCS]` |
| `type:chore` | `[CHORE]` |

Derive the title from the description. Strip filler words; keep it imperative.

## Create the issue

```bash
REPO="${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}"

gh issue create \
  --repo "$REPO" \
  --title "[FEAT] Example title" \
  --label "type:feature,size:m" \
  --body "$ARGUMENTS"
```

Adjust `--title` and `--label` to the classified values. Include `claude:ready` in `--label` if applicable.

## Output

Print the created issue URL on a single line. If `claude:ready` was added:

```
Issue #N created → https://github.com/... (queued as claude:ready)
```

Otherwise:

```
Issue #N created → https://github.com/...
```
