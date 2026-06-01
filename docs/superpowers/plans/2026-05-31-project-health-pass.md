# Project Health Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fretboard-designer healthier and AI-friendly — shared fretboard SVG, split context, a correct note-spelling layer (Db not C#) plus a derived octave foundation — with no behavior change except correct spelling, and an internal `CLAUDE.md` in every folder.

**Architecture:** Pitch class stays the source of truth for all music math; spelling and octave are additive layers. The duplicated fretboard SVG collapses into one parameterized `<FretboardDiagram>`. The monolithic context splits into four focused providers under one `FretboardProvider`. Octaves are derived from the low→high tuning, never stored.

**Tech Stack:** Vite + React 19 + TypeScript, Vitest + Testing Library, Tailwind v4 + shadcn/ui, Biome (double quotes, semicolons, tabs — match existing files).

**Working directory:** `refactor-health` worktree (`/Users/hgrafa/Dev/fretboard-designer/.claude/worktrees/refactor-health`). All paths below are relative to it. Spec: `docs/superpowers/specs/2026-05-31-project-health-pass-design.md`.

**Conventions to match existing code:** tabs for indentation, double quotes, **semicolons present** (Biome here keeps them despite the root CLAUDE.md text), `@/` import alias. Run `pnpm lint:fix` before each commit if unsure.

---

## File Structure

**Phase 0 — test net**
- Modify: `src/core/notes.ts` is untouched; Create `src/core/notes.test.ts`, `src/core/parser.test.ts`.

