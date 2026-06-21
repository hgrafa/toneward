# Issue Triage, New-Issue Classifier + Label Mirroring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/new-issue` and `/review-issues` Claude skills plus automatic label mirroring from PR → issue so the issue is always the live status dashboard.

**Architecture:** Three new skill prompt files + small additions to two existing skill files and the runner. All label-state transitions already happen in known places (`work-issue` Handoff, `address-review` Handoff, `dispatch_revise` in the runner); mirroring is a 2-4 line addition at each site. The two new skills are markdown prompt files with no compiled code — they are tested manually via `gh` CLI calls.

**Tech Stack:** Bash (`gh` CLI, `git`), Markdown skill files, existing `.claude/skills/` convention.

## Global Constraints

- Skills live in `.claude/skills/<name>/SKILL.md`. The `.claude/` dir is gitignored; new skill directories need `git add -f` on first commit.
- `allowed-tools` frontmatter in every skill must list only tools the skill actually uses.
- `CLAUDE_REPO` is exported by the runner; inside skills it is always available. For interactive use (skill invoked outside the runner), fall back: `git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/'`.
- `gh label create --add-label` is idempotent (duplicate label → no error with `|| true`).
- All `gh` label edits use `--remove-label X || true` — the label may not be present and that is fine.
- Skills are prompt files: no unit tests. Validation = `bash -n` on shell snippets in the plan + manual E2E documented at the end of each task.
- Commit message style: conventional commits (`feat:`, `fix:`, `chore:`).

---

### Task 1: `/new-issue` skill

**Files:**
- Create: `.claude/skills/new-issue/SKILL.md`

**Interfaces:**
- Produces: a new GitHub issue with `type:*`, `size:*`, optionally `claude:ready` labels applied; title in `[PREFIX] title` format.

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p .claude/skills/new-issue
```

Create `.claude/skills/new-issue/SKILL.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Force-add the new skill (gitignored parent directory)**

```bash
git add -f .claude/skills/new-issue/SKILL.md
git status  # confirm the file is staged
```

Expected: `new file: .claude/skills/new-issue/SKILL.md` in staged changes.

- [ ] **Step 3: Manual smoke test (read-only)**

```bash
# Verify the skill file is well-formed YAML front matter
head -6 .claude/skills/new-issue/SKILL.md
```

Expected output:
```
---
name: new-issue
description: Create a GitHub issue with automatic type/size/queue classification — asks only when genuinely ambiguous
allowed-tools: Bash(gh *), Bash(git *)
---
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add /new-issue skill with automatic type/size classifier"
```

**Manual E2E (run after merge to main):**
- Run `/new-issue "Fix the audio slider not snapping to correct values"` → expect `[FIX]` title, `type:bug`, `size:m`, `claude:ready` added (specific+actionable), no questions asked.
- Run `/new-issue "Something"` → expect Claude asks "Is this a feature, bug, docs change, or chore?" once, then creates the issue.

---

### Task 2: `/review-issues` skill

**Files:**
- Create: `.claude/skills/review-issues/SKILL.md`

**Interfaces:**
- Consumes: open GitHub issues and their comments via `gh issue view --comments`.
- Produces: label changes on issues/PRs + triage comments; prints a final digest.

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p .claude/skills/review-issues
```

Create `.claude/skills/review-issues/SKILL.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Force-add the new skill**

```bash
git add -f .claude/skills/review-issues/SKILL.md
git status  # confirm staged
```

Expected: `new file: .claude/skills/review-issues/SKILL.md`

- [ ] **Step 3: Manual smoke test (read-only)**

```bash
head -6 .claude/skills/review-issues/SKILL.md
```

Expected:
```
---
name: review-issues
description: Analyze open issue comments with confidence scoring — act on clear feedback autonomously, ask user only for ambiguous items
allowed-tools: Bash(gh *), Bash(git *)
---
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add /review-issues skill with confidence-scored comment triage"
```

**Manual E2E (run after merge to main):**
- On issue #9 (which has "not happy" and "Still not enough" comments): run `/review-issues 9` → expect `claude:revise` added to linked PR #10, triage comment posted, digest printed.
- On an issue with only checkpoint comments: run `/review-issues N` → expect "no scoreable user comments, skipped".

---

### Task 3: Label mirroring in `work-issue`, `address-review`, and runner

**Files:**
- Modify: `.claude/skills/work-issue/SKILL.md` (Handoff section, lines 302–310)
- Modify: `.claude/skills/address-review/SKILL.md` (Handoff section, lines 44–52)
- Modify: `scripts/claude/run-next-issue.sh` (`dispatch_revise` function, after label flip ~line 334)

**Interfaces:**
- Consumes: `CLAUDE_ISSUE_NUMBER` (work-issue), `$ARGUMENTS` as PR number (address-review), `$PR` (runner dispatch_revise).
- Produces: `claude:review` or `claude:in-progress` mirrored to the linked issue.

- [ ] **Step 1: Add mirroring to `work-issue` Handoff**

