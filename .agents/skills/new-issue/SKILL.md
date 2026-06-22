---
name: new-issue
description: Create a GitHub issue with automatic type, size, and queue-readiness classification. Use when the user asks Codex to open, file, create, or queue a new GitHub issue.
---

# New Issue

Create a GitHub issue and classify it automatically. Ask only when classification is genuinely uncertain.

## Input

The user's prompt is the issue description. If it is empty, ask for a one-line description before proceeding.

## Repository

Resolve the repository in this order:

```bash
REPO="${CODEX_REPO:-${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}}"
```

## Classification

### Type

Ask at most once if unclear.

| Signals in description | Label |
| --- | --- |
| "add", "build", "support", "allow", "new", "implement" | `type:feature` |
| "broken", "wrong", "crash", "not working", "fix", "error", "bug" | `type:bug` |
| "document", "note", "update readme", "write docs" | `type:docs` |
| "refactor", "rename", "cleanup", "chore", "reorganize" | `type:chore` |

If the description clearly matches one category, apply it with no question. If unclear, ask once: "Is this a feature, bug, docs change, or chore?"

### Size

Default silently. Never ask.

| Signals | Label |
| --- | --- |
| "small", "quick", "just", "one line", "minor", "tiny" | `size:s` |
| "redesign", "refactor", "multiple", "overhaul", "new page", "large" | `size:l` |
| anything else | `size:m` |

### Queue Readiness

Add `automation:ready` only if the description is specific and actionable with no open product questions. Omit it silently otherwise.

## Title Format

`[PREFIX] <concise title under 60 chars>`

| Type label | Prefix |
| --- | --- |
| `type:feature` | `[FEAT]` |
| `type:bug` | `[FIX]` |
| `type:docs` | `[DOCS]` |
| `type:chore` | `[CHORE]` |

Derive the title from the description. Strip filler words; keep it imperative.

## Create The Issue

```bash
gh issue create \
  --repo "$REPO" \
  --title "[FEAT] Example title" \
  --label "type:feature,size:m,automation:ready" \
  --body "..."
```

Adjust `--title`, `--label`, and `--body` to the classified values.

## Output

Print the created issue URL on a single line. If `automation:ready` was added, include `(queued as automation:ready)`.

If Codex posts a comment to the new issue, end it with:

```md
— Codex
```