**Phase 1 — shared diagram (#3)**
- Create: `src/components/FretboardDiagram.tsx` (pure SVG primitive + `MAIN_DIMENSIONS`, `BOX_DIMENSIONS`, `FretboardDimensions` type).
- Rewrite: `src/components/Fretboard.tsx` (thin wrapper + tooltip).
- Rewrite: `src/components/BoxPatterns.tsx` (thin wrapper, keeps display-window math).

**Phase 2 — context split (#2)**
- Create: `src/hooks/InputContext.tsx`, `src/hooks/DisplayContext.tsx`, `src/hooks/InstrumentContext.tsx`, `src/hooks/DerivedContext.tsx`.
- Rewrite: `src/hooks/useFretboardContext.tsx` (now only composes `FretboardProvider`).
- Modify: `src/components/Editor.tsx`, `src/components/Toolbar.tsx`, `src/components/TuningControls.tsx`, `src/components/Fretboard.tsx`, `src/components/BoxPatterns.tsx` (swap hooks).
- Modify: `src/hooks/useFretboardContext.test.tsx` (use `useInstrument`).

**Phase 3a — spelling (#1)**
- Modify: `src/types/music.ts` (add `Letter`, `SpelledNote`; change `NoteSet`, `FretPosition`).
- Modify: `src/core/notes.ts` (spelling helpers, interval→degree map, `parseSpelledNote`).
- Rewrite: `src/core/parser.ts` (produce `SpelledNote`s, degree-based interval spelling).
- Modify: `src/core/fretboard.ts` (`mapNotesToFretboard` stamps `spelled`; pc-based lookup & root).
- Modify: `src/components/FretboardDiagram.tsx` (label uses `formatSpelled(pos.spelled)`), `Fretboard.tsx`, `BoxPatterns.tsx` (root passed as pitch class).
- Modify: `src/core/parser.test.ts`, `src/core/fretboard.test.ts`, `src/core/notes.test.ts` (spelling assertions).

**Phase 3b — octaves (#1)**
- Create: `src/core/pitch.ts`, `src/core/pitch.test.ts`.

**Phase 4 — docs**
- Update: `CLAUDE.md`, `src/core/CLAUDE.md`, `src/components/CLAUDE.md`.
- Create: `src/hooks/CLAUDE.md`, `src/types/CLAUDE.md`, `src/lib/CLAUDE.md`, `src/test/CLAUDE.md`, `src/components/ui/CLAUDE.md`.

---

## Phase 0 — Light test net

### Task 0.1: Characterize `notes.ts`

**Files:**
- Test: `src/core/notes.test.ts` (create)

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import {
	intervalBetween,
	isValidInterval,
	normalizeNote,
	resolveInterval,
	transpose,
} from "./notes";

describe("normalizeNote", () => {
	it("accepts sharps and naturals as-is", () => {
		expect(normalizeNote("C")).toBe("C");
		expect(normalizeNote("F#")).toBe("F#");
	});

	it("converts flats to sharps", () => {
		expect(normalizeNote("Db")).toBe("C#");
		expect(normalizeNote("Bb")).toBe("A#");
	});

	it("is case-insensitive on the letter", () => {
		expect(normalizeNote("c")).toBe("C");
		expect(normalizeNote("eb")).toBe("D#");
	});

	it("returns null for garbage", () => {
		expect(normalizeNote("H")).toBeNull();
		expect(normalizeNote("")).toBeNull();
	});
});

describe("note math", () => {
	it("transposes with octave wrap", () => {
		expect(transpose("A", 3)).toBe("C");
		expect(transpose("C", -1)).toBe("B");
	});

	it("computes the interval between two notes", () => {
		expect(intervalBetween("A", "C")).toBe("b3");
		expect(intervalBetween("C", "G")).toBe("5");
	});

	it("resolves an interval from a root", () => {
		expect(resolveInterval("A", "b3")).toBe("C");
		expect(resolveInterval("C", "5")).toBe("G");
	});

	it("validates interval tokens", () => {
		expect(isValidInterval("b3")).toBe(true);
		expect(isValidInterval("9")).toBe(false);
	});
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test -- src/core/notes.test.ts`
Expected: PASS (these characterize existing behavior).

- [ ] **Step 3: Commit**

```bash
git add src/core/notes.test.ts
git commit -m "test: characterize notes.ts behavior"
```

### Task 0.2: Characterize `parser.ts`

**Files:**
- Test: `src/core/parser.test.ts` (create)

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import { parseInput } from "./parser";

describe("parseInput — notes mode", () => {
	it("parses a space/comma separated note list", () => {
		const out = parseInput("C E G Bb");
		expect(out.success).toBe(true);
		if (out.success) {
			expect(out.noteSet.notes).toEqual(["C", "E", "G", "A#"]);
			expect(out.noteSet.root).toBeUndefined();
		}
	});

	it("dedupes repeated notes", () => {
		const out = parseInput("C C E");
		expect(out.success && out.noteSet.notes).toEqual(["C", "E"]);
	});

	it("rejects an invalid note", () => {
		const out = parseInput("C H");
		expect(out).toEqual({ success: false, error: 'Invalid note: "H"' });
	});
});

describe("parseInput — intervals mode", () => {
	it("resolves intervals against a root", () => {
		const out = parseInput("root: A\n1 b3 4 5 b7");
		expect(out.success).toBe(true);
		if (out.success) {
			expect(out.noteSet.notes).toEqual(["A", "C", "D", "E", "G"]);
			expect(out.noteSet.root).toBe("A");
		}
	});

	it("rejects an invalid interval", () => {
		const out = parseInput("root: A\n1 b9");
		expect(out).toEqual({ success: false, error: 'Invalid interval: "b9"' });
	});
});

describe("parseInput — errors", () => {
	it("rejects empty input", () => {
		expect(parseInput("   ")).toEqual({ success: false, error: "Empty input" });
	});
});
```

> NOTE: These assertions describe **pre-spelling** behavior (sharps, `root` as `NoteName`). Phase 3a rewrites this file's expectations. That is expected — Phase 0 is a tripwire for Phases 1–2.

- [ ] **Step 2: Run it**

Run: `pnpm test -- src/core/parser.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/parser.test.ts
git commit -m "test: characterize parser.ts behavior"
```

### Task 0.3: Full green baseline

- [ ] **Step 1: Run everything**

Run: `pnpm test`
Expected: PASS (all suites).

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: builds with no type errors.

---

## Phase 1 — Shared `<FretboardDiagram>` primitive (#3)

### Task 1.1: Create the diagram primitive

**Files:**
- Create: `src/components/FretboardDiagram.tsx`

- [ ] **Step 1: Write the full file**

```tsx
import { DOUBLE_DOT_FRETS, SINGLE_DOT_FRETS } from "@/core/fretboard";
import type { DisplayMode, FretPosition, NoteName } from "@/types/music";

export interface FretboardDimensions {
	fretWidth: number;
	stringSpacing: number;
	topPadding: number;
	bottomPadding: number;
	leftPadding: number;
	nutWidth: number;
	dotRadius: number;
	markerRadius: number;
	fretNumberYOffset: number;
	openDotXOffset: number;
	fretStrokeWidth: number;
	dotFontSize: number;
	fretNumberFontSize: number;
	stringStrokeWidth: (indexFromTop: number) => number;
}

export const MAIN_DIMENSIONS: FretboardDimensions = {
	fretWidth: 80,
	stringSpacing: 30,
	topPadding: 40,
	bottomPadding: 50,
	leftPadding: 50,
	nutWidth: 6,
	dotRadius: 11,
	markerRadius: 5,
	fretNumberYOffset: 30,
	openDotXOffset: 16,
	fretStrokeWidth: 2,
	dotFontSize: 10,
	fretNumberFontSize: 11,
	stringStrokeWidth: (i) => 1 + i * 0.3,
};

export const BOX_DIMENSIONS: FretboardDimensions = {
	fretWidth: 60,
	stringSpacing: 26,
	topPadding: 32,
	bottomPadding: 40,
	leftPadding: 40,
	nutWidth: 5,
	dotRadius: 10,
	markerRadius: 4,
	fretNumberYOffset: 24,
	openDotXOffset: 14,
	fretStrokeWidth: 1.5,
	dotFontSize: 9,
	fretNumberFontSize: 10,
	stringStrokeWidth: (i) => 0.8 + i * 0.25,
};

export interface FretboardDiagramProps {
	positions: FretPosition[];
	stringCount: number;
	minFret: number;
	maxFret: number;
	dimensions: FretboardDimensions;
	displayMode: DisplayMode;
	highlightRoot: boolean;
	rootPitchClass?: NoteName;
	onHoverPosition?: (data: { x: number; y: number; pos: FretPosition } | null) => void;
}

export function FretboardDiagram({
	positions,
	stringCount,
	minFret,
	maxFret,
	dimensions: d,
	displayMode,
	highlightRoot,
	rootPitchClass,
	onHoverPosition,
}: FretboardDiagramProps) {
	const fretCount = maxFret - minFret;
	const showNut = minFret === 0;

	const totalWidth = d.leftPadding + fretCount * d.fretWidth + 20;
	const totalHeight =
		d.topPadding + (stringCount - 1) * d.stringSpacing + d.bottomPadding;

	function fretX(fret: number): number {
		return d.leftPadding + (fret - minFret) * d.fretWidth;
	}

	function stringY(stringNum: number): number {
		return d.topPadding + (stringNum - 1) * d.stringSpacing;
	}

	function dotX(fret: number): number {
		if (fret === 0) return d.leftPadding - d.openDotXOffset;
		return fretX(fret) - d.fretWidth / 2;
	}

	function isRoot(pos: FretPosition): boolean {
		return highlightRoot && rootPitchClass === pos.note;
	}

	function dotLabel(pos: FretPosition): string {
		if (displayMode === "none") return "";
		if (displayMode === "interval") return pos.interval ?? "";
		return pos.note;
	}

	const markerCy = d.topPadding + ((stringCount - 1) * d.stringSpacing) / 2;

	return (
		<svg
			viewBox={`0 0 ${totalWidth} ${totalHeight}`}
			className="w-full max-w-full"
			style={{ minWidth: 400 }}
		>
			{showNut && (
				<rect
					x={d.leftPadding - d.nutWidth / 2}
					y={d.topPadding - 2}
					width={d.nutWidth}
					height={(stringCount - 1) * d.stringSpacing + 4}
					className="fill-foreground"
					rx={1}
				/>
			)}

			{Array.from({ length: fretCount + 1 }, (_, i) => {
				const fret = minFret + i;
				if (fret === 0 && showNut) return null;
				return (
					<line
						key={`fret-${fret}`}
						x1={fretX(fret)}
						y1={d.topPadding - 2}
						x2={fretX(fret)}
						y2={d.topPadding + (stringCount - 1) * d.stringSpacing + 2}
						className="stroke-muted-foreground"
						strokeOpacity={0.4}
						strokeWidth={d.fretStrokeWidth}
					/>
				);
			})}

			{Array.from({ length: stringCount }, (_, i) => {
				const stringNum = i + 1;
				const y = stringY(stringNum);
				return (
					<line
						key={`string-${stringNum}`}
						x1={d.leftPadding - (showNut ? d.nutWidth : 0)}
						y1={y}
						x2={d.leftPadding + fretCount * d.fretWidth}
						y2={y}
						className="stroke-foreground"
						strokeOpacity={0.6}
						strokeWidth={d.stringStrokeWidth(i)}
					/>
				);
			})}

			{SINGLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map((fret) => (
				<circle
					key={`marker-${fret}`}
					cx={fretX(fret) - d.fretWidth / 2}
					cy={markerCy}
					r={d.markerRadius}
					className="fill-muted-foreground"
					fillOpacity={0.3}
				/>
			))}
			{DOUBLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map((fret) => {
				const offset =
					stringCount >= 4 ? d.stringSpacing : d.stringSpacing / 2;
				return (
					<g key={`double-marker-${fret}`}>
						<circle
							cx={fretX(fret) - d.fretWidth / 2}
							cy={markerCy - offset}
							r={d.markerRadius}
							className="fill-muted-foreground"
							fillOpacity={0.3}
						/>
						<circle
							cx={fretX(fret) - d.fretWidth / 2}
							cy={markerCy + offset}
							r={d.markerRadius}
							className="fill-muted-foreground"
							fillOpacity={0.3}
						/>
					</g>
				);
			})}

			{Array.from({ length: fretCount }, (_, i) => {
				const fret = minFret + i + 1;
				return (
					<text
						key={`fretnum-${fret}`}
						x={fretX(fret) - d.fretWidth / 2}
						y={d.topPadding + (stringCount - 1) * d.stringSpacing + d.fretNumberYOffset}
						textAnchor="middle"
						className="fill-muted-foreground text-xs select-none"
						fontSize={d.fretNumberFontSize}
					>
						{fret}
					</text>
				);
			})}

			{positions.map((pos) => {
				const cx = dotX(pos.fret);
				const cy = stringY(pos.string);
				const root = isRoot(pos);
				const label = dotLabel(pos);
				const interactive = Boolean(onHoverPosition);

				return (
					<g
						key={`dot-${pos.string}-${pos.fret}`}
						className={interactive ? "cursor-pointer" : undefined}
						onMouseEnter={
							onHoverPosition
								? () => onHoverPosition({ x: cx, y: cy, pos })
								: undefined
						}
						onMouseLeave={onHoverPosition ? () => onHoverPosition(null) : undefined}
					>
						<circle
							cx={cx}
							cy={cy}
							r={d.dotRadius}
							className={
								root
									? "fill-rose-500 stroke-rose-300"
									: "fill-foreground stroke-background"
							}
							strokeWidth={root ? 2 : 1}
						/>
						{label && (
							<text
								x={cx}
								y={cy}
								dy="0.35em"
								textAnchor="middle"
								fontSize={d.dotFontSize}
								fontWeight={root ? 700 : 500}
								className={
									root ? "fill-white select-none" : "fill-background select-none"
								}
							>
								{label}
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: no errors (file is unused so far, but must type-check).

- [ ] **Step 3: Commit**

```bash
git add src/components/FretboardDiagram.tsx
git commit -m "feat: add shared FretboardDiagram primitive"
```

### Task 1.2: Make `Fretboard.tsx` a thin wrapper

**Files:**
- Rewrite: `src/components/Fretboard.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
import { useState } from "react";
import {
	FretboardDiagram,
	MAIN_DIMENSIONS,
} from "@/components/FretboardDiagram";
import { useFretboard } from "@/hooks/useFretboardContext";
import type { FretPosition } from "@/types/music";

interface TooltipData {
	x: number;
	y: number;
	note: string;
	interval?: string;
}

export function Fretboard() {
	const { positions, displayMode, highlightRoot, fretRange, noteSet, tuning } =
		useFretboard();
	const [tooltip, setTooltip] = useState<TooltipData | null>(null);

	const [minFret, maxFret] = fretRange;
	const d = MAIN_DIMENSIONS;
	const fretCount = maxFret - minFret;
	const totalWidth = d.leftPadding + fretCount * d.fretWidth + 20;
	const totalHeight =
		d.topPadding + (tuning.length - 1) * d.stringSpacing + d.bottomPadding;

	return (
		<div className="relative">
			<FretboardDiagram
				positions={positions}
				stringCount={tuning.length}
				minFret={minFret}
				maxFret={maxFret}
				dimensions={d}
				displayMode={displayMode}
				highlightRoot={highlightRoot}
				rootPitchClass={noteSet?.root}
				onHoverPosition={(data) =>
					setTooltip(
						data
							? {
									x: data.x,
									y: data.y,
									note: data.pos.note,
									interval: data.pos.interval,
								}
							: null,
					)
				}
			/>
			{tooltip && (
				<svg
					viewBox={`0 0 ${totalWidth} ${totalHeight}`}
					className="pointer-events-none absolute inset-0 w-full max-w-full"
					style={{ minWidth: 400 }}
				>
					<rect
						x={tooltip.x - 35}
						y={tooltip.y - d.dotRadius - 30}
						width={70}
						height={22}
						rx={4}
						className="fill-popover stroke-border"
						strokeWidth={1}
					/>
					<text
						x={tooltip.x}
						y={tooltip.y - d.dotRadius - 15}
						textAnchor="middle"
						fontSize={11}
						className="fill-popover-foreground select-none"
					>
						{tooltip.note}
						{tooltip.interval ? ` (${tooltip.interval})` : ""}
					</text>
				</svg>
			)}
		</div>
	);
}
```

> NOTE: `Fretboard` currently inlines the tooltip in the same `<svg>`. Because the shared primitive owns its `<svg>`, the tooltip moves to an absolutely-positioned overlay `<svg>` with the same `viewBox`, preserving placement. The merged main board is **variable string count** (`tuning.length`), so `stringCount` and `totalHeight` derive from `tuning`. `FretPosition` is imported for the tooltip typing only.

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: no errors.

- [ ] **Step 3: Manual visual check**

Run: `pnpm dev`, open the app. Confirm the main fretboard renders identically (nut, frets, strings, markers, dots, fret numbers) and hovering a dot shows the tooltip in the same spot. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/Fretboard.tsx
git commit -m "refactor: render main fretboard via FretboardDiagram"
```

### Task 1.3: Make `BoxPatterns.tsx` a thin wrapper

**Files:**
- Rewrite: `src/components/BoxPatterns.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
import { BOX_DIMENSIONS, FretboardDiagram } from "@/components/FretboardDiagram";
import { useFretboard } from "@/hooks/useFretboardContext";
import type { BoxPattern } from "@/types/music";

const MIN_DISPLAY_FRETS = 7;

function BoxFretboard({
	pattern,
	stringCount,
	displayMode,
	highlightRoot,
	rootPitchClass,
}: {
	pattern: BoxPattern;
	stringCount: number;
	displayMode: "note" | "interval" | "none";
	highlightRoot: boolean;
	rootPitchClass?: string;
}) {
	const { minFret, maxFret, positions } = pattern;

	const patternSpan = maxFret - minFret;
	const extraFrets = Math.max(2, Math.ceil((MIN_DISPLAY_FRETS - patternSpan) / 2));
	const displayMinFret = Math.max(0, minFret - extraFrets);
	const displayMaxFret = Math.max(
		displayMinFret + MIN_DISPLAY_FRETS,
		maxFret + extraFrets,
	);

	return (
		<FretboardDiagram
			positions={positions}
			stringCount={stringCount}
			minFret={displayMinFret}
			maxFret={displayMaxFret}
			dimensions={BOX_DIMENSIONS}
			displayMode={displayMode}
			highlightRoot={highlightRoot}
			rootPitchClass={rootPitchClass as never}
		/>
	);
}

export function BoxPatterns() {
	const { boxPatterns, displayMode, highlightRoot, noteSet, tuning } =
		useFretboard();

	if (!noteSet || boxPatterns.length === 0) return null;

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-medium text-muted-foreground">Box Patterns</h2>
			<div className="space-y-3">
				{boxPatterns.map((pattern) => (
					<div
						key={pattern.index}
						className="overflow-x-auto rounded-lg border border-border bg-card p-4"
					>
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							Pattern {pattern.index + 1}
						</p>
						<BoxFretboard
							pattern={pattern}
							stringCount={tuning.length}
							displayMode={displayMode}
							highlightRoot={highlightRoot}
							rootPitchClass={noteSet.root}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
```

> NOTE: `rootPitchClass as never` is a temporary bridge while `noteSet.root` is still a `NoteName` (Phase 1/2). Phase 3a changes `noteSet.root` to `SpelledNote` and Task 3.7 replaces this with `spelledToPitchClass(noteSet.root)`, dropping the cast. `tuning` comes from context (string count now drives the box's string count, matching the merged multi-instrument behavior).

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: no errors.

- [ ] **Step 3: Manual visual check**

Run: `pnpm dev`. Confirm each box pattern renders identically to before (smaller dimensions, no tooltip). Stop the server.

- [ ] **Step 4: Run full tests + commit**

Run: `pnpm test`
Expected: PASS.

```bash
git add src/components/BoxPatterns.tsx
git commit -m "refactor: render box patterns via FretboardDiagram"
```

---

## Phase 2 — Split the god context (#2)

> All four providers nest under `FretboardProvider`. `useFretboard()` (the god hook) is removed; each component subscribes to the focused hook(s) it needs. `FretboardProvider` name is unchanged so existing test wrappers keep working.

### Task 2.1: `InstrumentContext`

**Files:**
- Create: `src/hooks/InstrumentContext.tsx`

- [ ] **Step 1: Write the full file**

```tsx
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { INSTRUMENTS, matchInstrument } from "@/core/instruments";
import { loadTuningState, saveTuningState } from "@/lib/tuningStorage";
import type { NoteName, Tuning } from "@/types/music";

interface InstrumentState {
	tuning: Tuning;
	instrumentId: string;
	setInstrument: (id: string) => void;
	setStringTuning: (stringIndex: number, note: NoteName) => void;
	setStringCount: (n: number) => void;
}

const InstrumentContext = createContext<InstrumentState | null>(null);

export function InstrumentProvider({ children }: { children: ReactNode }) {
	const [tuning, setTuning] = useState<Tuning>(() => loadTuningState().tuning);
	const instrumentId = useMemo(() => matchInstrument(tuning), [tuning]);

	useEffect(() => {
		saveTuningState({ instrumentId, tuning });
	}, [instrumentId, tuning]);

	const setInstrument = useCallback((id: string) => {
		const inst = INSTRUMENTS.find((i) => i.id === id);
		if (!inst) return;
		setTuning([...inst.tuning]);
	}, []);

	const setStringTuning = useCallback((stringIndex: number, note: NoteName) => {
		setTuning((prev) => {
			const next = [...prev];
			next[stringIndex] = note;
			return next;
		});
	}, []);

	const setStringCount = useCallback((n: number) => {
		const count = Math.max(1, Math.min(12, n));
		setTuning((prev) => {
			if (count === prev.length) return prev;
			if (count < prev.length) {
				return prev.slice(prev.length - count);
			}
			const toAdd = count - prev.length;
			return [...(Array(toAdd).fill("E") as NoteName[]), ...prev];
		});
	}, []);

	const value = useMemo<InstrumentState>(
		() => ({
			tuning,
			instrumentId,
			setInstrument,
			setStringTuning,
			setStringCount,
		}),
		[tuning, instrumentId, setInstrument, setStringTuning, setStringCount],
	);

	return (
		<InstrumentContext.Provider value={value}>
			{children}
		</InstrumentContext.Provider>
	);
}

export function useInstrument(): InstrumentState {
	const ctx = useContext(InstrumentContext);
	if (!ctx) {
		throw new Error("useInstrument must be used within a FretboardProvider");
	}
	return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/InstrumentContext.tsx
git commit -m "feat: add InstrumentContext (split from god context)"
```

### Task 2.2: `DisplayContext`

**Files:**
- Create: `src/hooks/DisplayContext.tsx`

- [ ] **Step 1: Write the full file**

```tsx
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { DisplayMode } from "@/types/music";

interface DisplayState {
	displayMode: DisplayMode;
	highlightRoot: boolean;
	fretRange: [number, number];
	notesPerString: 2 | 3;
	setDisplayMode: (mode: DisplayMode) => void;
	setHighlightRoot: (highlight: boolean) => void;
	setFretRange: (range: [number, number]) => void;
	setNotesPerString: (n: 2 | 3) => void;
}

const DisplayContext = createContext<DisplayState | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
	const [displayMode, setDisplayMode] = useState<DisplayMode>("note");
	const [highlightRoot, setHighlightRoot] = useState(true);
	const [fretRange, setFretRange] = useState<[number, number]>([0, 12]);
	const [notesPerString, setNotesPerString] = useState<2 | 3>(2);

	const value = useMemo<DisplayState>(
		() => ({
			displayMode,
			highlightRoot,
			fretRange,
			notesPerString,
			setDisplayMode,
			setHighlightRoot,
			setFretRange,
			setNotesPerString,
		}),
		[displayMode, highlightRoot, fretRange, notesPerString],
	);

	return (
		<DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
	);
}

export function useDisplay(): DisplayState {
	const ctx = useContext(DisplayContext);
	if (!ctx) {
		throw new Error("useDisplay must be used within a FretboardProvider");
	}
	return ctx;
}
```

> NOTE: the `set*` functions are `useState` setters with stable identities, so they don't need `useCallback` and are intentionally omitted from the `useMemo` deps.

- [ ] **Step 2: Type-check + commit**

Run: `pnpm build`
Expected: no errors.

```bash
git add src/hooks/DisplayContext.tsx
git commit -m "feat: add DisplayContext (split from god context)"
```

### Task 2.3: `InputContext`

**Files:**
- Create: `src/hooks/InputContext.tsx`

- [ ] **Step 1: Write the full file**

```tsx
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { parseInput } from "@/core/parser";
import type { NoteSet, ParseError } from "@/types/music";

interface InputState {
	inputText: string;
	noteSet: NoteSet | null;
	parseError: string | null;
	setInputText: (text: string) => void;
}

const InputContext = createContext<InputState | null>(null);

const DEFAULT_INPUT = "root: A\n1 b3 4 5 b7";

export function InputProvider({ children }: { children: ReactNode }) {
	const [inputText, setInputText] = useState(DEFAULT_INPUT);

	const parsed = useMemo(() => parseInput(inputText), [inputText]);
	const noteSet = parsed.success ? parsed.noteSet : null;
	const parseError = parsed.success ? null : (parsed as ParseError).error;

	const value = useMemo<InputState>(
		() => ({ inputText, noteSet, parseError, setInputText }),
		[inputText, noteSet, parseError],
	);

	return (
		<InputContext.Provider value={value}>{children}</InputContext.Provider>
	);
}

export function useInput(): InputState {
	const ctx = useContext(InputContext);
	if (!ctx) {
		throw new Error("useInput must be used within a FretboardProvider");
	}
	return ctx;
}
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm build`
Expected: no errors.

```bash
git add src/hooks/InputContext.tsx
git commit -m "feat: add InputContext (split from god context)"
```

### Task 2.4: `DerivedContext`

**Files:**
- Create: `src/hooks/DerivedContext.tsx`

- [ ] **Step 1: Write the full file**

```tsx
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { generateBoxPatterns, mapNotesToFretboard } from "@/core/fretboard";
import type { BoxPattern, FretPosition } from "@/types/music";
import { useDisplay } from "./DisplayContext";
import { useInput } from "./InputContext";
import { useInstrument } from "./InstrumentContext";

interface DerivedState {
	positions: FretPosition[];
	boxPatterns: BoxPattern[];
}

const DerivedContext = createContext<DerivedState | null>(null);

export function DerivedProvider({ children }: { children: ReactNode }) {
	const { noteSet } = useInput();
	const { tuning } = useInstrument();
	const { fretRange, notesPerString } = useDisplay();

	const positions = useMemo(() => {
		if (!noteSet) return [];
		return mapNotesToFretboard(noteSet, tuning, fretRange);
	}, [noteSet, tuning, fretRange]);

	const boxPatterns = useMemo(() => {
		if (!noteSet) return [];
		return generateBoxPatterns(noteSet, tuning, notesPerString);
	}, [noteSet, tuning, notesPerString]);

	const value = useMemo<DerivedState>(
		() => ({ positions, boxPatterns }),
		[positions, boxPatterns],
	);

	return (
		<DerivedContext.Provider value={value}>{children}</DerivedContext.Provider>
	);
}

export function useDerived(): DerivedState {
	const ctx = useContext(DerivedContext);
	if (!ctx) {
		throw new Error("useDerived must be used within a FretboardProvider");
	}
	return ctx;
}
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm build`
Expected: no errors.

```bash
git add src/hooks/DerivedContext.tsx
git commit -m "feat: add DerivedContext (split from god context)"
```

### Task 2.5: Compose `FretboardProvider`, remove the god hook

**Files:**
- Rewrite: `src/hooks/useFretboardContext.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
import type { ReactNode } from "react";
import { DerivedProvider } from "./DerivedContext";
import { DisplayProvider } from "./DisplayContext";
import { InputProvider } from "./InputContext";
import { InstrumentProvider } from "./InstrumentContext";

export { useDisplay } from "./DisplayContext";
export { useInput } from "./InputContext";
export { useInstrument } from "./InstrumentContext";
export { useDerived } from "./DerivedContext";

export function FretboardProvider({ children }: { children: ReactNode }) {
	return (
		<InstrumentProvider>
			<DisplayProvider>
				<InputProvider>
					<DerivedProvider>{children}</DerivedProvider>
				</InputProvider>
			</DisplayProvider>
		</InstrumentProvider>
	);
}
```

> NOTE: `DerivedProvider` must be innermost — it consumes `useInput`, `useInstrument`, and `useDisplay`. The old `useFretboard` export is intentionally gone; the next tasks migrate every consumer.

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: FAILS — consumers still import `useFretboard`. That is expected; Tasks 2.6–2.10 fix them. Proceed without committing yet.

### Task 2.6: Migrate `Fretboard.tsx`

**Files:**
- Modify: `src/components/Fretboard.tsx`

- [ ] **Step 1: Swap the hook usage**

Replace the import line:
```tsx
import { useFretboard } from "@/hooks/useFretboardContext";
```
with:
```tsx
import {
	useDerived,
	useDisplay,
	useInput,
	useInstrument,
} from "@/hooks/useFretboardContext";
```

Replace the destructuring line:
```tsx
	const { positions, displayMode, highlightRoot, fretRange, noteSet } =
		useFretboard();
```
with:
```tsx
	const { positions } = useDerived();
	const { displayMode, highlightRoot, fretRange } = useDisplay();
	const { noteSet } = useInput();
	const { tuning } = useInstrument();
```

`tuning` is already consumed for `stringCount={tuning.length}` and `totalHeight` (from Task 1.2) — it now comes from `useInstrument()` instead of the god hook. No other change in this file.

- [ ] **Step 2: Do not build yet** (other consumers still broken). Continue to Task 2.7.

### Task 2.7: Migrate `BoxPatterns.tsx`

**Files:**
- Modify: `src/components/BoxPatterns.tsx`

- [ ] **Step 1: Swap the hook usage**

Replace:
```tsx
import { useFretboard } from "@/hooks/useFretboardContext";
```
with:
```tsx
import { useDerived, useDisplay, useInput, useInstrument } from "@/hooks/useFretboardContext";
```

Replace:
```tsx
	const { boxPatterns, displayMode, highlightRoot, noteSet, tuning } =
		useFretboard();
```
with:
```tsx
	const { boxPatterns } = useDerived();
	const { displayMode, highlightRoot } = useDisplay();
	const { noteSet } = useInput();
	const { tuning } = useInstrument();
```

### Task 2.8: Migrate `Editor.tsx`

**Files:**
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Swap the hook**

Replace:
```tsx
import { useFretboard } from "@/hooks/useFretboardContext";
```
with:
```tsx
import { useInput } from "@/hooks/useFretboardContext";
```

Replace:
```tsx
	const { inputText, setInputText, parseError } = useFretboard();
```
with:
```tsx
	const { inputText, setInputText, parseError } = useInput();
```

### Task 2.9: Migrate `Toolbar.tsx`

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Swap the hook**

Replace:
```tsx
import { useFretboard } from "@/hooks/useFretboardContext";
```
with:
```tsx
import { useDisplay } from "@/hooks/useFretboardContext";
```

Replace:
```tsx
	const {
		displayMode,
		setDisplayMode,
		highlightRoot,
		setHighlightRoot,
		fretRange,
		setFretRange,
		notesPerString,
		setNotesPerString,
	} = useFretboard();
```
with:
```tsx
	const {
		displayMode,
		setDisplayMode,
		highlightRoot,
		setHighlightRoot,
		fretRange,
		setFretRange,
		notesPerString,
		setNotesPerString,
	} = useDisplay();
```

### Task 2.10: Migrate `TuningControls.tsx`

**Files:**
- Modify: `src/components/TuningControls.tsx`

- [ ] **Step 1: Swap the hook**

Replace:
```tsx
import { useFretboard } from "@/hooks/useFretboardContext";
```
with:
```tsx
import { useInstrument } from "@/hooks/useFretboardContext";
```

Replace:
```tsx
	const {
		tuning,
		instrumentId,
		setInstrument,
		setStringTuning,
		setStringCount,
	} = useFretboard();
```
with:
```tsx
	const {
		tuning,
		instrumentId,
		setInstrument,
		setStringTuning,
		setStringCount,
	} = useInstrument();
```

- [ ] **Step 2: Type-check the whole app**

Run: `pnpm build`
Expected: no errors now that all consumers are migrated.

### Task 2.11: Migrate the context test

**Files:**
- Modify: `src/hooks/useFretboardContext.test.tsx`

- [ ] **Step 1: Update imports and the hook under test**

Replace:
```tsx
import { FretboardProvider, useFretboard } from "./useFretboardContext";
```
with:
```tsx
import { FretboardProvider, useInstrument } from "./useFretboardContext";
```

Replace every `useFretboard()` call in the file with `useInstrument()` (6 occurrences in `renderHook(() => useFretboard(), ...)`). The `describe` label can stay; the wrapper (`FretboardProvider`) is unchanged.

- [ ] **Step 2: Run the suite**

Run: `pnpm test`
Expected: PASS (all suites — context, tuning, box, instruments, tuningStorage, notes, parser, smoke).

- [ ] **Step 3: Manual smoke**

Run: `pnpm dev`. Confirm: editing notes updates the board, toolbar toggles work, tuning controls work, box patterns render. Stop the server.

- [ ] **Step 4: Commit the whole split**

```bash
git add src/hooks/useFretboardContext.tsx src/components/Fretboard.tsx src/components/BoxPatterns.tsx src/components/Editor.tsx src/components/Toolbar.tsx src/components/TuningControls.tsx src/hooks/useFretboardContext.test.tsx
git commit -m "refactor: split god context into Input/Display/Instrument/Derived"
```

---

## Phase 3a — Spelling layer (#1, visible change)

### Task 3.1: Add spelling types

**Files:**
- Modify: `src/types/music.ts`

- [ ] **Step 1: Add `Letter` and `SpelledNote`, change `NoteSet` and `FretPosition`**

After the `IntervalName` union, add:
```ts
export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

// A note's written form: a letter plus an accidental offset in semitones
// (-2 = double flat, -1 = flat, 0 = natural, +1 = sharp, +2 = double sharp).
export interface SpelledNote {
	letter: Letter;
	accidental: number;
}
```

Change `NoteSet` from:
```ts
export interface NoteSet {
	notes: NoteName[];
	root?: NoteName;
}
```
to:
```ts
export interface NoteSet {
	notes: SpelledNote[];
	root?: SpelledNote;
}
```

Change `FretPosition` from:
```ts
export interface FretPosition {
	string: number; // 1..stringCount (1 = highest pitch, stringCount = lowest pitch)
	fret: number; // 0-22
	note: NoteName;
	interval?: IntervalName;
}
```
to:
```ts
export interface FretPosition {
	string: number; // 1..stringCount (1 = highest pitch, stringCount = lowest pitch)
	fret: number; // 0-22
	note: NoteName; // pitch class — the math identity
	spelled: SpelledNote; // how to label this position
	interval?: IntervalName;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm build`
Expected: FAILS in `notes`/`parser`/`fretboard`/components — fixed in the following tasks. Proceed.

### Task 3.2: Spelling helpers in `notes.ts`

**Files:**
- Modify: `src/core/notes.ts`
- Test: `src/core/notes.test.ts`

- [ ] **Step 1: Write failing tests** (append to `notes.test.ts`)

```ts
import {
	formatSpelled,
	parseSpelledNote,
	spellDegree,
	spelledToPitchClass,
} from "./notes";

describe("spelling helpers", () => {
	it("converts a spelled note to its pitch class", () => {
		expect(spelledToPitchClass({ letter: "D", accidental: -1 })).toBe("C#");
		expect(spelledToPitchClass({ letter: "B", accidental: 0 })).toBe("B");
		expect(spelledToPitchClass({ letter: "F", accidental: 2 })).toBe("G");
	});

	it("formats a spelled note", () => {
		expect(formatSpelled({ letter: "D", accidental: -1 })).toBe("Db");
		expect(formatSpelled({ letter: "F", accidental: 1 })).toBe("F#");
		expect(formatSpelled({ letter: "B", accidental: -2 })).toBe("Bbb");
		expect(formatSpelled({ letter: "F", accidental: 2 })).toBe("Fx");
	});

	it("parses a written note, preserving the chosen accidental", () => {
		expect(parseSpelledNote("Bb")).toEqual({ letter: "B", accidental: -1 });
		expect(parseSpelledNote("c#")).toEqual({ letter: "C", accidental: 1 });
		expect(parseSpelledNote("G")).toEqual({ letter: "G", accidental: 0 });
		expect(parseSpelledNote("H")).toBeNull();
	});

	it("spells a degree from a root and target pitch class", () => {
		// Db major: 4th degree is Gb, not F#
		const root = { letter: "D", accidental: -1 } as const;
		expect(spellDegree(root, 4, "F#")).toEqual({ letter: "G", accidental: -1 });
		// A minor pentatonic: b3 is C
		const a = { letter: "A", accidental: 0 } as const;
		expect(spellDegree(a, 3, "C")).toEqual({ letter: "C", accidental: 0 });
	});
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test -- src/core/notes.test.ts`
Expected: FAIL — `formatSpelled`/etc. not exported.

- [ ] **Step 3: Implement** (append to `notes.ts`)

```ts
import type { Letter, SpelledNote } from "@/types/music";

const LETTERS: Letter[] = ["A", "B", "C", "D", "E", "F", "G"];

// Pitch-class index (into CHROMATIC, where C = 0) of each natural letter.
const LETTER_PITCH_CLASS: Record<Letter, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

export function spelledToPitchClass(s: SpelledNote): NoteName {
	const pc = (((LETTER_PITCH_CLASS[s.letter] + s.accidental) % 12) + 12) % 12;
	return CHROMATIC[pc];
}

export function formatSpelled(s: SpelledNote): string {
	let suffix = "";
	if (s.accidental === 2) suffix = "x";
	else if (s.accidental === -2) suffix = "bb";
	else if (s.accidental > 0) suffix = "#".repeat(s.accidental);
	else if (s.accidental < 0) suffix = "b".repeat(-s.accidental);
	return s.letter + suffix;
}

// Parse a written note like "Bb", "c#", "G" into a SpelledNote (preserving the
// written accidental). Returns null if the letter or accidentals are invalid.
export function parseSpelledNote(input: string): SpelledNote | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	const letter = trimmed.charAt(0).toUpperCase() as Letter;
	if (!LETTERS.includes(letter)) return null;
	const rest = trimmed.slice(1);
	let accidental = 0;
	for (const ch of rest) {
		if (ch === "#") accidental += 1;
		else if (ch === "b" || ch === "B") accidental -= 1;
		else if (ch === "x") accidental += 2;
		else return null;
	}
	if (accidental < -2 || accidental > 2) return null;
	return { letter, accidental };
}

// Spell a scale degree (1..7) from a root, choosing the accidental so the
// result equals `targetPitchClass`. Letter = root letter advanced (degree-1)
// steps; accidental = signed distance from that letter's natural pitch class.
export function spellDegree(
	root: SpelledNote,
	degree: number,
	targetPitchClass: NoteName,
): SpelledNote {
	const rootLetterIdx = LETTERS.indexOf(root.letter);
	const letter = LETTERS[(rootLetterIdx + (degree - 1)) % 7];
	const naturalPc = LETTER_PITCH_CLASS[letter];
	const targetPc = noteIndex(targetPitchClass);
	let accidental = (((targetPc - naturalPc) % 12) + 12) % 12;
	if (accidental > 6) accidental -= 12;
	return { letter, accidental };
}
```

Also add an interval→degree map (used by the parser in Task 3.3). Append:
```ts
export const INTERVAL_DEGREE: Record<IntervalName, number> = {
	"1": 1,
	b2: 2,
	"2": 2,
	b3: 3,
	"3": 3,
	"4": 4,
	b5: 5,
	"5": 5,
	"#5": 5,
	"6": 6,
	b7: 7,
	"7": 7,
};
```

> NOTE: `LETTERS` is referenced before its `const` in `spellDegree`/`parseSpelledNote` only at call time, so ordering inside the module is fine. Keep all new code below the existing exports.

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test -- src/core/notes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/notes.ts src/core/notes.test.ts src/types/music.ts
git commit -m "feat: add note spelling helpers (SpelledNote, spellDegree)"
```

### Task 3.3: Rewrite the parser to produce spellings

**Files:**
- Rewrite: `src/core/parser.ts`
- Modify: `src/core/parser.test.ts`

- [ ] **Step 1: Update the parser tests to the new behavior**

Replace the whole body of `src/core/parser.test.ts` with:
```ts
import { describe, expect, it } from "vitest";
import { formatSpelled } from "./notes";
import { parseInput } from "./parser";

function labels(out: ReturnType<typeof parseInput>): string[] {
	if (!out.success) throw new Error(`expected success, got ${out.error}`);
	return out.noteSet.notes.map(formatSpelled);
}

describe("parseInput — notes mode", () => {
	it("preserves the written accidentals", () => {
		expect(labels(parseInput("C E G Bb"))).toEqual(["C", "E", "G", "Bb"]);
	});

	it("dedupes by pitch class", () => {
		expect(labels(parseInput("C C E"))).toEqual(["C", "E"]);
	});

	it("rejects an invalid note", () => {
		expect(parseInput("C H")).toEqual({
			success: false,
			error: 'Invalid note: "H"',
		});
	});
});

describe("parseInput — intervals mode", () => {
	it("spells each degree on its own letter (A minor pentatonic)", () => {
		const out = parseInput("root: A\n1 b3 4 5 b7");
		expect(labels(out)).toEqual(["A", "C", "D", "E", "G"]);
		if (out.success) expect(out.noteSet.root).toEqual({ letter: "A", accidental: 0 });
	});

	it("uses flats for a flat key (Db major)", () => {
		expect(labels(parseInput("root: Db\n1 2 3 4 5 6 7"))).toEqual([
			"Db",
			"Eb",
			"F",
			"Gb",
			"Ab",
			"Bb",
			"C",
		]);
	});

	it("rejects an invalid interval", () => {
		expect(parseInput("root: A\n1 b9")).toEqual({
			success: false,
			error: 'Invalid interval: "b9"',
		});
	});

	it("rejects an invalid root", () => {
		expect(parseInput("root: H\n1 3 5")).toEqual({
			success: false,
			error: 'Invalid root note: "H"',
		});
	});
});

describe("parseInput — errors", () => {
	it("rejects empty input", () => {
		expect(parseInput("   ")).toEqual({ success: false, error: "Empty input" });
	});
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test -- src/core/parser.test.ts`
Expected: FAIL (parser still emits `NoteName[]`).

- [ ] **Step 3: Replace `src/core/parser.ts`**

```ts
import type { IntervalName, NoteName, ParseOutput, SpelledNote } from "@/types/music";
import {
	INTERVAL_DEGREE,
	isValidInterval,
	parseSpelledNote,
	resolveInterval,
	spellDegree,
	spelledToPitchClass,
} from "./notes";

/**
 * Parses user input text into a NoteSet of SpelledNotes.
 *
 * Supported formats:
 *   Notes mode:     "C E G Bb"   (written accidentals preserved)
 *   Intervals mode: "root: G\n1 b3 4 5 b7"  (each degree spelled on its letter)
 */
export function parseInput(text: string): ParseOutput {
	const trimmed = text.trim();
	if (!trimmed) {
		return { success: false, error: "Empty input" };
	}

	const lines = trimmed
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	const rootLine = lines.find((l) => l.toLowerCase().startsWith("root:"));
	if (rootLine) {
		return parseIntervalsMode(lines, rootLine);
	}
	return parseNotesMode(lines.join(" "));
}

function pushUnique(
	notes: SpelledNote[],
	seen: Set<NoteName>,
	note: SpelledNote,
): void {
	const pc = spelledToPitchClass(note);
	if (!seen.has(pc)) {
		seen.add(pc);
		notes.push(note);
	}
}

function parseNotesMode(text: string): ParseOutput {
	const tokens = text.split(/[\s,]+/).filter(Boolean);
	const notes: SpelledNote[] = [];
	const seen = new Set<NoteName>();

	for (const token of tokens) {
		const note = parseSpelledNote(token);
		if (!note) {
			return { success: false, error: `Invalid note: "${token}"` };
		}
		pushUnique(notes, seen, note);
	}

	if (notes.length === 0) {
		return { success: false, error: "No valid notes found" };
	}

	return { success: true, noteSet: { notes } };
}

function parseIntervalsMode(lines: string[], rootLine: string): ParseOutput {
	const rootValue = rootLine.split(":")[1]?.trim();
	if (!rootValue) {
		return { success: false, error: "Missing root note after 'root:'" };
	}

	const root = parseSpelledNote(rootValue);
	if (!root) {
		return { success: false, error: `Invalid root note: "${rootValue}"` };
	}

	const intervalLines = lines.filter((l) => !l.toLowerCase().startsWith("root:"));
	const tokens = intervalLines.join(" ").split(/[\s,]+/).filter(Boolean);

	if (tokens.length === 0) {
		return { success: false, error: "No intervals provided" };
	}

	const notes: SpelledNote[] = [];
	const seen = new Set<NoteName>();
	for (const token of tokens) {
		if (!isValidInterval(token)) {
			return { success: false, error: `Invalid interval: "${token}"` };
		}
		const interval = token as IntervalName;
		const targetPc = resolveInterval(spelledToPitchClass(root), interval);
		const spelled = spellDegree(root, INTERVAL_DEGREE[interval], targetPc);
		pushUnique(notes, seen, spelled);
	}

	return { success: true, noteSet: { notes, root } };
}
```

> NOTE: `resolveInterval` takes a `NoteName` (pitch class) root and returns the target pitch class; `spellDegree` then decides the written form. Dedup is by pitch class, matching old behavior.

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test -- src/core/parser.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/parser.ts src/core/parser.test.ts
git commit -m "feat: parser emits SpelledNotes with degree-based spelling"
```

### Task 3.4: Stamp `spelled` on fretboard positions

**Files:**
- Modify: `src/core/fretboard.ts`
- Modify: `src/core/fretboard.test.ts`

- [ ] **Step 1: Update `fretboard.test.ts` for the new `NoteSet` shape**

The existing tests build note sets like `{ notes: ["E"] }` and `{ notes: ["E", "G"], root: "E" }`, which are no longer valid (`notes` is `SpelledNote[]`). Add a helper at the top of the file (after the imports) and update each note set:

Add:
```ts
import type { SpelledNote } from "@/types/music";

function n(...letters: string[]): SpelledNote[] {
	return letters.map((l) => ({ letter: l as never, accidental: 0 }));
}
```

Then update the note-set literals:
- `{ notes: ["E"] }` → `{ notes: n("E") }`
- `{ notes: ["E", "A", "D", "G"] }` → `{ notes: n("E", "A", "D", "G") }`
- `{ notes: ["B", "E"] }` → `{ notes: n("B", "E") }`
- `{ notes: ["E", "G"], root: "E" }` → `{ notes: n("E", "G"), root: { letter: "E", accidental: 0 } }`
- `{ notes: ["A", "C", "D", "E", "G"], root: "A" }` → `{ notes: n("A", "C", "D", "E", "G"), root: { letter: "A", accidental: 0 } }`

Add one new assertion inside the `mapNotesToFretboard` describe block:
```ts
	it("stamps the spelled note on each position", () => {
		const positions = mapNotesToFretboard(
			{ notes: [{ letter: "D", accidental: -1 }] },
			GUITAR,
			[0, 12],
		);
		expect(positions.length).toBeGreaterThan(0);
		expect(positions.every((p) => p.note === "C#")).toBe(true);
		expect(positions.every((p) => p.spelled.letter === "D")).toBe(true);
	});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test -- src/core/fretboard.test.ts`
Expected: FAIL — `mapNotesToFretboard` doesn't set `spelled` and the input types changed.

- [ ] **Step 3: Update `fretboard.ts`**

Change the imports at the top from:
```ts
import { CHROMATIC, intervalBetween, noteIndex } from "./notes";
```
to:
```ts
import {
	CHROMATIC,
	intervalBetween,
	noteIndex,
	spelledToPitchClass,
} from "./notes";
```

Replace the body of `mapNotesToFretboard` with:
```ts
export function mapNotesToFretboard(
	noteSet: NoteSet,
	tuning: Tuning,
	fretRange: [number, number] = [0, 12],
): FretPosition[] {
	const [minFret, maxFret] = fretRange;
	const positions: FretPosition[] = [];
	const stringCount = tuning.length;

	const spellingByPc = new Map<NoteName, (typeof noteSet.notes)[number]>();
	for (const s of noteSet.notes) {
		spellingByPc.set(spelledToPitchClass(s), s);
	}
	const rootPc = noteSet.root ? spelledToPitchClass(noteSet.root) : undefined;

	for (let stringIdx = 0; stringIdx < stringCount; stringIdx++) {
		for (let fret = minFret; fret <= Math.min(maxFret, MAX_FRETS); fret++) {
			const note = getNoteAtPosition(tuning, stringIdx, fret);
			const spelled = spellingByPc.get(note);
			if (spelled) {
				const position: FretPosition = {
					string: stringCount - stringIdx,
					fret,
					note,
					spelled,
				};

				if (rootPc) {
					position.interval = intervalBetween(rootPc, note);
				}

				positions.push(position);
			}
		}
	}

	return positions;
}
```

> NOTE: `generateBoxPatterns` is unchanged — it consumes `mapNotesToFretboard` output, which now carries `spelled` automatically. `intervalBetween` still takes pitch classes.

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test -- src/core/fretboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/fretboard.ts src/core/fretboard.test.ts
git commit -m "feat: stamp spelled note on each fret position"
```

### Task 3.5: Label the diagram with spelling; fix root typing

**Files:**
- Modify: `src/components/FretboardDiagram.tsx`

- [ ] **Step 1: Use the spelled label in note mode**

Add to the imports:
```tsx
import { formatSpelled } from "@/core/notes";
```

Replace the `dotLabel` function:
```tsx
	function dotLabel(pos: FretPosition): string {
		if (displayMode === "none") return "";
		if (displayMode === "interval") return pos.interval ?? "";
		return pos.note;
	}
```
with:
```tsx
	function dotLabel(pos: FretPosition): string {
		if (displayMode === "none") return "";
		if (displayMode === "interval") return pos.interval ?? "";
		return formatSpelled(pos.spelled);
	}
```

- [ ] **Step 2: Type-check** (components still compile; `rootPitchClass` is a `NoteName`).

Run: `pnpm build`
Expected: errors only where `noteSet.root` (now `SpelledNote`) is passed as `rootPitchClass` — fixed next. Proceed.

### Task 3.6: Pass root as pitch class in `Fretboard.tsx`

**Files:**
- Modify: `src/components/Fretboard.tsx`

- [ ] **Step 1: Convert `noteSet.root` to a pitch class**

Add import:
```tsx
import { spelledToPitchClass } from "@/core/notes";
```

Replace:
```tsx
				rootPitchClass={noteSet?.root}
```
with:
```tsx
				rootPitchClass={noteSet?.root ? spelledToPitchClass(noteSet.root) : undefined}
```

Also, in the tooltip, the note shown should be the spelled label. Replace, inside `onHoverPosition`:
```tsx
									note: data.pos.note,
```
with:
```tsx
									note: formatSpelled(data.pos.spelled),
```
and add the import:
```tsx
import { formatSpelled, spelledToPitchClass } from "@/core/notes";
```
(combine the two `@/core/notes` imports into one line).

### Task 3.7: Pass root as pitch class in `BoxPatterns.tsx`

**Files:**
- Modify: `src/components/BoxPatterns.tsx`

- [ ] **Step 1: Replace the temporary cast with a real conversion**

Add import:
```tsx
import { spelledToPitchClass } from "@/core/notes";
```

Change the `BoxFretboard` prop type from:
```tsx
	rootPitchClass?: string;
```
to:
```tsx
	rootPitchClass?: import("@/types/music").NoteName;
```
and inside `BoxFretboard`, remove the cast — change:
```tsx
			rootPitchClass={rootPitchClass as never}
```
to:
```tsx
			rootPitchClass={rootPitchClass}
```

At the call site, change:
```tsx
							rootPitchClass={noteSet.root}
```
to:
```tsx
							rootPitchClass={noteSet.root ? spelledToPitchClass(noteSet.root) : undefined}
```

- [ ] **Step 2: Type-check the whole app**

Run: `pnpm build`
Expected: no errors.

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Manual verification of the visible change**

Run: `pnpm dev`. Verify:
- `root: A` + `1 b3 4 5 b7` → dots labeled `A C D E G` (note mode).
- `root: Db` + `1 2 3 4 5 6 7` → labels use flats (`Db Eb F Gb Ab Bb C`).
- Notes mode `C E G Bb` → shows `Bb`, not `A#`.
- Interval mode and root highlight still correct.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/components/FretboardDiagram.tsx src/components/Fretboard.tsx src/components/BoxPatterns.tsx
git commit -m "feat: label fretboard with correct enharmonic spelling"
```

---

## Phase 3b — Derived octave layer (#1, invisible foundation)

### Task 3.8: Add `core/pitch.ts`

**Files:**
- Create: `src/core/pitch.ts`
- Test: `src/core/pitch.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { Tuning } from "@/types/music";
import { assignOctaves, getPitchAtPosition, midiNumber } from "./pitch";

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"];

describe("assignOctaves", () => {
	it("assigns ascending octaves to standard guitar tuning", () => {
		expect(assignOctaves(GUITAR)).toEqual([
			{ note: "E", octave: 2 },
			{ note: "A", octave: 2 },
			{ note: "D", octave: 3 },
			{ note: "G", octave: 3 },
			{ note: "B", octave: 3 },
			{ note: "E", octave: 4 },
		]);
	});
});

describe("getPitchAtPosition", () => {
	it("adds frets to the open string, carrying octaves", () => {
		expect(getPitchAtPosition(GUITAR, 0, 0)).toEqual({ note: "E", octave: 2 });
		expect(getPitchAtPosition(GUITAR, 0, 12)).toEqual({ note: "E", octave: 3 });
		expect(getPitchAtPosition(GUITAR, 0, 8)).toEqual({ note: "C", octave: 3 });
	});
});

describe("midiNumber", () => {
	it("matches the MIDI standard (A4 = 69, C4 = 60)", () => {
		expect(midiNumber({ note: "A", octave: 4 })).toBe(69);
		expect(midiNumber({ note: "C", octave: 4 })).toBe(60);
		expect(midiNumber({ note: "E", octave: 2 })).toBe(40);
	});
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test -- src/core/pitch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/pitch.ts`**

```ts
import type { NoteName, Tuning } from "@/types/music";
import { CHROMATIC, noteIndex } from "./notes";

// A sounding pitch: a pitch class plus an octave number (scientific pitch
// notation, where middle C is C4). Spelling is intentionally NOT part of a
// Pitch — how a note is written depends on musical context (the note set),
// whereas a Pitch is an absolute, orderable sound. Use this as the foundation
// for future audio playback and pitch sorting.
export interface Pitch {
	note: NoteName;
	octave: number;
}

// Assign octaves to a low→high tuning. The octave increments whenever the next
// string's pitch class does not rise above the previous one (the normal case
// for ascending tunings). baseOctave is the octave of the lowest string.
export function assignOctaves(tuning: Tuning, baseOctave = 2): Pitch[] {
	const pitches: Pitch[] = [];
	let octave = baseOctave;
	let prevIdx = -1;
	for (const note of tuning) {
		const idx = noteIndex(note);
		if (prevIdx !== -1 && idx <= prevIdx) octave += 1;
		pitches.push({ note, octave });
		prevIdx = idx;
	}
	return pitches;
}

export function getPitchAtPosition(
	tuning: Tuning,
	stringIndex: number,
	fret: number,
	baseOctave = 2,
): Pitch {
	const open = assignOctaves(tuning, baseOctave)[stringIndex];
	const semitones = noteIndex(open.note) + fret;
	const note = CHROMATIC[((semitones % 12) + 12) % 12];
	const octave = open.octave + Math.floor(semitones / 12);
	return { note, octave };
}

// MIDI note number: C4 = 60, A4 = 69.
export function midiNumber(pitch: Pitch): number {
	return (pitch.octave + 1) * 12 + noteIndex(pitch.note);
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test -- src/core/pitch.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + build**

Run: `pnpm test` then `pnpm build`
Expected: PASS / no errors.

- [ ] **Step 6: Commit**

```bash
git add src/core/pitch.ts src/core/pitch.test.ts
git commit -m "feat: add derived octave/pitch layer (foundation)"
```

---

## Phase 4 — `CLAUDE.md` coverage for every folder

> Each doc follows: **Purpose · Key files · Conventions · Gotchas · What NOT to do**. Content below reflects the post-refactor state.

### Task 4.1: Update root `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the "Conventions" section** so it reflects spelling + the shared diagram + split context. Add these bullets to the `## Conventions` list (keep the existing ones about alias, quotes, functional components, instruments, tuning, shadcn):

```md
- Pitch class is the source of truth for all music math; **spelling** (letter+accidental) and **octave** are additive layers — never normalize spelling away to sharps in core math
- The fretboard SVG lives in ONE primitive, `components/FretboardDiagram.tsx`; never duplicate it
- App state is four focused contexts (Input / Display / Instrument / Derived) composed by `FretboardProvider`; subscribe to the narrowest hook you need
- Octaves are **derived** from the low→high tuning (`core/pitch.ts`), never stored
```

Also fix the formatting note to match reality (Biome here keeps semicolons). Change the `## Conventions` bullet `Double quotes, no semicolons (Biome handles formatting)` to:
```md
- Double quotes, tabs, semicolons; Biome handles formatting (run `pnpm lint:fix`)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update root CLAUDE.md for spelling, shared diagram, split context"
```

### Task 4.2: Update `src/core/CLAUDE.md`

**Files:**
- Modify: `src/core/CLAUDE.md`

- [ ] **Step 1: Replace the file contents**

```md
# Core — Music Theory Logic

Pure TypeScript. No React, no DOM. Everything here is unit-testable in isolation.

## Modules

### notes.ts
- `CHROMATIC` pitch classes (sharps): `C C# D D# E F F# G G# A A# B`.
- `normalizeNote` (flats/case → sharp pitch class), `transpose`, `intervalBetween`, `resolveInterval`, `isValidInterval`.
- **Spelling layer:** `SpelledNote = { letter, accidental }`; `spelledToPitchClass`, `formatSpelled`, `parseSpelledNote` (preserves written accidentals), `spellDegree` (degree-based spelling), `INTERVAL_DEGREE`.

### parser.ts
- Notes mode `"C E G Bb"` → preserves written accidentals.
- Intervals mode `root: G` + `1 b3 4 5 b7` → each degree spelled on its own letter via `spellDegree`.
- Output: `NoteSet { notes: SpelledNote[], root?: SpelledNote }`. Dedup is by pitch class.

### fretboard.ts
- Tuning passed in as `NoteName[]` (low→high, index 0 = lowest string); no hardcoded tuning.
- `mapNotesToFretboard(noteSet, tuning, range)` matches positions by pitch class and stamps both `note` (pitch class) and `spelled` (label) on each `FretPosition`.
- `generateBoxPatterns` references the lowest string. (Known limitation: guitar-scale heuristic; out of scope to fix here.)

### pitch.ts
- `Pitch = { note, octave }` — absolute sounding pitch. Spelling is deliberately NOT part of Pitch (it's context-dependent).
- `assignOctaves` derives octaves from a low→high tuning; `getPitchAtPosition`; `midiNumber`.
- Foundation for future audio/sorting — nothing consumes it yet.

## Key invariant
Pitch class is the math identity. Spelling and octave are additive layers on top.

## What NOT to do
- Don't add React/DOM imports here.
- Don't collapse spelling back to sharps in core math.
- Don't store octaves — they're derived from the tuning.
```

- [ ] **Step 2: Commit**

```bash
git add src/core/CLAUDE.md
git commit -m "docs: rewrite core CLAUDE.md for spelling + pitch modules"
```

### Task 4.3: Update `src/components/CLAUDE.md`

**Files:**
- Modify: `src/components/CLAUDE.md`

- [ ] **Step 1: Replace the "Components" + "State" sections** with content describing the shared diagram and split context. Replace the whole file with:

```md
# Components — UI Layer

React components consuming data from `@/core` and the split contexts in `@/hooks`.
All rendering uses shadcn/ui primitives + SVG.

## Layout
Vertical stack: Editor → TuningControls → Toolbar → Fretboard → BoxPatterns (see `App.tsx`).

## Components

### FretboardDiagram (the one SVG primitive)
- Pure presentational SVG. Takes `positions`, `stringCount`, fret window, a `dimensions` preset, display options, optional `onHoverPosition`.
- Two presets: `MAIN_DIMENSIONS`, `BOX_DIMENSIONS`. **All pixel values live here** — never hardcode geometry in a consumer.
- Labels via `formatSpelled(pos.spelled)` in note mode; root highlight compares `rootPitchClass` to `pos.note`.

### Fretboard
- Thin wrapper: pulls from `useDerived`/`useDisplay`/`useInput`/`useInstrument`, renders `<FretboardDiagram dimensions={MAIN_DIMENSIONS}>`, owns the tooltip overlay.

### BoxPatterns
- Thin wrapper: computes each box's display window, renders `<FretboardDiagram dimensions={BOX_DIMENSIONS}>` (no tooltip).

### Editor / Toolbar / TuningControls
- `Editor` → `useInput`; `Toolbar` → `useDisplay`; `TuningControls` → `useInstrument`.

## State
Four focused contexts composed by `FretboardProvider` (`@/hooks`): Input, Display, Instrument, Derived. Subscribe to the narrowest hook you need.

## What NOT to do
- Don't duplicate the fretboard SVG — extend `FretboardDiagram`.
- Don't read the whole context — use the specific hook.
- Don't put layout constants in a consumer — add them to a dimensions preset.
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CLAUDE.md
git commit -m "docs: rewrite components CLAUDE.md for shared diagram + hooks"
```

### Task 4.4: Create `src/hooks/CLAUDE.md`

**Files:**
- Create: `src/hooks/CLAUDE.md`

- [ ] **Step 1: Write the file**

```md
# Hooks — App State (split contexts)

State is split into four focused React contexts, each its own file, composed by
`FretboardProvider`. Components subscribe only to what they use, so unrelated
updates don't re-render them.

## Files
- `InputContext.tsx` — `useInput`: `inputText`, `setInputText`, derived `noteSet`, `parseError`.
- `DisplayContext.tsx` — `useDisplay`: `displayMode`, `highlightRoot`, `fretRange`, `notesPerString` + setters.
- `InstrumentContext.tsx` — `useInstrument`: `tuning`, `instrumentId`, `setInstrument`, `setStringTuning`, `setStringCount` + localStorage persistence.
- `DerivedContext.tsx` — `useDerived`: `positions`, `boxPatterns` (memoized from the other three).
- `useFretboardContext.tsx` — composes `FretboardProvider` and re-exports the four hooks.

## Conventions
- One concern per context. If new state appears, put it in the matching context (or add a new one), not a god object.
- `DerivedProvider` must stay innermost — it consumes the other three hooks.

## What NOT to do
- Don't reintroduce a single `useFretboard()` that returns everything.
- Don't compute `positions`/`boxPatterns` in components — they live in `DerivedContext`.
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/CLAUDE.md
git commit -m "docs: add hooks CLAUDE.md"
```

### Task 4.5: Create `src/types/CLAUDE.md`

**Files:**
- Create: `src/types/CLAUDE.md`

- [ ] **Step 1: Write the file**

```md
# Types — Shared Domain Types

`music.ts` holds the shared TypeScript types. No logic.

## Key types
- `NoteName` — the 12 pitch classes as sharps. The **math identity**.
- `IntervalName` — chromatic degree tokens (`1 b2 2 b3 3 4 b5 5 #5 6 b7 7`).
- `Letter` / `SpelledNote` — written form (letter + accidental offset). The **label identity**.
- `NoteSet` — `{ notes: SpelledNote[]; root?: SpelledNote }`.
- `FretPosition` — `{ string, fret, note (pitch class), spelled, interval? }`.
- `Tuning` — `NoteName[]`, low→high (index 0 = lowest string).
- `BoxPattern`, `InstrumentPreset`, parse result/error unions.

## Gotchas
- `note` (pitch class) and `spelled` (label) coexist on `FretPosition` on purpose — math uses `note`, rendering uses `spelled`.
- Pitch/octave types live in `core/pitch.ts`, not here (they belong with the pitch logic).

## What NOT to do
- Don't drop `NoteName` in favor of `SpelledNote` — pitch class is the lookup key.
```

- [ ] **Step 2: Commit**

```bash
git add src/types/CLAUDE.md
git commit -m "docs: add types CLAUDE.md"
```

### Task 4.6: Create `src/lib/CLAUDE.md`

**Files:**
- Create: `src/lib/CLAUDE.md`

- [ ] **Step 1: Write the file**

```md
# Lib — Utilities & Persistence

## Files
- `utils.ts` — shadcn `cn()` class-name helper. Leave as the shadcn default.
- `tuningStorage.ts` — load/save the tuning to localStorage (`fretboard.tuning`). Validates shape on load and falls back to the default instrument on anything invalid.

## Conventions
- Persisted tuning is `NoteName[]` (pitch classes). Octaves are NOT persisted — they're derived in `core/pitch.ts`.
- Storage access is wrapped in try/catch (private mode / quota).

## What NOT to do
- Don't widen the stored schema to include octaves or spelling — keep it pitch-class only.
- This is a one-off, not a generic persistence framework; if a second persisted concern appears, that's when to generalize (currently out of scope).
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/CLAUDE.md
git commit -m "docs: add lib CLAUDE.md"
```

### Task 4.7: Create `src/test/CLAUDE.md`

**Files:**
- Create: `src/test/CLAUDE.md`

- [ ] **Step 1: Write the file**

```md
# Test — Vitest Setup

## Files
- `setup.ts` — global test setup: jest-dom matchers, RTL cleanup, and a jsdom `localStorage`/`sessionStorage` patch (Node exposes a non-functional global that shadows jsdom's).
- `smoke.test.ts` — trivial harness sanity check.

## Conventions
- Tests live next to their subject (`*.test.ts[x]`), not in this folder; this folder is only shared setup.
- Run all: `pnpm test`. Watch: `pnpm test:watch`. Single file: `pnpm test -- path/to/file.test.ts`.
- Core logic (`core/`) is pure — test it directly. Components/hooks use Testing Library with `FretboardProvider`.

## What NOT to do
- Don't remove the localStorage patch — tuning persistence tests rely on it.
```

- [ ] **Step 2: Commit**

```bash
git add src/test/CLAUDE.md
git commit -m "docs: add test CLAUDE.md"
```

### Task 4.8: Create `src/components/ui/CLAUDE.md`

**Files:**
- Create: `src/components/ui/CLAUDE.md`

- [ ] **Step 1: Write the file**

```md
# UI — shadcn/ui Primitives

Generated shadcn/ui primitives (e.g. `select.tsx`). Treat as vendored.

## Conventions
- Add new primitives with the shadcn CLI, don't hand-write them.
- App components import from here; don't put app-specific logic in these files.

## What NOT to do
- Don't hand-edit generated primitives beyond what shadcn supports — customizations belong in the consuming component.
```

- [ ] **Step 2: Final full verification**

Run: `pnpm test` then `pnpm build` then `pnpm lint`
Expected: tests PASS, build clean, lint clean (run `pnpm lint:fix` if needed and amend).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/CLAUDE.md
git commit -m "docs: add components/ui CLAUDE.md"
```

---

## Final Self-Review Checklist (run after implementation)

- [ ] `pnpm test` green, `pnpm build` clean, `pnpm lint` clean.
- [ ] Main fretboard and box patterns look identical to pre-refactor (Phases 1–2).
- [ ] Spelling verified manually: `root: Db` shows flats; `root: A` pentatonic shows `A C D E G`; notes mode preserves `Bb`.
- [ ] Every folder has a `CLAUDE.md`: root, `src/core`, `src/components`, `src/components/ui`, `src/hooks`, `src/types`, `src/lib`, `src/test`.
- [ ] No `useFretboard()` references remain (`grep -r "useFretboard\b" src` returns nothing).
- [ ] `#4` box algorithm, parser-syntax expansion, generalized persistence, and audio remain explicitly out of scope.
```
