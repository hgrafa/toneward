# Issue Triage, New-Issue Classifier + Label Mirroring — Design

Date: 2026-06-20
Status: approved
Area: autonomous issue-handoff tooling (`.claude/skills/`, `scripts/claude/`)

## Problem

Three gaps in the current autonomous workflow:

1. **No structured intake for new issues.** Creating a GitHub issue requires manually choosing labels
   (type, size, `claude:ready`). Classification is inconsistent and friction causes issues to be
   filed without labels, making them invisible to the runner.

2. **Issue comments are invisible to the system.** When a user leaves feedback directly on an issue
   ("still not happy with this", "could you make it more like X"), the runner never sees it — it
   only watches `claude:revise` on PRs and `claude:ready` on issues. This means valid rework
   requests are silently dropped.

3. **No status visibility at the issue level.** Once the runner opens a PR, the issue label stays
   at `claude:review` forever (or whatever it was last set to). Checking the actual status requires
   navigating to the PR — the issue gives no live signal.

## Goals

- A `/new-issue` skill that classifies type, size, and queue-readiness automatically, asking only
  when genuinely ambiguous.
- A `/review-issues` skill that reads open issue comments, scores confidence on what action is
  needed, acts on clear items autonomously, and asks the user only for ambiguous ones — during
  the skill run.
- Label mirroring: issue labels reflect PR status automatically, with no new command required.

## Non-goals (YAGNI)

- GitHub Action for event-driven label sync (could follow; out of scope here).
- Multi-repo support.
- Notification or Slack integration.
- Closing issues automatically.

---

## Component 1: `/new-issue` skill

### Invocation

```
/new-issue "Add a dark mode toggle"
/new-issue                          # Claude prompts for description if empty
```

### Classification rules

| Dimension | Signal → Label | Default when ambiguous |
|-----------|---------------|----------------------|
| **Type** | "add", "build", "support", "allow" → `type:feature`; "broken", "wrong", "crash", "not working", "fix", "error" → `type:bug`; "document", "note", "update readme" → `type:docs`; "refactor", "rename", "cleanup", "chore" → `type:chore` | Ask |
| **Size** | "small", "quick", "just", "one line", "minor" → `size:s`; "redesign", "refactor", "multiple", "overhaul", "new page" → `size:l`; else → `size:m` | `size:m` (no question) |
| **Ready** | Description is specific and actionable with no open questions → add `claude:ready`. Vague/exploratory → omit. | Omit (no question) |

**Confidence gate**: if type AND size are both clear, create immediately with no questions. Ask at
most one question if type is ambiguous. Size defaults silently to `m`; `claude:ready` defaults
silently to omitted.

### Issue title format

Follows existing project convention: `[FEAT] Dark mode toggle`, `[FIX] Speed slider snaps wrong`.
Prefix derived from type: `FEAT` / `FIX` / `DOCS` / `CHORE`.

### Output

Prints the created issue URL. If `claude:ready` was added, notes it:
> `Issue #N created → https://... (queued as claude:ready)`

---

## Component 2: `/review-issues` skill

### Invocation

```
/review-issues          # all open issues
/review-issues 9        # one specific issue
```

### Intake

For each issue:
1. `gh issue view N --comments` — full body + comment thread.
2. `gh pr list --search "closes #N OR fixes #N in:body" --state open` — find linked PR if any.
3. Current labels via `gh issue view N --json labels`.

### Comment scoring

**Noise to skip**: runner checkpoint comments (`## Claude runner checkpoint`, `## Claude automatic
session checkpoint`). These are machine-posted and carry no user intent.

**Signals to score** (comments by repo owner / collaborators only):

| Signal | Confidence | Inferred action |
|--------|-----------|----------------|
| Dissatisfaction: "not happy", "still not right", "I don't like", "could you", "please change", image attached showing desired outcome | High | If linked PR exists and feedback is about the PR's work → add `claude:revise` to PR, remove `claude:review` from PR. If no linked PR or feedback spawns new work → add `claude:ready` to issue, remove `claude:review`/`claude:in-progress` from issue. |
| Satisfaction: "looks good", "approved", "lgtm", "perfect", "exactly" | High | No action; mark as satisfied in digest. |
| Question/blocker: "what about", "how should", "should we" — directed at Claude | High | Add `claude:blocked`; note in digest for human follow-up. |
| Informational / vague | Low | Ask user for intent (one question per item). |

