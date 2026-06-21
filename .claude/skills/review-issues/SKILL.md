---
name: review-issues
description: Analyze open issue comments with confidence scoring — act on clear feedback autonomously, ask user only for ambiguous items
allowed-tools: Bash(gh *), Bash(git *)
---

You are reviewing GitHub issues and their comments to detect unaddressed feedback and triage accordingly.

## Intake

```bash
REPO="${CLAUDE_REPO:-$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')}"
```

If `$ARGUMENTS` is a number, review only that issue:

```bash
gh issue view "$ARGUMENTS" --repo "$REPO" --comments \
  --json number,title,labels,comments
```

Otherwise, fetch all open issues then review each:

```bash
gh issue list --repo "$REPO" --state open --json number,title,labels \
  --jq '.[].number'
# Then for each number N:
gh issue view N --repo "$REPO" --comments \
  --json number,title,labels,comments
```

For each issue, also find its linked PR:

```bash
gh pr list --repo "$REPO" --state open \
  --search "closes #N in:body OR fixes #N in:body" \
  --json number,labels --jq '.[0] // empty'
```

## Noise filter

Skip these comments entirely when scoring — they carry no user intent:
- Body contains `## Claude runner checkpoint`
- Body contains `## Claude automatic session checkpoint`
- Body contains `## Claude checkpoint`
- Body contains `## /review-issues triage`

## Confidence scoring

Score each non-noise comment from the repo owner or collaborators:

| Signal (case-insensitive) | Confidence | Inferred action |
|---------------------------|-----------|----------------|
| "not happy", "still not right", "I don't like", "could you", "please change", "not what I wanted", image URL attached alongside dissatisfaction language | **High** | Dissatisfaction → see Dissatisfaction path |
| "looks good", "approved", "lgtm", "perfect", "exactly", "great", "ship it" | **High** | Satisfied → no action |
| "what about", "how should", "should we", direct question at Claude about direction | **High** | Blocker → add `claude:blocked` |
| Everything else | **Low** | Ask path |

## Dissatisfaction path (high confidence)

If a linked open PR exists for this issue:

```bash
gh pr edit <PR_NUMBER> --repo "$REPO" \
  --add-label "claude:revise" \
  --remove-label "claude:review" || true
```

If no linked PR (or the dissatisfaction spawns entirely new work):

```bash
gh issue edit <ISSUE_NUMBER> --repo "$REPO" \
  --add-label "claude:ready" \
  --remove-label "claude:review" \
  --remove-label "claude:in-progress" || true
```

After either, post a triage comment on the issue:

```bash
gh issue comment <ISSUE_NUMBER> --repo "$REPO" --body "## /review-issues triage

Detected: user dissatisfaction with current result.
Action: added \`claude:revise\` to PR #<PR_NUMBER>."
# or: "Action: re-queued issue as \`claude:ready\`."
```

## Blocker path (high confidence)

```bash
gh issue edit <ISSUE_NUMBER> --repo "$REPO" \
  --add-label "claude:blocked" \
  --remove-label "claude:in-progress" || true
gh issue comment <ISSUE_NUMBER> --repo "$REPO" --body "## /review-issues triage

Detected: open question blocking progress.
Quote: \"<verbatim question from comment>\"
Action: added \`claude:blocked\`. Human follow-up needed."
```

## Ask path (low confidence)

Collect **all** low-confidence items first — do not interleave questions with actions.

Then for each ambiguous item, ask **one question** and wait for the answer before acting. Never combine two ambiguous items into one question.

Example question:
> "Issue #13 has this comment: \"We might want to think about accessibility here.\" Should I: (a) re-queue as claude:ready, (b) ignore it for now, or (c) mark as blocked?"

## Final digest

After processing all issues, print:

```
Reviewed N issues:
  #9  — added claude:revise to PR #10 (dissatisfaction detected)
  #11 — no action (satisfied)
  #13 — asked about intent → re-queued as claude:ready
  #14 — no scoreable user comments, skipped
```
