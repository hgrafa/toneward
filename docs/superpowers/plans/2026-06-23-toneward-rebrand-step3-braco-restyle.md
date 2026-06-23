# Toneward Rebrand — Step 3 (Braço Tab Restyle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Braço (fretboard) tab to the prototype's stone-card aesthetic — without changing any behavior or adding features.

**Architecture:** Pure presentational changes to five components (`Editor`, `TuningControls`, `Toolbar`, `BoxPatterns`, `FretboardView`). Each existing control keeps its hooks, state, handlers, and accessibility; only Tailwind classes and the wrapping layout change. No new inputs, no tonic dropdown, no presets, no scale-name detection (explicitly deferred — this is a visual pass).

**Tech Stack:** Vite + React 19 + TS, Tailwind CSS v4 (stone tokens + fonts from Steps 1–2), Vitest.

## Global Constraints

- Package manager **pnpm**. Gate each task on `pnpm build` (tsc + vite) **and** `pnpm lint` (Biome) clean, **and** `pnpm vitest run` (existing tests stay green — notably `src/components/TuningControls.test.tsx`).
- Formatting: **tabs, double quotes, semicolons** — Biome owns it; run `pnpm lint:fix` if needed.
- **Behavior-preserving and feature-frozen:** no new controls, options, handlers, or state. Same DOM semantics (labels, `aria-*`, `htmlFor`, button roles) as today.
- **Accent discipline:** no brand gradient in the Braço body. The root dot is already brand pink (Step 1). Active segmented/toggle states use dark ink (`bg-foreground` / `text-background`), matching the prototype.
- **Tokens already map to the stone palette** (Step 1): `bg-card` = #FFFFFF, `border-border` = #E6DFD4, `bg-muted` = #F6F2EC (soft fill), `border-input` = #DED7CB, `text-muted-foreground` = #A8A097, `text-secondary-foreground` = #595349, `text-foreground` = #23201C. Fonts: `font-display` = Bricolage, `font-mono` = JetBrains Mono. The segmented-track color #ECE6DD has no token — use the arbitrary class `bg-[#ece6dd]`.
- Prototype style values (verbatim references): card `border-radius:18px; padding:18px`; uppercase card label `11px/700/0.08em/uppercase/#A8A097`; soft input `border-radius:11px; bg #F6F2EC; border #DED7CB`; page title `Bricolage 700, 30px, -0.025em`; box grid `repeat(auto-fill,minmax(300px,1fr)); gap 14px`; box card `border-radius:16px`.

## File Structure

- **Modify** `src/components/Editor.tsx` — wrap content in a stone card; uppercase label; soft-fill mono textarea.
- **Modify** `src/components/TuningControls.tsx` — stone card; instrument select + string stepper + mono tuning cells on soft fill.
- **Modify** `src/components/Toolbar.tsx` — segmented controls on the `#ECE6DD` track (white active pill), dark-ink Tônica toggle, mono fret inputs, neutral copy pill.
- **Modify** `src/components/BoxPatterns.tsx` — `font-display` heading; responsive grid; 16px-radius cards; mono range label.
- **Modify** `src/components/FretboardView.tsx` — page title = section label in `font-display`; two-column grid for the input + tuning cards; 18px-radius board card; `font-display` "Padrões de Caixa" heading section.

---

### Task 1: Editor — stone input card

**Files:**
- Modify: `src/components/Editor.tsx`

**Interfaces:**
- Consumes: `useInput` (`inputText`, `setInputText`, `parseError`) — unchanged.
- Produces: same `Editor()` export; same `id="note-input"` + `htmlFor` label association.

- [ ] **Step 1: Replace the component body**

Replace the contents of `src/components/Editor.tsx` with:

```tsx
import { useTranslation } from "react-i18next";
import { useInput } from "@/hooks/useFretboardContext";

export function Editor() {
	const { t } = useTranslation();
	const { inputText, setInputText, parseError } = useInput();

	return (
		<div className="rounded-[18px] border border-border bg-card p-[18px]">
			<label
				htmlFor="note-input"
				className="mb-2.5 block font-bold text-[11px] text-muted-foreground uppercase tracking-[0.08em]"
			>
				{t("ui.editor.label")}
			</label>
			<textarea
				id="note-input"
				value={inputText}
				onChange={(e) => setInputText(e.target.value)}
				placeholder={t("ui.editor.placeholder")}
				spellCheck={false}
				className="min-h-[100px] w-full resize-y rounded-[11px] border border-input bg-muted px-[13px] py-[11px] font-mono text-foreground text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			/>
			{parseError && (
				<p className="mt-2 text-destructive text-sm">{parseError}</p>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: all pass. Manual: on `pnpm dev`, the input is a white card with an uppercase muted label and a soft `#F6F2EC` mono textarea.

