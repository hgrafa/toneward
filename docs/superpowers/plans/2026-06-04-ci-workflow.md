# CI Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI workflow that runs lint, typecheck/build, and tests on every PR to `main` and on push to `main`.

**Architecture:** A single workflow file (`.github/workflows/ci.yml`) with one job that installs deps with a pinned toolchain and runs the existing `pnpm` scripts as separate named steps. A `packageManager` field in `package.json` pins pnpm so `pnpm/action-setup` resolves it without a hardcoded version.

**Tech Stack:** GitHub Actions, pnpm 11.5.0, Node 24, Biome, TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-ci-workflow-design.md`

**Note on "tests":** A CI workflow cannot be unit-tested locally (no `act`/`actionlint` on this machine, and no local Actions runner). "Verification" here means: (a) the file is well-formed YAML, and (b) the exact commands the workflow encodes all pass locally — that is what proves the workflow body is correct. The genuine end-to-end test is the Actions run that fires when the PR is opened (see Final Verification).

---

### Task 1: Pin the package manager

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Confirm there is no `packageManager` field yet**

Run: `grep -n packageManager package.json || echo "absent"`
Expected: `absent`

- [ ] **Step 2: Add the `packageManager` field**

Edit `package.json`. The file uses **tabs** for indentation — match that exactly. Insert the new line between `"type": "module",` and `"scripts": {`:

```json
	"type": "module",
	"packageManager": "pnpm@11.5.0",
	"scripts": {
```

- [ ] **Step 3: Verify the file is still valid JSON and the field reads back correctly**

Run: `node -p "require('./package.json').packageManager"`
Expected: `pnpm@11.5.0`

- [ ] **Step 4: Verify the install still resolves cleanly with the pinned manager**

Run: `pnpm install --frozen-lockfile`
Expected: exits 0. (A `pnpm-lock.yaml` would only change if dependencies changed — none did. If git shows the lockfile modified after this, revert it: `git checkout pnpm-lock.yaml`.)

- [ ] **Step 5: Confirm the lockfile was not modified**

Run: `git status --porcelain pnpm-lock.yaml`
Expected: no output (lockfile unchanged).

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "build: pin pnpm via packageManager field

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Approve dependency build scripts (CI install fix)

**Files:**
- Modify: `pnpm-workspace.yaml`

**Why:** pnpm 11 makes `pnpm install --frozen-lockfile` exit **1** (`ERR_PNPM_IGNORED_BUILDS`) for `esbuild` and `msw` unless their build scripts are explicitly approved. Without this, the CI "Install dependencies" step fails on every run. The repo already tracks `pnpm-workspace.yaml` but with a malformed auto-generated stub (`allowBuilds` keys set to placeholder strings), which pnpm ignores.

- [ ] **Step 1: Confirm the bug reproduces**

Run: `pnpm install --frozen-lockfile; echo "EXIT: $?"`
Expected: ends with `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@..., msw@...` and `EXIT: 1`. (Do NOT pipe through `tail`/`head` — that masks the exit code.)

- [ ] **Step 2: Replace `pnpm-workspace.yaml` with real boolean approvals**

Set the file content to exactly:

```yaml
allowBuilds:
  esbuild: true
  msw: true
```

`allowBuilds` (a `package: boolean` map) is pnpm's current mechanism (v10.26+). Remove the deprecated `onlyBuiltDependencies` array and the placeholder `allowBuilds` strings — they do not suppress the error.

- [ ] **Step 3: Verify a clean install now exits 0 (simulate CI: no node_modules)**

Run: `rm -rf node_modules && pnpm install --frozen-lockfile; echo "EXIT: $?"`
Expected: `Done in ...` and `EXIT: 0`. No `ERR_PNPM_IGNORED_BUILDS`.

- [ ] **Step 4: Verify the build script actually ran (esbuild binary present)**

Run: `ls node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild && echo "esbuild OK"`
Expected: a path is printed, then `esbuild OK`.

- [ ] **Step 5: Confirm the lockfile was not modified**

Run: `git status --porcelain pnpm-lock.yaml`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "build: approve esbuild and msw build scripts

pnpm 11 fails install with ERR_PNPM_IGNORED_BUILDS unless dependency
build scripts are explicitly approved. Replaces the malformed
auto-generated stub with real boolean approvals so CI install exits 0.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add the CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci.yml` with exactly this content:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck and build
        run: pnpm build

      - name: Test
        run: pnpm test
```

- [ ] **Step 2: Verify the file is well-formed YAML**

Run: `pnpm dlx js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML OK"`
Expected: `YAML OK` (js-yaml parses the file and exits 0; it errors loudly on malformed YAML). This downloads `js-yaml` on demand — network access is required.

- [ ] **Step 3: Verify the lint gate passes locally (mirrors the "Lint" step)**

Run: `pnpm lint`
Expected: Biome reports no errors; exits 0.

- [ ] **Step 4: Verify the build/typecheck gate passes locally (mirrors the "Typecheck and build" step)**

Run: `pnpm build`
Expected: `tsc -b` reports no type errors, Vite build completes and writes `dist/`; exits 0.

- [ ] **Step 5: Verify the test gate passes locally (mirrors the "Test" step)**

Run: `pnpm test`
Expected: `53 passed (53)`; exits 0.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, and test workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification (end-to-end, happens at PR time)

These are not committable steps — they confirm the workflow actually runs on GitHub, which is the real test:

1. Push the branch and open the PR (handled by the finishing-a-development-branch skill).
2. Confirm the **CI / check** run appears on the PR and goes **green**. Watch it: `gh pr checks --watch`.
3. The tree is already clean (lint/build/test all pass locally), so a green run confirms the workflow is wired correctly.

## Follow-up (out of scope, manual)

After merge: GitHub → Settings → Branches → add a branch protection rule on `main` requiring the `check` job. This converts the signal into an enforced gate. Not part of this plan's deliverables.
