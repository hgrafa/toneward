---
name: review-issues
description: Analyze open GitHub issue comments with confidence scoring, triage clear feedback autonomously, and ask only for ambiguous items. Use when the user asks Codex to review issues, triage issue comments, or maintain the issue queue.
---

# Review Issues

Review GitHub issues and comments to detect unaddressed feedback and triage accordingly.

## Intake

Resolve the repository:

```bash
REPO="${CODEX_REPO:-${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}}"
```

If the user provides an issue number, review only that issue:

```bash
gh issue view "$ISSUE" --repo "$REPO" --comments \
  --json number,title,labels,comments
```

Otherwise, fetch all open issues and review each:

```bash
gh issue list --repo "$REPO" --state open --json number,title,labels --jq '.[].number'
gh issue view "$N" --repo "$REPO" --comments --json number,title,labels,comments
```

For each issue, find its linked PR:

```bash
gh pr list --repo "$REPO" --state open \
  --search "closes #$N in:body OR fixes #$N in:body" \
  --json number,labels --jq '.[0] // empty'
```

## Noise Filter

Skip these comments when scoring:

- Body contains `## Claude runner checkpoint`
- Body contains `## Claude automatic session checkpoint`
- Body contains `## Claude checkpoint`
- Body contains `## Codex runner checkpoint`
- Body contains `## Codex automatic session checkpoint`
- Body contains `## Codex checkpoint`
- Body contains `## /review-issues triage`
- Body contains `## $review-issues triage`

## Confidence Scoring

Score each non-noise comment from the repo owner or collaborators.

| Signal (case-insensitive) | Confidence | Inferred action |
| --- | --- | --- |
| "not happy", "still not right", "I don't like", "could you", "please change", "not what I wanted", image URL attached alongside dissatisfaction language | High | Dissatisfaction |
| "looks good", "approved", "lgtm", "perfect", "exactly", "great", "ship it" | High | Satisfied |
| "what about", "how should", "should we", direct question at Codex about direction | High | Blocker |
| Everything else | Low | Ask |

## Dissatisfaction Path

If a linked open PR exists:

```bash
gh pr edit "$PR_NUMBER" --repo "$REPO" \
  --add-label "automation:revise" \
  --remove-label "automation:review" || true
```

If no linked PR exists, or the dissatisfaction spawns new issue-level work:

```bash
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --add-label "automation:ready" \
  --remove-label "automation:review" \
  --remove-label "automation:in-progress" || true
```

Post a triage comment:

```md
## $review-issues triage

Detected: user dissatisfaction with current result.
Action: added `automation:revise` to PR #<PR_NUMBER>.

— Codex
```

Or:

```md
## $review-issues triage

Detected: user dissatisfaction with current result.
Action: re-queued issue as `automation:ready`.

— Codex
```

## Blocker Path

```bash
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --add-label "automation:blocked" \
  --remove-label "automation:in-progress" || true
```

Post a blocker comment:

```md
## $review-issues triage

Detected: open question blocking progress.
Quote: "<verbatim question from comment>"
Action: added `automation:blocked`. Human follow-up needed.

— Codex
```

## Ask Path

Collect all low-confidence items first. Do not interleave questions with actions.

For each ambiguous item, ask one question and wait for the answer before acting. Never combine two ambiguous items into one question.

## Final Digest

After processing all issues, print:

```text
Reviewed N issues:
  #9  - added automation:revise to PR #10 (dissatisfaction detected)
  #11 - no action (satisfied)
  #13 - asked about intent -> re-queued as automation:ready
  #14 - no scoreable user comments, skipped
```
