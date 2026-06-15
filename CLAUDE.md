# Scale Training

Guitar fretboard visualization tool. Write notes or intervals in a text syntax, see them rendered on an interactive fretboard diagram.

## Stack

- **Runtime**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Icons**: lucide-react + @phosphor-icons/react (only these two)
- **Linter/Formatter**: Biome.js (no ESLint, no Prettier)
- **Export**: html-to-image (PNG/SVG export)
- **Package manager**: pnpm

## Project Structure

```
src/
  core/         # Pure music theory logic (no React, no DOM)
  components/   # React UI components (Fretboard SVG, Editor, Toolbar)
  hooks/        # Custom React hooks
  types/        # Shared TypeScript types
  lib/          # Utilities (shadcn utils)
```

## Conventions

- Import alias: `@/` maps to `src/`
- Double quotes, tabs, semicolons; Biome handles formatting (run `pnpm lint:fix`)
- Functional components only, no class components
- Core logic is pure TypeScript — no React dependencies in `core/`
- Multiple instruments and custom tunings supported (presets: Guitar 6, Bass 4, Bass 5; plus per-string custom tuning, 1–12 strings)
- A tuning is `NoteName[]` ordered low→high; string count derives from tuning length
- Pitch class is the source of truth for all music math; **spelling** (letter+accidental) and **octave** are additive layers — never normalize spelling away to sharps in core math
- The fretboard SVG lives in ONE primitive, `components/FretboardDiagram.tsx`; never duplicate it
- App state is four focused contexts (Input / Display / Instrument / Derived) composed by `FretboardProvider`; subscribe to the narrowest hook you need
- Octaves are **derived** from the low→high tuning (`core/pitch.ts`), never stored
- Use shadcn/ui primitives for all UI controls
- SVG rendered as React components (not canvas, not d3)

## Git conventions

- Branch names are **prefixed by change type**: `feat/...`, `fix/...`, or `refactor/...`
  (kebab-case after the slash, e.g. `feat/multi-output-audio`, `fix/octave-derivation`).
- Use the prefix that matches the work: `feat/` new functionality, `fix/` bug fixes,
  `refactor/` behavior-preserving changes. Other conventional types (`docs/`, `chore/`,
  `test/`) are fine when they fit better.
- Feature work happens in an isolated git worktree and ships as a PR against `main`.

## Commands

- `pnpm dev` — dev server
- `pnpm build` — type-check + build
- `pnpm lint` — biome check
- `pnpm lint:fix` — biome check --fix
- `pnpm format` — biome format --write
