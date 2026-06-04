# CI Workflow — Design

**Date:** 2026-06-01
**Status:** Approved
**Scope:** Add continuous-integration checks. No deployment, no dependency automation.

## Problem

The repository has zero automated verification. There is no `.github/` directory and no CI of any kind. Every gate that *could* run a check already exists as a script — `pnpm lint` (Biome), `pnpm build` (`tsc -b` typecheck + Vite build), `pnpm test` (53 Vitest tests) — but nothing runs them automatically.

The project's workflow is PR-based: feature branch → PR → human review → merge. The only existing automation is a Claude Code `PostToolUse` hook that runs `biome check --fix` on edited files. That hook **formats** code; it never typechecks the project or runs the test suite. So a PR can be merged with a type error or a failing test and nothing catches it before the human reviewer does by hand.

The goal is a single status check that turns red when lint, types, or tests break — giving the reviewer trustworthy signal before merging.

## Goals

- A green/red CI status check on every PR targeting `main`.
- Also verify the post-merge state of `main` directly (catch anything that slips through).
- Deterministic installs (pinned pnpm + Node).
- Fast, readable output: one failed step names exactly which gate broke.

## Non-Goals

- No deployment / GitHub Pages publishing.
- No Dependabot or dependency automation.
- No `.claire/` junk cleanup (tracked separately; out of scope here).
- Making the check **required** to merge is a GitHub repo setting (Settings → Branches → branch protection), not a file. It is a manual follow-up, noted but not part of this deliverable.

## Deliverables

### 1. `.github/workflows/ci.yml`

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

Design notes:
- **Triggers** — `pull_request` to `main` gives the per-PR check; `push` to `main` re-verifies the merged result. The Claude Code hooks block direct pushes to `main`, so in practice `push` fires on merge — a useful final gate.
- **`concurrency`** with `cancel-in-progress` stops redundant runs piling up when a branch is pushed several times quickly.
- **`permissions: contents: read`** — least privilege; the job only needs to read the code.
- **`pnpm/action-setup@v4` with no `version`** — it reads the pnpm version from the `packageManager` field in `package.json` (added below). This avoids hardcoding a version in two places.
- **Node 24** — current LTS. Local dev is on Node 26; Vite 7 requires Node ≥ 20.19 / ≥ 22.12, so 24 is a safe, supported floor.
- **`cache: pnpm`** — caches the pnpm store keyed on the lockfile for faster installs.
- **`--frozen-lockfile`** — fails if `pnpm-lock.yaml` is out of sync, ensuring reproducible installs.
- **Separate named steps** for lint / build / test — a red run points straight at the broken gate.

### 2. `package.json` — add `packageManager`

The repo has no `packageManager` field. Add one so `pnpm/action-setup` resolves the right pnpm version, and so any human/Corepack contributor uses the same one:

```json
"packageManager": "pnpm@11.5.0"
```

(11.5.0 is the version in use locally; lockfile is v9, which requires pnpm ≥ 9.)

### 3. `pnpm-workspace.yaml` — approve dependency build scripts

**Discovered during implementation.** pnpm 11 treats unreviewed dependency build scripts as a **fatal error**: `pnpm install --frozen-lockfile` exits 1 with `ERR_PNPM_IGNORED_BUILDS` for `esbuild` and `msw`. This would fail the CI "Install dependencies" step on every run. (The masking earlier was a piped `tail` swallowing the real exit code.)

The repo already tracks a `pnpm-workspace.yaml` (inherited from the prior merge) but with a malformed auto-generated stub — `allowBuilds` keys set to placeholder strings (`"set this to true or false"`) — which pnpm ignores, so the error persists. The fix is to set real boolean approvals:

```yaml
allowBuilds:
  esbuild: true
  msw: true
```

`allowBuilds` (a `package: boolean` map) is pnpm's current mechanism (v10.26+). The legacy `onlyBuiltDependencies` array is deprecated in v11 and does **not** suppress the error on its own, so it is removed. Verified locally: with this file a clean `pnpm install --frozen-lockfile` (no `node_modules`) exits 0 and esbuild's binary is built. Both `esbuild` (Vite/Vitest) and `msw` (test mocking) are trusted dev dependencies, so approving their scripts is correct.

## Verification

- **Self-test:** opening the PR for this branch triggers the workflow; it must pass (lint + build + test all green on the current tree, which is already clean — 53 tests passing).
- **Negative check (manual, optional):** a deliberately broken commit (e.g., a type error) should turn the run red on the "Typecheck and build" step. Not committed — just the expected behavior.

## Follow-up (not in this deliverable)

After the PR merges, in GitHub → Settings → Branches, add a branch protection rule on `main` requiring the `check` job to pass before merge. This is what converts the signal into an actual gate.