In `.claude/skills/work-issue/SKILL.md`, find the `## Pull request` → `After opening PR` section. After step 2 (the label swap block that removes `claude:in-progress` and adds `claude:review`), add:

```markdown
3. Mirror `claude:review` to the issue (so the issue reflects current status without drilling into the PR):

   ```bash
   gh issue edit "$CLAUDE_ISSUE_NUMBER" \
     --repo "$CLAUDE_REPO" \
     --add-label "claude:review" \
     --remove-label "claude:in-progress" || true
   ```
```

The existing step 3 ("Ensure `CLAUDE_REVIEWER` is requested...") becomes step 4, and step 4 ("Leave a final checkpoint...") becomes step 5.

- [ ] **Step 2: Add mirroring to `address-review` Handoff**

In `.claude/skills/address-review/SKILL.md`, find the `## Handoff` section. After step 4 (the label swap: remove `claude:in-progress`, add `claude:review`), add a new step 5:

```markdown
5. Mirror `claude:review` to the linked issue:

   ```bash
   # Resolve the linked issue number from PR closing references
   LINKED_ISSUE="$(gh pr view "$ARGUMENTS" --repo "$CLAUDE_REPO" \
     --json closingIssuesReferences \
     --jq '.closingIssuesReferences[0].number // empty' 2>/dev/null || true)"

   # Fallback: parse "Closes #N" / "Fixes #N" from PR body
   if [[ -z "$LINKED_ISSUE" ]]; then
     LINKED_ISSUE="$(gh pr view "$ARGUMENTS" --repo "$CLAUDE_REPO" --json body --jq '.body' \
       | grep -oiE '(closes|fixes) #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
   fi

   if [[ -n "$LINKED_ISSUE" ]]; then
     gh issue edit "$LINKED_ISSUE" --repo "$CLAUDE_REPO" \
       --add-label "claude:review" \
       --remove-label "claude:in-progress" || true
   fi
   ```

   If the linked issue cannot be resolved, log a warning and continue — do not fail the handoff.
```

The existing step 5 (Re-request review) stays as step 6.

- [ ] **Step 3: Add mirroring to runner `dispatch_new` (stacked case)**

In `scripts/claude/run-next-issue.sh`, inside `dispatch_new()`, after the line that sets `claude:in-progress` on the issue (~line 251):

```bash
echo "Updating issue labels..."
run gh issue edit "$ISSUE_NUMBER" \
    --repo "$REPO" \
    --remove-label "$READY_LABEL" \
    --add-label "$IN_PROGRESS_LABEL" || true
```

Add (immediately after):

```bash
# If stacking on an existing PR, mirror in-progress there too so the stack is visibly active.
if [[ -n "${BASE_PR:-}" ]]; then
    run gh pr edit "$BASE_PR" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
fi
```

- [ ] **Step 4: Add mirroring to runner `dispatch_revise`**

In `scripts/claude/run-next-issue.sh`, inside `dispatch_revise()`, after the line:

```bash
run gh pr edit "$PR" --repo "$REPO" \
    --remove-label "$REVISE_LABEL" --add-label "$IN_PROGRESS_LABEL" || true
```

Add:

```bash
# Mirror claude:in-progress to the linked issue so the issue reflects active work.
local LINKED_ISSUE
LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json closingIssuesReferences \
    --jq '.closingIssuesReferences[0].number // empty' 2>/dev/null || true)"
if [[ -z "$LINKED_ISSUE" ]]; then
    LINKED_ISSUE="$(gh pr view "$PR" --repo "$REPO" --json body --jq '.body' \
        | grep -oiE '(closes|fixes) #[0-9]+' | grep -oE '[0-9]+' | head -1 || true)"
fi
if [[ -n "$LINKED_ISSUE" ]]; then
    run gh issue edit "$LINKED_ISSUE" --repo "$REPO" --add-label "$IN_PROGRESS_LABEL" || true
fi
```

- [ ] **Step 5: Syntax-check the runner**

```bash
bash -n scripts/claude/run-next-issue.sh && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 6: Dry-run the runner to confirm it still selects queues correctly**

```bash
DRY_RUN=1 bash scripts/claude/run-next-issue.sh 2>&1 | tail -5
```

Expected: `Nothing to do (no claude:revise PRs, no claude:ready issues).` (or a dry-run dispatch line if a queue item exists).

- [ ] **Step 7: Commit all mirroring changes together**

```bash
git add -f .claude/skills/work-issue/SKILL.md .claude/skills/address-review/SKILL.md
git add scripts/claude/run-next-issue.sh
git commit -m "feat: mirror PR status labels to linked issue for live status dashboard"
```

**Manual E2E (run after merge to main):**
- Work an issue via the runner → after PR opens and `claude:review` is set on PR, confirm the issue also shows `claude:review`.
- Trigger `dispatch_revise` via runner → confirm the linked issue gets `claude:in-progress`.
- After `address-review` completes and flips PR back to `claude:review`, confirm issue also updates.
