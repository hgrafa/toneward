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
- Double quotes, no semicolons (Biome handles formatting)
- Functional components only, no class components
- Core logic is pure TypeScript — no React dependencies in `core/`
- Multiple instruments and custom tunings supported (presets: Guitar 6, Bass 4, Bass 5; plus per-string custom tuning, 1–12 strings)
- A tuning is `NoteName[]` ordered low→high; string count derives from tuning length
- Use shadcn/ui primitives for all UI controls
- SVG rendered as React components (not canvas, not d3)

## Commands

- `pnpm dev` — dev server
- `pnpm build` — type-check + build
- `pnpm lint` — biome check
- `pnpm lint:fix` — biome check --fix
- `pnpm format` — biome format --write
