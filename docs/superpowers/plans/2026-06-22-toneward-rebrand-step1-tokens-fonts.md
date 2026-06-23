# Toneward Rebrand — Step 1 (Tokens + Fonts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolor and re-type the entire app to the Toneward stone palette + brand gradient + three brand fonts, in one reviewable PR, with no layout changes.

**Architecture:** The app is Tailwind v4 (CSS-first, no `tailwind.config`) and renders almost entirely through shadcn theme tokens defined in `src/index.css`. Swapping the `:root` token values recolors every consumer automatically. Fonts register as Tailwind `--font-*` theme vars + a Google Fonts `<link>`. The only hardcoded board color (the root dot, `fill-rose-500`) is repointed at a new `--brand` token.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind CSS v4, Biome, Vitest + @testing-library/react.

## Global Constraints

- Package manager: **pnpm**. Verify with `pnpm lint` (Biome) and `pnpm build` (tsc + vite).
- Formatting: **tabs, double quotes, semicolons** — Biome owns it; run `pnpm lint:fix` if needed.
- Behavior-preserving: no component logic, layout, or copy changes in this step.
- Accent discipline (default): the gradient/`--brand` is reserved for logo, active nav, primary CTAs, progress fill, and the root dot. Step 1 only *introduces* the brand token + gradient utility and applies it to the root dot; broad accent placement happens in later steps.
- Palette + font values are copied verbatim from `docs/superpowers/specs/2026-06-22-toneward-shell-rebrand-design.md`.
- Leave the `.dark` block in `index.css` untouched — there is no theme toggle in the app, so it is unreachable; restyling dark mode is out of scope.

---

### Task 1: Brand fonts

Register Bricolage Grotesque (display), Hanken Grotesk (body/UI), and JetBrains Mono (numeric), and make them the app's default sans/mono families.

**Files:**
- Modify: `index.html` (add font `<link>`s in `<head>`)
- Modify: `src/index.css` (add `--font-*` vars to the `@theme inline` block)

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind utilities `font-sans` (Hanken Grotesk), `font-mono` (JetBrains Mono), `font-display` (Bricolage Grotesque); body text defaults to Hanken Grotesk.

- [ ] **Step 1: Add the Google Fonts links to `index.html`**

In `index.html`, inside `<head>` (right after the `<meta name="description" …>` line), add:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Register the font families as Tailwind theme vars**

In `src/index.css`, inside the `@theme inline { … }` block, add these three lines immediately after the `--radius-4xl: …;` line (before `--color-background`):

```css
	--font-sans: "Hanken Grotesk", ui-sans-serif, system-ui, sans-serif;
	--font-mono: "JetBrains Mono", ui-monospace, monospace;
	--font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
```

(Tailwind v4 maps `--font-sans` to the default body font and generates `font-sans` / `font-mono` / `font-display` utilities. The existing `font-mono` class in `src/components/Editor.tsx` will now resolve to JetBrains Mono automatically.)

- [ ] **Step 3: Verify build + lint pass**

Run: `pnpm build && pnpm lint`
Expected: both succeed, no errors.

(This is a visual/config change with no meaningful unit test; the gate is a clean build + lint, plus a manual check that text renders in Hanken Grotesk on `pnpm dev`.)

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: load Toneward brand fonts (Bricolage, Hanken, JetBrains Mono)"
```

---

### Task 2: Stone palette + brand token + gradient utility

Replace the cool-gray shadcn tokens with the warm stone palette, add the `--brand` pink token, expose it as a Tailwind color, and add the `.bg-brand-gradient` utility.

**Files:**
- Modify: `src/index.css` (`:root` token values; one line in `@theme inline`; new `@utility`)

**Interfaces:**
- Consumes: nothing.
- Produces: stone-valued shadcn tokens (recolors all `bg-card`/`border-border`/`text-muted-foreground`/etc. consumers); a `--brand` token; Tailwind color utilities `fill-brand` / `bg-brand` / `text-brand` (via `--color-brand`); a `bg-brand-gradient` utility class.

- [ ] **Step 1: Replace the `:root` block with stone values**

In `src/index.css`, replace the entire `:root { … }` block (currently the `--radius` through `--sidebar-ring` declarations) with:

```css
:root {
	--radius: 0.625rem;
	--background: #ffffff;
	--foreground: #23201c;
	--card: #ffffff;
	--card-foreground: #23201c;
	--popover: #ffffff;
	--popover-foreground: #23201c;
	--primary: #23201c;
	--primary-foreground: #ffffff;
	--secondary: #f0ebe2;
	--secondary-foreground: #595349;
	--muted: #f6f2ec;
	--muted-foreground: #a8a097;
	--accent: #f0ebe2;
	--accent-foreground: #23201c;
	--destructive: oklch(0.577 0.245 27.325);
	--border: #e6dfd4;
	--input: #ded7cb;
	--ring: #a8a097;
	--brand: #f23d78;
	--chart-1: oklch(0.646 0.222 41.116);
	--chart-2: oklch(0.6 0.118 184.704);
	--chart-3: oklch(0.398 0.07 227.392);
	--chart-4: oklch(0.828 0.189 84.429);
	--chart-5: oklch(0.769 0.188 70.08);
	--sidebar: #ffffff;
	--sidebar-foreground: #23201c;
	--sidebar-primary: #23201c;
	--sidebar-primary-foreground: #ffffff;
	--sidebar-accent: #f0ebe2;
	--sidebar-accent-foreground: #23201c;
	--sidebar-border: #e6dfd4;
	--sidebar-ring: #a8a097;
}
```

- [ ] **Step 2: Expose `--brand` as a Tailwind color**

In `src/index.css`, inside `@theme inline { … }`, add this line immediately after `--color-sidebar-ring: var(--sidebar-ring);`:

```css
	--color-brand: var(--brand);
