# Test - Vitest Setup

## Files

- `setup.ts` - global test setup: jest-dom matchers, RTL cleanup, and a jsdom `localStorage`/`sessionStorage` patch (Node exposes a non-functional global that shadows jsdom's).
- `smoke.test.ts` - trivial harness sanity check.

## Conventions

- Tests live next to their subject (`*.test.ts[x]`), not in this folder; this folder is only shared setup.
- Run all: `pnpm test`. Watch: `pnpm test:watch`. Single file: `pnpm test -- path/to/file.test.ts`.
- Core logic (`core/`) is pure - test it directly. Components/hooks use Testing Library with `FretboardProvider`.

## What Not To Do

- Do not remove the localStorage patch - tuning persistence tests rely on it.