### Autonomous path (high confidence)

Apply label changes immediately via `gh issue edit` / `gh pr edit`. Post a brief comment on the
issue:

> `## /review-issues triage\nDetected: user dissatisfaction with current result.\nAction: added claude:revise to PR #N.`

### Ask path (low confidence)

Collect all ambiguous items first, then ask one question per item inline during the skill run.
Wait for the answer before acting. Never batch ambiguous items into one multi-part question.

### Final digest

After processing all issues, print:

```
Reviewed N issues:
  #9  — queued claude:revise on PR #10 (user dissatisfaction detected)
  #11 — no action (satisfied)
  #13 — asked you about intent → [your answer] → added claude:ready
```

---

## Component 3: Label mirroring (no new command)

The issue is the status dashboard. Whenever a PR status label changes, the linked issue is updated
to match. Implemented as additions to existing skills and the runner — no new files.

### Label ownership

| Label | Owner | Mirrored |
|-------|-------|---------|
| `claude:ready` | Issue only | No — queue signal, stays on issue |
| `claude:in-progress` | Both | Runner sets on issue at dispatch; also set on PR |
| `claude:review` | PR → Issue | Skills set on PR after PR open; also set on issue |
| `claude:blocked` | PR → Issue | Skills/runner set on PR; also set on issue |
| `claude:revise` | PR only | No — runner dispatch signal, meaningless on issue |

### Where mirroring is added

**`work-issue` skill** (`## Handoff` section): after `gh pr edit --add-label claude:review` on the
PR, add a second `gh issue edit $CLAUDE_ISSUE_NUMBER --add-label claude:review --remove-label
claude:in-progress` call.

**`address-review` skill** (`## Handoff` section): same — after setting `claude:review` on the PR,
mirror to the issue. Resolve issue number via `gh pr view $ARGUMENTS --json closingIssuesReferences`
or `gh pr view $ARGUMENTS --json body` (parse `Closes #N`).

**Runner `dispatch_new`** (`run-next-issue.sh`): already sets `claude:in-progress` on the issue.
Also set `claude:in-progress` on the PR immediately when the branch is created (if a PR already
exists for a stacked slice).

**Runner `dispatch_revise`** (`run-next-issue.sh`): already sets `claude:in-progress` on the PR.
Also resolve the linked issue (via `gh pr view "$PR" --json closingIssuesReferences`) and set
`claude:in-progress` on it.

### Issue number resolution helper

Both skills need to find the issue number from a PR. Standard lookup:

```bash
gh pr view "$PR_NUMBER" --repo "$REPO" \
  --json closingIssuesReferences \
  --jq '.closingIssuesReferences[0].number // empty'
```

Fallback: parse `Closes #N` / `Fixes #N` from the PR body with `grep -oiE '(closes|fixes) #[0-9]+'`.

---

## Error handling

- **`/new-issue` with no description and no stdin**: ask once; if still empty, exit with guidance.
- **`/review-issues` on an issue with no owner comments**: skip, note "no user comments" in digest.
- **Label already present**: `gh issue edit --add-label` is idempotent; no error.
- **Linked issue not found** (label mirroring): log a warning, do not fail the PR flow.
- **Ambiguous comment, user answers "skip"**: note it in digest, no action taken.

## Testing

- `bash -n` on any modified shell scripts.
- Skills are prompt files — no unit tests. Manual E2E:
  - `/new-issue "Fix the audio slider not snapping"` → confirm `type:bug size:m` applied with no
    questions asked.
  - `/new-issue "Something"` → confirm Claude asks for type clarification.
  - Leave a "not happy" comment on a test issue → run `/review-issues` → confirm `claude:ready`
    or `claude:revise` is applied and a triage comment is posted.
  - Open a PR that closes an issue → confirm issue gets `claude:review` after `work-issue` handoff.