```

- [ ] **Step 3: Add the brand gradient utility**

In `src/index.css`, immediately after the `@theme inline { … }` block's closing brace (before the `:root` block), add:

```css
@utility bg-brand-gradient {
	background-image: linear-gradient(
		140deg,
		#ff9cb4,
		#f23d78 45%,
		#f2683c 76%,
		#fba63f
	);
}
```

- [ ] **Step 4: Verify build + lint pass**

Run: `pnpm build && pnpm lint`
Expected: both succeed. On `pnpm dev`, the whole app reads as warm stone (white cards, `#E6DFD4` hairlines, `#A8A097` muted text); nothing is still cool-gray.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: adopt Toneward stone palette + brand gradient token"
```

---

### Task 3: Root dot → brand pink

Repoint the fretboard root-note dot from the hardcoded rose color to the new `--brand` token, guarded by a render test.

**Files:**
- Modify: `src/components/FretboardDiagram.tsx:271-279` (root branch of the dot `className`)
- Test: `src/components/FretboardDiagram.test.tsx` (new)

**Interfaces:**
- Consumes: `fill-brand` utility (from Task 2); `MAIN_DIMENSIONS` and `FretboardDiagram` (existing exports); `FretPosition` from `@/types/music`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Create `src/components/FretboardDiagram.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FretboardDiagram, MAIN_DIMENSIONS } from "@/components/FretboardDiagram";
import type { FretPosition } from "@/types/music";

describe("FretboardDiagram root dot", () => {
	it("fills the root note with the brand color, not rose", () => {
		const root: FretPosition = {
			string: 1,
			fret: 5,
			note: "A",
			spelled: { letter: "A", accidental: 0 },
		};

		const { container } = render(
			<FretboardDiagram
				positions={[root]}
				stringCount={6}
				minFret={0}
				maxFret={12}
				dimensions={MAIN_DIMENSIONS}
				displayMode="note"
				highlightRoot
				rootPitchClass="A"
			/>,
		);

		expect(container.querySelector("circle.fill-brand")).not.toBeNull();
		expect(container.querySelector("circle.fill-rose-500")).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/FretboardDiagram.test.tsx`
Expected: FAIL — `container.querySelector("circle.fill-brand")` is `null` (the dot is still `fill-rose-500`).

- [ ] **Step 3: Repoint the root dot to the brand color**

In `src/components/FretboardDiagram.tsx`, in the dot `<circle>` `className`, change the root branch from:

```tsx
								root
									? "fill-rose-500 stroke-rose-300"
									: isMarked
```

to:

```tsx
								root
									? "fill-brand stroke-brand/40"
									: isMarked
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/FretboardDiagram.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build + lint pass**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/components/FretboardDiagram.tsx src/components/FretboardDiagram.test.tsx
git commit -m "feat: paint fretboard root dot with the brand color"
```

---

## Self-Review

**Spec coverage (Step 1 section of the spec):**
- Stone `:root` tokens → Task 2 ✓
- `--brand` + `.bg-brand-gradient` utility → Task 2 ✓
- Keep `--primary` as dark stone ink → Task 2 (`--primary: #23201c`) ✓
- Three Google fonts + `font-sans`/`font-mono`/`font-display` wiring → Task 1 ✓
- Root dot → `--brand` → Task 3 ✓
- "No layout change" → no component/JSX structure touched; only `className` color tokens + CSS vars ✓

**Placeholder scan:** none — every step has exact paths, code, commands, and expected output.

**Type consistency:** `FretPosition` shape in the Task 3 test matches `src/types/music.ts` (`string`, `fret`, `note`, `spelled: { letter, accidental }`). `MAIN_DIMENSIONS` and `FretboardDiagram` are real exports from `FretboardDiagram.tsx`. The `fill-brand` class produced by Task 2's `--color-brand` is consumed by Task 3.

**Notes:** Tasks 1 and 2 are config/CSS with no meaningful unit test; their gate is `pnpm build && pnpm lint` plus a manual visual diff. Task 3 carries the one behavioral guard test. All three commits live under the single Step 1 PR.