- [ ] **Step 3: Commit**

```bash
git add src/components/Editor.tsx
git commit -m "style: restyle Editor as a stone input card"
```

---

### Task 2: TuningControls — stone instrument/tuning card

**Files:**
- Modify: `src/components/TuningControls.tsx`

**Interfaces:**
- Consumes: `useInstrument` (`tuning`, `instrumentId`, `setInstrument`, `setStringTuning`, `setStringCount`) — unchanged.
- Produces: same `TuningControls()` export; all `aria-label`s preserved (the existing `TuningControls.test.tsx` must keep passing).

- [ ] **Step 1: Replace the component body**

Replace the `return (...)` JSX in `src/components/TuningControls.tsx` (keep the imports and the hook/const lines at the top exactly as they are) with:

```tsx
	return (
		<div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-card p-[18px]">
			{/* Instrument + string count */}
			<div className="flex flex-wrap items-center gap-3">
				<span className="w-[78px] font-semibold text-secondary-foreground text-sm">
					{t("ui.tuning.instrument")}
				</span>
				<Select value={instrumentId} onValueChange={setInstrument}>
					<SelectTrigger className="h-9 flex-1 rounded-[10px] text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{INSTRUMENTS.map((inst) => (
							<SelectItem key={inst.id} value={inst.id}>
								{inst.name}
							</SelectItem>
						))}
						{instrumentId === CUSTOM_ID && (
							<SelectItem value={CUSTOM_ID}>{t("ui.tuning.custom")}</SelectItem>
						)}
					</SelectContent>
				</Select>
				<div className="flex items-center overflow-hidden rounded-[10px] border border-border">
					<button
						type="button"
						aria-label={t("ui.tuning.removeString")}
						disabled={tuning.length <= MIN_STRINGS}
						onClick={() => setStringCount(tuning.length - 1)}
						className="flex size-9 items-center justify-center bg-card text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
					>
						<Minus className="size-4" />
					</button>
					<span className="w-[70px] text-center font-mono font-semibold text-sm tabular-nums">
						{t("ui.tuning.strings", { count: tuning.length })}
					</span>
					<button
						type="button"
						aria-label={t("ui.tuning.addString")}
						disabled={tuning.length >= MAX_STRINGS}
						onClick={() => setStringCount(tuning.length + 1)}
						className="flex size-9 items-center justify-center bg-card text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
					>
						<Plus className="size-4" />
					</button>
				</div>
			</div>

			{/* Per-string tuning (low → high) */}
			<div className="flex items-center gap-2.5">
				<span className="w-[78px] font-semibold text-secondary-foreground text-sm">
					{t("ui.tuning.tuning")}
				</span>
				<div className="flex flex-1 flex-wrap gap-1.5">
					{tuning.map((note, index) => (
						<Select
							// biome-ignore lint/suspicious/noArrayIndexKey: string position is the identity here
							key={index}
							value={note}
							onValueChange={(value) => setStringTuning(index, value as NoteName)}
						>
							<SelectTrigger
								aria-label={t("ui.tuning.stringTuning", {
									n: tuning.length - index,
								})}
								className="h-9 min-w-0 flex-1 justify-center rounded-[9px] border-input bg-muted font-mono font-semibold text-sm"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CHROMATIC.map((chromaticNote) => (
									<SelectItem key={chromaticNote} value={chromaticNote}>
										{chromaticNote}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					))}
				</div>
			</div>
		</div>
	);
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: all pass — `TuningControls.test.tsx` still finds every control by its `aria-label`. Manual: white card, instrument select + a single rounded −/count/+ stepper, mono tuning cells on soft fill.

- [ ] **Step 3: Commit**

```bash
git add src/components/TuningControls.tsx
git commit -m "style: restyle TuningControls as a stone card"
```

---

### Task 3: Toolbar — segmented controls + pills

**Files:**
- Modify: `src/components/Toolbar.tsx`

**Interfaces:**
- Consumes: `useDisplay` (`displayMode`, `setDisplayMode`, `highlightRoot`, `setHighlightRoot`, `fretRange`, `setFretRange`, `notesPerString`, `setNotesPerString`), `fretboardRef` prop, `handleCopy` — all unchanged.
- Produces: same `Toolbar()` export and `ToolbarProps`.

- [ ] **Step 1: Replace the `return (...)` JSX**

Keep all imports, the `ToolbarProps`, the hook destructuring, `DISPLAY_MODES`, and `handleCopy` exactly as they are. Replace only the returned JSX with:

```tsx
		<div className="flex flex-wrap items-center gap-2.5">
			{/* Display mode (segmented) */}
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<Eye className="size-4" />
			</div>
			<div className="flex gap-0.5 rounded-[11px] bg-[#ece6dd] p-[3px]">
				{DISPLAY_MODES.map((mode) => (
					<button
						key={mode.value}
						type="button"
						onClick={() => setDisplayMode(mode.value)}
						className={`rounded-lg px-3 py-1.5 font-medium text-sm transition-colors ${
							displayMode === mode.value
								? "bg-card text-foreground shadow-sm"
								: "text-secondary-foreground hover:text-foreground"
						}`}
					>
						{mode.label}
					</button>
				))}
			</div>

			{/* Highlight root */}
			<button
				type="button"
				onClick={() => setHighlightRoot(!highlightRoot)}
				className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-semibold text-sm transition-colors ${
					highlightRoot
						? "bg-foreground text-background"
						: "border border-border bg-card text-secondary-foreground hover:bg-muted"
				}`}
			>
				<Crosshair className="size-4" />
				{t("ui.toolbar.root")}
			</button>

			{/* Notes per string (segmented) */}
			<div className="flex items-center gap-2">
				<span className="font-semibold text-secondary-foreground text-sm">
					{t("ui.toolbar.nps")}
				</span>
				<div className="flex gap-0.5 rounded-[10px] bg-[#ece6dd] p-[3px]">
					{([2, 3] as const).map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setNotesPerString(n)}
							className={`rounded-md px-3 py-1 font-medium text-sm tabular-nums transition-colors ${
								notesPerString === n
									? "bg-card text-foreground shadow-sm"
									: "text-secondary-foreground hover:text-foreground"
							}`}
						>
							{n}
						</button>
					))}
				</div>
			</div>

			{/* Fret range */}
			<div className="flex items-center gap-2 text-secondary-foreground text-sm">
				<span className="font-semibold">{t("ui.toolbar.frets")}</span>
				<input
					type="number"
					min={0}
					max={fretRange[1] - 1}
					value={fretRange[0]}
					onChange={(e) => setFretRange([Number(e.target.value), fretRange[1]])}
					className="h-9 w-12 rounded-[9px] border border-input bg-muted text-center font-mono text-sm"
				/>
				<span className="text-muted-foreground">–</span>
				<input
					type="number"
					min={fretRange[0] + 1}
					max={22}
					value={fretRange[1]}
					onChange={(e) => setFretRange([fretRange[0], Number(e.target.value)])}
					className="h-9 w-12 rounded-[9px] border border-input bg-muted text-center font-mono text-sm"
				/>
			</div>

			<div className="flex-1" />

			{/* Copy image */}
			<button
				type="button"
				onClick={handleCopy}
				className="flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-1.5 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted"
			>
				{copied ? (
					<>
						<Check className="size-4" />
						{t("ui.toolbar.copied")}
					</>
				) : (
					<>
						<Copy className="size-4" />
						{t("ui.toolbar.copy")}
					</>
				)}
			</button>
		</div>
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: all pass. Manual: Notas/Intervalos/Nenhum on a `#ECE6DD` track with a white active pill; dark-ink Tônica when on; NPS segmented; mono fret inputs; copy pill pushed to the right.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar.tsx
git commit -m "style: restyle Toolbar with segmented controls and pills"
```

---

### Task 4: BoxPatterns — responsive grid of stone cards

**Files:**
- Modify: `src/components/BoxPatterns.tsx`

**Interfaces:**
- Consumes: `useDerived`/`useDisplay`/`useInput`/`useInstrument` + `BoxFretboard` (in-file) — all unchanged.
- Produces: same `BoxPatterns()` export; `BoxFretboard` untouched.

- [ ] **Step 1: Replace only the returned JSX of `BoxPatterns`**

Keep the imports, `MIN_DISPLAY_FRETS`, the entire `BoxFretboard` component, and the hook lines + the early `return null` guard exactly as they are. Replace the final `return (...)` of `BoxPatterns` with:

```tsx
	return (
		<div className="space-y-3.5">
			<h2 className="font-display font-semibold text-lg tracking-[-0.02em]">
				{t("ui.boxPatterns.heading")}
			</h2>
			<div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
				{boxPatterns.map((pattern) => (
					<div
						key={pattern.index}
						className="overflow-hidden rounded-2xl border border-border bg-card p-3.5"
					>
						<p className="mb-2.5 font-bold text-[13px]">
							{t("ui.boxPatterns.pattern", { n: pattern.index + 1 })}
						</p>
						<div className="overflow-x-auto">
							<BoxFretboard
								pattern={pattern}
								stringCount={tuning.length}
								displayMode={displayMode}
								highlightRoot={highlightRoot}
								rootPitchClass={
									noteSet.root ? spelledToPitchClass(noteSet.root) : undefined
								}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
```

- [ ] **Step 2: Verify build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: all pass. Manual: box patterns lay out in a responsive grid of 16px-radius white cards with `font-display` heading.

- [ ] **Step 3: Commit**

```bash
git add src/components/BoxPatterns.tsx
git commit -m "style: lay out box patterns in a stone-card grid"
```

---

### Task 5: FretboardView — page assembly

Title in `font-display`, the two cards in a two-column grid, the board in an 18px-radius card.

**Files:**
- Modify: `src/components/FretboardView.tsx`

**Interfaces:**
- Consumes: `Editor`, `TuningControls`, `Toolbar`, `Fretboard`, `BoxPatterns` (all restyled in Tasks 1–4).
- Produces: same `FretboardView()` export.

- [ ] **Step 1: Replace the component body**

Replace the contents of `src/components/FretboardView.tsx` with:

```tsx
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { BoxPatterns } from "@/components/BoxPatterns";
import { Editor } from "@/components/Editor";
import { Fretboard } from "@/components/Fretboard";
import { Toolbar } from "@/components/Toolbar";
import { TuningControls } from "@/components/TuningControls";

export function FretboardView() {
	const { t } = useTranslation();
	const fretboardRef = useRef<HTMLDivElement>(null);

	return (
		<div className="mx-auto max-w-[1180px] space-y-[18px] px-10 py-8 pl-24">
			<h1 className="font-bold font-display text-[30px] tracking-[-0.025em]">
				{t("ui.sidebar.fretboard")}
			</h1>

			<div className="grid gap-4 md:grid-cols-2">
				<Editor />
				<TuningControls />
			</div>

			<Toolbar fretboardRef={fretboardRef} />

			<div
				ref={fretboardRef}
				className="overflow-x-auto rounded-[18px] border border-border bg-card px-5 py-[22px]"
			>
				<Fretboard />
			</div>

			<BoxPatterns />
		</div>
	);
}
```

Note: `pl-24` (96px left padding) clears the floating nav, matching the prototype's main content inset. The page title uses `ui.sidebar.fretboard` so it reads "Escalas" (pt) / "Fretboard" (en), consistent with the header section name.

- [ ] **Step 2: Verify build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: all pass. Manual on `pnpm dev`: the Braço page matches the prototype — big `font-display` title, the input + tuning cards side-by-side, segmented toolbar, the board in a rounded card, and the box-pattern grid below. Confirm the content clears the floating nav on the left.

- [ ] **Step 3: Commit**

```bash
git add src/components/FretboardView.tsx
git commit -m "style: assemble the Braço page in the prototype layout"
```

---

## Self-Review

**Spec coverage (Step 3 section of the design spec):**
- Editor → stone "Notas ou intervalos" card → Task 1 ✓
- TuningControls → stone card, mono tuning cells → Task 2 ✓
- Toolbar segmented (Notas/Intervalos/Nenhum on #ECE6DD), dark Tônica, NPS, mono fret inputs, copy → Task 3 ✓
- BoxPatterns 16px-radius grid → Task 4 ✓
- FretboardView: `font-display` page title (section label), two-column card grid, 18px board card, "Padrões de Caixa" section → Tasks 4 (heading) + 5 ✓
- Feature-frozen (no tonic dropdown / presets / scale-name) — confirmed: no new controls in any task ✓

**Placeholder scan:** none — every step has exact paths, complete code, commands, and expected output.

**Type/behavior consistency:** every task preserves the existing hook calls, handlers, `aria-*`, and `htmlFor`/`id` associations; `TuningControls.test.tsx` keeps passing because all `aria-label`s are unchanged. No props or exports change signature. The page title swaps from `ui.appName` to `ui.sidebar.fretboard` (Task 5) — a label change, not a behavior change.

**Notes:** These are visual diffs with no meaningful unit assertions beyond "existing tests still pass"; the gate is `pnpm build && pnpm lint && pnpm vitest run` plus a manual visual diff against the prototype. The segmented-track color `#ECE6DD` is an arbitrary Tailwind value (no token) by design.
