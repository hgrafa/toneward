# Instruments & Custom Tunings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick preset instruments (Guitar 6, Bass 4, Bass 5) and freely retune any string — including changing string count — with the fretboard, box patterns, and export all adapting to the active tuning.

**Architecture:** A tuning is plain data (`NoteName[]`, low→high) threaded through the existing pure core functions; string count is always `tuning.length`. React Context holds the tuning, derives the instrument id via `matchInstrument`, and persists `{instrumentId, tuning}` to localStorage. New toolbar `TuningControls` (shadcn `Select`) edits it. Both SVG diagrams derive string count from the tuning instead of a hardcoded constant.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind v4 + shadcn/ui (Radix `Select`), Vitest + @testing-library/react (introduced in Task 1), Biome.

**Reference spec:** `docs/superpowers/specs/2026-05-30-instruments-and-tunings-design.md`

**Conventions:** Double quotes, no semicolons (Biome). Import alias `@/` → `src/`. Pure `core/` has no React. String numbering: string `1` = highest pitch (top), string `N` = lowest (bottom); `tuning[0]` is the lowest string. Run `pnpm build` with `pnpm config set verify-deps-before-run false` already set in this worktree (esbuild's postinstall is skipped but unnecessary).

---

## Task 1: Set up Vitest + testing-library

**Files:**
- Modify: `package.json` (add devDeps + `test` script)
- Modify: `tsconfig.app.json` (exclude test files from the production type-check)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `src/test/smoke.test.ts`

- [ ] **Step 1: Install test dependencies**

Run:
```bash
pnpm add -D vitest@^3 jsdom@^25 @testing-library/react@^16 @testing-library/dom@^10 @testing-library/jest-dom@^6
```
Expected: packages added to `devDependencies`. If the install prints `ERR_PNPM_IGNORED_BUILDS`, that is the pre-existing esbuild/msw warning and is safe to ignore.

- [ ] **Step 2: Create the test setup file**

Create `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
	cleanup()
})
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { "@": resolve(__dirname, "./src") },
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
	},
})
```

- [ ] **Step 4: Add the `test` script**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Exclude test files from the production type-check**

`tsconfig.app.json` has `"include": ["src"]`, so `tsc -b` would otherwise type-check `.test` files (and need their dev-only types) during `pnpm build`. Vitest does its own resolution, so exclude them from the app build. In `tsconfig.app.json`, add a sibling key to `"include"`:
```json
	"include": ["src"],
	"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
```

- [ ] **Step 6: Write a smoke test**

Create `src/test/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest"

describe("test harness", () => {
	it("runs", () => {
		expect(1 + 1).toBe(2)
	})
})
```

- [ ] **Step 7: Run the smoke test**

Run: `pnpm test`
Expected: PASS — 1 passed.

- [ ] **Step 8: Confirm build + lint stay green**

Run: `pnpm build && pnpm lint`
Expected: both succeed. (If Biome flags `vitest.config.ts` `__dirname`, it is a Node global and acceptable; do not change it.)

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.app.json vitest.config.ts src/test/setup.ts src/test/smoke.test.ts
git commit -m "test: set up Vitest with jsdom and testing-library"
```

---

## Task 2: Tuning types + instrument presets

**Files:**
- Modify: `src/types/music.ts`
- Create: `src/core/instruments.ts`
- Test: `src/core/instruments.test.ts`

- [ ] **Step 1: Add the types**

In `src/types/music.ts`, add at the end:
```ts
// Open note of each string, LOW → HIGH (index 0 = lowest-pitched string).
export type Tuning = NoteName[]

export interface InstrumentPreset {
	id: string
	name: string
	tuning: Tuning
}
```
Also update the comment on `FretPosition.string` from `// 1-6 (1 = high E, 6 = low E)` to `// 1..stringCount (1 = highest pitch, stringCount = lowest pitch)`.

- [ ] **Step 2: Write the failing test**

Create `src/core/instruments.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import {
	CUSTOM_ID,
	DEFAULT_INSTRUMENT,
	INSTRUMENTS,
	matchInstrument,
} from "./instruments"

describe("instruments", () => {
	it("defaults to 6-string guitar", () => {
		expect(DEFAULT_INSTRUMENT.id).toBe("guitar-6")
		expect(DEFAULT_INSTRUMENT.tuning).toEqual(["E", "A", "D", "G", "B", "E"])
	})

	it("ships guitar, bass-4 and bass-5 presets", () => {
		expect(INSTRUMENTS.map((i) => i.id)).toEqual([
			"guitar-6",
			"bass-4",
			"bass-5",
		])
	})

	it("matches a tuning that equals a preset", () => {
		expect(matchInstrument(["E", "A", "D", "G"])).toBe("bass-4")
		expect(matchInstrument(["B", "E", "A", "D", "G"])).toBe("bass-5")
	})

	it("returns custom for a non-preset tuning", () => {
		expect(matchInstrument(["D", "A", "D", "G", "B", "E"])).toBe(CUSTOM_ID)
		expect(matchInstrument(["E", "A", "D"])).toBe(CUSTOM_ID)
	})
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test src/core/instruments.test.ts`
Expected: FAIL — cannot find module `./instruments`.

- [ ] **Step 4: Implement the module**

Create `src/core/instruments.ts`:
```ts
import type { InstrumentPreset, Tuning } from "@/types/music"

export const INSTRUMENTS: InstrumentPreset[] = [
	{ id: "guitar-6", name: "Guitar", tuning: ["E", "A", "D", "G", "B", "E"] },
	{ id: "bass-4", name: "Bass (4)", tuning: ["E", "A", "D", "G"] },
	{ id: "bass-5", name: "Bass (5)", tuning: ["B", "E", "A", "D", "G"] },
]

export const DEFAULT_INSTRUMENT = INSTRUMENTS[0]
export const CUSTOM_ID = "custom"

export function matchInstrument(tuning: Tuning): string {
	for (const inst of INSTRUMENTS) {
		if (
			inst.tuning.length === tuning.length &&
			inst.tuning.every((note, i) => note === tuning[i])
		) {
			return inst.id
		}
	}
	return CUSTOM_ID
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test src/core/instruments.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/types/music.ts src/core/instruments.ts src/core/instruments.test.ts
git commit -m "feat: add tuning types and instrument presets"
```

---

## Task 3: Refactor core fretboard functions to take a tuning

**Files:**
- Modify: `src/core/fretboard.ts`
- Modify: `src/hooks/useFretboardContext.tsx` (keep build green with a temporary default tuning)
- Test: `src/core/fretboard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/fretboard.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import type { NoteSet, Tuning } from "@/types/music"
import {
	generateBoxPatterns,
	getNoteAtPosition,
	mapNotesToFretboard,
} from "./fretboard"

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"]
const BASS4: Tuning = ["E", "A", "D", "G"]

describe("getNoteAtPosition", () => {
	it("returns the open note at fret 0", () => {
		expect(getNoteAtPosition(GUITAR, 0, 0)).toBe("E")
		expect(getNoteAtPosition(GUITAR, 1, 0)).toBe("A")
	})

	it("adds semitones for higher frets, wrapping the octave", () => {
		// low E string, fret 5 = A
		expect(getNoteAtPosition(GUITAR, 0, 5)).toBe("A")
		// low E string, fret 12 = E
		expect(getNoteAtPosition(GUITAR, 0, 12)).toBe("E")
	})
})

describe("mapNotesToFretboard", () => {
	it("uses string numbers 1..stringCount with 1 = highest pitch", () => {
		const noteSet: NoteSet = { notes: ["E"] }
		const positions = mapNotesToFretboard(noteSet, GUITAR, [0, 0])
		// Two open E strings on guitar: string 1 (high E) and string 6 (low E)
		const strings = positions.map((p) => p.string).sort((a, b) => a - b)
		expect(strings).toEqual([1, 6])
	})

	it("adapts to a 4-string tuning", () => {
		const noteSet: NoteSet = { notes: ["E", "A", "D", "G"] }
		const positions = mapNotesToFretboard(noteSet, BASS4, [0, 0])
		// One open note per string → strings 1..4
		expect(positions.map((p) => p.string).sort((a, b) => a - b)).toEqual([
			1, 2, 3, 4,
		])
	})

	it("computes intervals relative to the root", () => {
		const noteSet: NoteSet = { notes: ["E", "G"], root: "E" }
		const positions = mapNotesToFretboard(noteSet, GUITAR, [0, 3])
		const g = positions.find((p) => p.note === "G")
		expect(g?.interval).toBe("b3")
	})
})

describe("generateBoxPatterns", () => {
	it("generates patterns referenced off the lowest string for any tuning", () => {
		const noteSet: NoteSet = { notes: ["A", "C", "D", "E", "G"], root: "A" }
		const guitarBoxes = generateBoxPatterns(noteSet, GUITAR, 2)
		const bassBoxes = generateBoxPatterns(noteSet, BASS4, 2)
		expect(guitarBoxes.length).toBeGreaterThan(0)
		expect(bassBoxes.length).toBeGreaterThan(0)
		// Every box position is a valid string for its instrument
		expect(guitarBoxes[0].positions.every((p) => p.string >= 1 && p.string <= 6)).toBe(true)
		expect(bassBoxes[0].positions.every((p) => p.string >= 1 && p.string <= 4)).toBe(true)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/core/fretboard.test.ts`
Expected: FAIL — `getNoteAtPosition` expects 2 args / type errors (signature still old).

- [ ] **Step 3: Rewrite `src/core/fretboard.ts`**

Replace the file contents with:
```ts
import type {
	BoxPattern,
	FretPosition,
	NoteName,
	NoteSet,
	Tuning,
} from "@/types/music"
import { CHROMATIC, intervalBetween, noteIndex } from "./notes"

const MAX_FRETS = 22

// stringIndex = index into tuning (0 = lowest-pitched string).
export function getNoteAtPosition(
	tuning: Tuning,
	stringIndex: number,
	fret: number,
): NoteName {
	const openNote = tuning[stringIndex]
	const semitones = noteIndex(openNote) + fret
	return CHROMATIC[((semitones % 12) + 12) % 12]
}

export function mapNotesToFretboard(
	noteSet: NoteSet,
	tuning: Tuning,
	fretRange: [number, number] = [0, 12],
): FretPosition[] {
	const [minFret, maxFret] = fretRange
	const positions: FretPosition[] = []
	const noteSetLookup = new Set(noteSet.notes)
	const stringCount = tuning.length

	for (let stringIdx = 0; stringIdx < stringCount; stringIdx++) {
		for (let fret = minFret; fret <= Math.min(maxFret, MAX_FRETS); fret++) {
			const note = getNoteAtPosition(tuning, stringIdx, fret)
			if (noteSetLookup.has(note)) {
				const position: FretPosition = {
					string: stringCount - stringIdx, // 1 = highest pitch
					fret,
					note,
				}

				if (noteSet.root) {
					position.interval = intervalBetween(noteSet.root, note)
				}

				positions.push(position)
			}
		}
	}

	return positions
}

// Fret markers: single dot at these frets, double dot at 12
export const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_DOT_FRETS = [12]

/**
 * Generates box patterns (positional regions) from a note set.
 *
 * Algorithm: uses the lowest string (string === tuning.length) as reference.
 * Each box starts at the next scale degree on that string. For other strings,
 * picks the N closest notes to the reference fret position.
 */
export function generateBoxPatterns(
	noteSet: NoteSet,
	tuning: Tuning,
	notesPerString: number = 2,
): BoxPattern[] {
	const stringCount = tuning.length
	const allPositions = mapNotesToFretboard(noteSet, tuning, [0, 17])

	const byString = new Map<number, FretPosition[]>()
	for (const pos of allPositions) {
		const list = byString.get(pos.string) ?? []
		list.push(pos)
		byString.set(pos.string, list)
	}
	for (const list of byString.values()) {
		list.sort((a, b) => a.fret - b.fret)
	}

	const refString = byString.get(stringCount) ?? []
	const numBoxes = Math.min(
		5,
		Math.max(0, refString.length - notesPerString + 1),
	)
	const boxes: BoxPattern[] = []

	for (let boxIdx = 0; boxIdx < numBoxes; boxIdx++) {
		const boxPositions: FretPosition[] = []
		const refStartFret = refString[boxIdx].fret

		for (let str = stringCount; str >= 1; str--) {
			const notes = byString.get(str) ?? []
			let startIdx = notes.findIndex((n) => n.fret >= refStartFret - 1)
			if (startIdx === -1)
				startIdx = Math.max(0, notes.length - notesPerString)

			const end = Math.min(startIdx + notesPerString, notes.length)
			for (let i = startIdx; i < end; i++) {
				boxPositions.push(notes[i])
			}
		}

		if (boxPositions.length === 0) continue

		const frets = boxPositions.map((p) => p.fret)
		boxes.push({
			index: boxIdx,
			positions: boxPositions,
			minFret: Math.min(...frets),
			maxFret: Math.max(...frets),
		})
	}

	return boxes
}
```

- [ ] **Step 4: Keep the app building — patch the two call sites temporarily**

In `src/hooks/useFretboardContext.tsx`, add this import near the other `@/core` imports:
```ts
import { DEFAULT_INSTRUMENT } from "@/core/instruments"
```
Update the two memo bodies to pass the default tuning (this is replaced by real tuning state in Task 5):
```ts
	const positions = useMemo(() => {
		if (!noteSet) return []
		return mapNotesToFretboard(noteSet, DEFAULT_INSTRUMENT.tuning, fretRange)
	}, [noteSet, fretRange])

	const boxPatterns = useMemo(() => {
		if (!noteSet) return []
		return generateBoxPatterns(
			noteSet,
			DEFAULT_INSTRUMENT.tuning,
			notesPerString,
		)
	}, [noteSet, notesPerString])
```

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm test src/core/fretboard.test.ts`
Expected: PASS.
Run: `pnpm build`
Expected: type-check + build succeed (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/core/fretboard.ts src/core/fretboard.test.ts src/hooks/useFretboardContext.tsx
git commit -m "refactor: thread tuning through core fretboard functions"
```

---

## Task 4: localStorage tuning persistence helper

**Files:**
- Create: `src/lib/tuningStorage.ts`
- Test: `src/lib/tuningStorage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/tuningStorage.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest"
import { loadTuningState, saveTuningState } from "./tuningStorage"

describe("tuningStorage", () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it("returns the default 6-string guitar when nothing is stored", () => {
		const state = loadTuningState()
		expect(state.instrumentId).toBe("guitar-6")
		expect(state.tuning).toEqual(["E", "A", "D", "G", "B", "E"])
	})

	it("round-trips a saved tuning and derives the instrument id", () => {
		saveTuningState({ instrumentId: "bass-4", tuning: ["E", "A", "D", "G"] })
		const state = loadTuningState()
		expect(state.tuning).toEqual(["E", "A", "D", "G"])
		expect(state.instrumentId).toBe("bass-4")
	})

	it("derives custom for a non-preset tuning", () => {
		saveTuningState({ instrumentId: "guitar-6", tuning: ["D", "A", "D", "G", "B", "E"] })
		expect(loadTuningState().instrumentId).toBe("custom")
	})

	it("falls back to default on corrupt or invalid data", () => {
		localStorage.setItem("fretboard.tuning", "not json")
		expect(loadTuningState().instrumentId).toBe("guitar-6")
		localStorage.setItem("fretboard.tuning", JSON.stringify({ tuning: ["Z", "Q"] }))
		expect(loadTuningState().instrumentId).toBe("guitar-6")
		localStorage.setItem("fretboard.tuning", JSON.stringify({ tuning: [] }))
		expect(loadTuningState().instrumentId).toBe("guitar-6")
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/tuningStorage.test.ts`
Expected: FAIL — cannot find module `./tuningStorage`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/tuningStorage.ts`:
```ts
import { DEFAULT_INSTRUMENT, matchInstrument } from "@/core/instruments"
import { CHROMATIC } from "@/core/notes"
import type { NoteName, Tuning } from "@/types/music"

const STORAGE_KEY = "fretboard.tuning"

export interface TuningState {
	instrumentId: string
	tuning: Tuning
}

function defaultState(): TuningState {
	return {
		instrumentId: DEFAULT_INSTRUMENT.id,
		tuning: [...DEFAULT_INSTRUMENT.tuning],
	}
}

function isValidTuning(value: unknown): value is Tuning {
	return (
		Array.isArray(value) &&
		value.length >= 1 &&
		value.length <= 12 &&
		value.every((note) => CHROMATIC.includes(note as NoteName))
	)
}

export function loadTuningState(): TuningState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return defaultState()
		const parsed = JSON.parse(raw)
		if (!isValidTuning(parsed?.tuning)) return defaultState()
		const tuning = parsed.tuning as Tuning
		return { tuning, instrumentId: matchInstrument(tuning) }
	} catch {
		return defaultState()
	}
}

export function saveTuningState(state: TuningState): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {
		// storage unavailable (private mode / quota) — ignore
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/tuningStorage.test.ts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tuningStorage.ts src/lib/tuningStorage.test.ts
git commit -m "feat: add validated localStorage tuning persistence"
```

---

## Task 5: Wire tuning state into the context

**Files:**
- Modify: `src/hooks/useFretboardContext.tsx`
- Test: `src/hooks/useFretboardContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useFretboardContext.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { FretboardProvider, useFretboard } from "./useFretboardContext"

function wrapper({ children }: { children: ReactNode }) {
	return <FretboardProvider>{children}</FretboardProvider>
}

describe("useFretboard tuning state", () => {
	beforeEach(() => localStorage.clear())

	it("defaults to 6-string guitar", () => {
		const { result } = renderHook(() => useFretboard(), { wrapper })
		expect(result.current.tuning).toEqual(["E", "A", "D", "G", "B", "E"])
		expect(result.current.instrumentId).toBe("guitar-6")
	})

	it("applies a preset via setInstrument", () => {
		const { result } = renderHook(() => useFretboard(), { wrapper })
		act(() => result.current.setInstrument("bass-4"))
		expect(result.current.tuning).toEqual(["E", "A", "D", "G"])
		expect(result.current.instrumentId).toBe("bass-4")
	})

	it("editing a string makes the instrument custom", () => {
		const { result } = renderHook(() => useFretboard(), { wrapper })
		act(() => result.current.setStringTuning(0, "D"))
		expect(result.current.tuning[0]).toBe("D")
		expect(result.current.instrumentId).toBe("custom")
	})

	it("adds and removes strings at the low-pitch end", () => {
		const { result } = renderHook(() => useFretboard(), { wrapper })
		act(() => result.current.setInstrument("bass-4")) // E A D G
		act(() => result.current.setStringCount(5))
		expect(result.current.tuning).toEqual(["E", "E", "A", "D", "G"])
		act(() => result.current.setStringCount(4))
		expect(result.current.tuning).toEqual(["E", "A", "D", "G"])
	})

	it("clamps string count to 1..12", () => {
		const { result } = renderHook(() => useFretboard(), { wrapper })
		act(() => result.current.setStringCount(99))
		expect(result.current.tuning.length).toBe(12)
		act(() => result.current.setStringCount(0))
		expect(result.current.tuning.length).toBe(1)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/hooks/useFretboardContext.test.tsx`
Expected: FAIL — `tuning` / `setInstrument` etc. do not exist on the context.

- [ ] **Step 3: Update the context**

In `src/hooks/useFretboardContext.tsx`:

(a) Update imports — replace the `DEFAULT_INSTRUMENT` import added in Task 3 and add the others:
```ts
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react"
import { generateBoxPatterns, mapNotesToFretboard } from "@/core/fretboard"
import { matchInstrument, INSTRUMENTS } from "@/core/instruments"
import { parseInput } from "@/core/parser"
import {
	loadTuningState,
	saveTuningState,
} from "@/lib/tuningStorage"
import type {
	BoxPattern,
	DisplayMode,
	FretPosition,
	NoteName,
	NoteSet,
	ParseError,
	Tuning,
} from "@/types/music"
```

(b) Add the new fields to the `FretboardState` interface (after `setNotesPerString`):
```ts
	tuning: Tuning
	instrumentId: string
	setInstrument: (id: string) => void
	setStringTuning: (stringIndex: number, note: NoteName) => void
	setStringCount: (n: number) => void
```

(c) Add state + actions inside `FretboardProvider`, after the `notesPerString` state line:
```ts
	const [tuning, setTuning] = useState<Tuning>(() => loadTuningState().tuning)
	const instrumentId = useMemo(() => matchInstrument(tuning), [tuning])

	useEffect(() => {
		saveTuningState({ instrumentId, tuning })
	}, [instrumentId, tuning])

	const setInstrument = useCallback((id: string) => {
		const inst = INSTRUMENTS.find((i) => i.id === id)
		if (!inst) return
		setTuning([...inst.tuning])
	}, [])

	const setStringTuning = useCallback(
		(stringIndex: number, note: NoteName) => {
			setTuning((prev) => {
				const next = [...prev]
				next[stringIndex] = note
				return next
			})
		},
		[],
	)

	const setStringCount = useCallback((n: number) => {
		const count = Math.max(1, Math.min(12, n))
		setTuning((prev) => {
			if (count === prev.length) return prev
			if (count < prev.length) {
				// drop lowest strings (start of the low→high array)
				return prev.slice(prev.length - count)
			}
			const toAdd = count - prev.length
			return [...(Array(toAdd).fill("E") as NoteName[]), ...prev]
		})
	}, [])
```

(d) Replace the two memo bodies to use `tuning` (removing the temporary `DEFAULT_INSTRUMENT` usage from Task 3):
```ts
	const positions = useMemo(() => {
		if (!noteSet) return []
		return mapNotesToFretboard(noteSet, tuning, fretRange)
	}, [noteSet, tuning, fretRange])

	const boxPatterns = useMemo(() => {
		if (!noteSet) return []
		return generateBoxPatterns(noteSet, tuning, notesPerString)
	}, [noteSet, tuning, notesPerString])
```

(e) Add the new fields to the `value` object and its dependency array:
```ts
			tuning,
			instrumentId,
			setInstrument,
			setStringTuning,
			setStringCount,
```
Add `tuning, instrumentId, setInstrument, setStringTuning, setStringCount` to the `useMemo` dependency array as well.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/hooks/useFretboardContext.test.tsx`
Expected: PASS — 5 passed.

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFretboardContext.tsx src/hooks/useFretboardContext.test.tsx
git commit -m "feat: add tuning state and actions to fretboard context"
```

---

## Task 6: Add the shadcn Select primitive

**Files:**
- Create: `src/components/ui/select.tsx` (+ Radix dep)

- [ ] **Step 1: Add the Select component via the shadcn CLI**

Run: `pnpm dlx shadcn@latest add select`
Expected: creates `src/components/ui/select.tsx` and installs `@radix-ui/react-select`. Accept any prompts to proceed.

- [ ] **Step 2: Verify it created the expected exports**

Run: `grep -E "export \{|Select(Trigger|Content|Item|Value)" src/components/ui/select.tsx | head`
Expected: shows exports including `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`.

- [ ] **Step 3: Type-check + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed. (If Biome reports formatting on the generated file, run `pnpm lint:fix` and re-run `pnpm lint`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/select.tsx package.json pnpm-lock.yaml components.json
git commit -m "feat: add shadcn select primitive"
```

> **Fallback if the CLI cannot run (offline):** create `src/components/ui/select.tsx` by copying the shadcn "new-york" Select source from https://ui.shadcn.com/docs/components/select, changing the import from `@radix-ui/react-select` to the installed meta-package: `import { Select as SelectPrimitive } from "radix-ui"` and referencing primitives as `SelectPrimitive.Root`, `SelectPrimitive.Trigger`, etc. Then `pnpm lint:fix`.

---

## Task 7: Build the TuningControls component

**Files:**
- Create: `src/components/TuningControls.tsx`
- Test: `src/components/TuningControls.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/TuningControls.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { FretboardProvider } from "@/hooks/useFretboardContext"
import { TuningControls } from "./TuningControls"

function setup() {
	return render(
		<FretboardProvider>
			<TuningControls />
		</FretboardProvider>,
	)
}

describe("TuningControls", () => {
	beforeEach(() => localStorage.clear())

	it("renders one note picker per string plus the instrument picker", () => {
		setup()
		// 6 guitar strings + 1 instrument select = 7 comboboxes
		expect(screen.getAllByRole("combobox")).toHaveLength(7)
	})

	it("shows the current string count", () => {
		setup()
		expect(screen.getByText(/6 strings/i)).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/components/TuningControls.test.tsx`
Expected: FAIL — cannot find module `./TuningControls`.

- [ ] **Step 3: Implement the component**

Create `src/components/TuningControls.tsx`:
```tsx
import { Minus, Plus } from "lucide-react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { CHROMATIC } from "@/core/notes"
import { CUSTOM_ID, INSTRUMENTS } from "@/core/instruments"
import { useFretboard } from "@/hooks/useFretboardContext"
import type { NoteName } from "@/types/music"

const MIN_STRINGS = 1
const MAX_STRINGS = 12

export function TuningControls() {
	const {
		tuning,
		instrumentId,
		setInstrument,
		setStringTuning,
		setStringCount,
	} = useFretboard()

	return (
		<div className="flex flex-wrap items-center gap-4">
			{/* Instrument */}
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">Instrument</span>
				<Select value={instrumentId} onValueChange={setInstrument}>
					<SelectTrigger className="h-8 w-[130px] text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{INSTRUMENTS.map((inst) => (
							<SelectItem key={inst.id} value={inst.id}>
								{inst.name}
							</SelectItem>
						))}
						{instrumentId === CUSTOM_ID && (
							<SelectItem value={CUSTOM_ID}>Custom</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>

			{/* String count */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-label="Remove string"
					disabled={tuning.length <= MIN_STRINGS}
					onClick={() => setStringCount(tuning.length - 1)}
					className="flex size-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				>
					<Minus className="size-3.5" />
				</button>
				<span className="text-xs text-muted-foreground tabular-nums">
					{tuning.length} strings
				</span>
				<button
					type="button"
					aria-label="Add string"
					disabled={tuning.length >= MAX_STRINGS}
					onClick={() => setStringCount(tuning.length + 1)}
					className="flex size-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				>
					<Plus className="size-3.5" />
				</button>
			</div>

			{/* Per-string tuning (low → high) */}
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">Tuning</span>
				<div className="flex flex-wrap gap-1">
					{tuning.map((note, index) => (
						<Select
							// biome-ignore lint/suspicious/noArrayIndexKey: string position is the identity here
							key={index}
							value={note}
							onValueChange={(value) =>
								setStringTuning(index, value as NoteName)
							}
						>
							<SelectTrigger className="h-8 w-[58px] text-xs">
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
	)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/components/TuningControls.test.tsx`
Expected: PASS — 2 passed. (If Radix throws on a missing browser API such as `ResizeObserver` during render, add to `src/test/setup.ts`: `globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }` and re-run.)

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TuningControls.tsx src/components/TuningControls.test.tsx
git commit -m "feat: add tuning controls component"
```

---

## Task 8: Make the SVG diagrams use a variable string count

**Files:**
- Modify: `src/components/Fretboard.tsx`
- Modify: `src/components/BoxPatterns.tsx`

- [ ] **Step 1: Update `Fretboard.tsx`**

(a) Pull `tuning` from the hook and derive the count. Change the destructure (currently `const { positions, displayMode, highlightRoot, fretRange, noteSet } = useFretboard()`) to also read `tuning`, then add the derived count and remove the top-level `const STRING_COUNT = 6` constant:
```tsx
	const { positions, displayMode, highlightRoot, fretRange, noteSet, tuning } =
		useFretboard()
	const STRING_COUNT = tuning.length
```
(Keep the name `STRING_COUNT` so the rest of the component — `totalHeight`, string lines, marker centering — is unchanged. Delete the module-level `const STRING_COUNT = 6` near the other layout constants.)

(b) Replace the double-dot marker block so the two dots stay on the neck for low string counts. Find the `DOUBLE_DOT_FRETS.filter(...)` block and replace its inner `<circle>` `cy` values:
```tsx
				{DOUBLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map(
					(fret) => {
						const mid = TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2
						const offset =
							STRING_COUNT >= 4 ? STRING_SPACING : STRING_SPACING / 2
						return (
							<g key={`double-marker-${fret}`}>
								<circle
									cx={fretX(fret) - FRET_WIDTH / 2}
									cy={mid - offset}
									r={MARKER_RADIUS}
									className="fill-muted-foreground"
									fillOpacity={0.3}
								/>
								<circle
									cx={fretX(fret) - FRET_WIDTH / 2}
									cy={mid + offset}
									r={MARKER_RADIUS}
									className="fill-muted-foreground"
									fillOpacity={0.3}
								/>
							</g>
						)
					},
				)}
```

- [ ] **Step 2: Update `BoxPatterns.tsx`**

(a) Remove the module-level `const STRING_COUNT = 6`. Add `stringCount: number` to the `BoxFretboard` props and use it: change the function signature
```tsx
function BoxFretboard({
	pattern,
	displayMode,
	highlightRoot,
	root,
	stringCount,
}: {
	pattern: BoxPattern
	displayMode: string
	highlightRoot: boolean
	root?: string
	stringCount: number
}) {
```
Then add right after the destructure of `pattern`:
```tsx
	const STRING_COUNT = stringCount
```
(again keeping the local name so the body is otherwise unchanged).

(b) Apply the same double-dot guard as in `Fretboard.tsx` — replace the `DOUBLE_DOT_FRETS.filter(...)` block in `BoxFretboard` with:
```tsx
				{DOUBLE_DOT_FRETS.filter(
					(f) => f > displayMinFret && f <= displayMaxFret,
				).map((fret) => {
					const mid = TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2
					const offset =
						STRING_COUNT >= 4 ? STRING_SPACING : STRING_SPACING / 2
					return (
						<g key={`double-marker-${fret}`}>
							<circle
								cx={fretX(fret) - FRET_WIDTH / 2}
								cy={mid - offset}
								r={MARKER_RADIUS}
								className="fill-muted-foreground"
								fillOpacity={0.3}
							/>
							<circle
								cx={fretX(fret) - FRET_WIDTH / 2}
								cy={mid + offset}
								r={MARKER_RADIUS}
								className="fill-muted-foreground"
								fillOpacity={0.3}
							/>
						</g>
					)
				})}
```

(c) In the `BoxPatterns` export, read `tuning` from the hook and pass `stringCount` to each `BoxFretboard`. Change `const { boxPatterns, displayMode, highlightRoot, noteSet } = useFretboard()` to also read `tuning`, then add the prop:
```tsx
						<BoxFretboard
							pattern={pattern}
							displayMode={displayMode}
							highlightRoot={highlightRoot}
							root={noteSet.root}
							stringCount={tuning.length}
						/>
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/Fretboard.tsx src/components/BoxPatterns.tsx
git commit -m "feat: render fretboard and box patterns for any string count"
```

---

## Task 9: Mount TuningControls in the app

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import and render it above the Toolbar**

In `src/App.tsx`, add the import:
```tsx
import { TuningControls } from "@/components/TuningControls"
```
And place `<TuningControls />` between `<Editor />` and `<Toolbar … />`:
```tsx
					<Editor />

					<TuningControls />

					<Toolbar fretboardRef={fretboardRef} />
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 3: Manual smoke check**

Run: `pnpm dev`, open the app. Verify:
- Instrument dropdown shows Guitar / Bass (4) / Bass (5).
- Selecting Bass (4) collapses the fretboard to 4 strings and updates dots.
- Changing a string note re-labels the instrument to "Custom".
- The `–`/`+` buttons add/remove a string at the bottom (lowest) of the neck.
- Reload the page — the last tuning is restored.

Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount tuning controls in the app layout"
```

---

## Task 10: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `src/core/CLAUDE.md`
- Modify: `src/components/CLAUDE.md`

- [ ] **Step 1: Update root `CLAUDE.md`**

In the `## Conventions` list, replace the line:
```
- Standard guitar tuning only: EADGBE (low to high)
```
with:
```
- Multiple instruments and custom tunings supported (presets: Guitar 6, Bass 4, Bass 5; plus per-string custom tuning, 1–12 strings)
- A tuning is `NoteName[]` ordered low→high; string count derives from tuning length
```

- [ ] **Step 2: Update `src/core/CLAUDE.md`**

In the `### fretboard.ts` section, replace:
```
- Standard tuning: `['E', 'A', 'D', 'G', 'B', 'E']` (string 6→1, low→high)
- Maps a set of notes to all positions on the fretboard: `(notes) → Position[]`
```
with:
```
- Tuning is passed in as `NoteName[]` (low→high, index 0 = lowest string); no hardcoded tuning
- Instrument presets live in `instruments.ts` (`INSTRUMENTS`, `DEFAULT_INSTRUMENT`, `matchInstrument`)
- Maps a set of notes to all positions on the fretboard: `(notes, tuning) → Position[]`
- String count is always `tuning.length`; box patterns reference the lowest string
```

- [ ] **Step 3: Update `src/components/CLAUDE.md`**

(a) Under `## Components`, add a new entry after `### Toolbar`:
```
### TuningControls
- Instrument dropdown (shadcn Select): Guitar / Bass (4) / Bass (5) / Custom
- String-count stepper (1–12), adds/removes at the lowest string
- One note picker per string, ordered low→high; editing → instrument becomes "Custom"
```
(b) Under `### Fretboard (SVG)`, change `Renders guitar neck: 6 strings × configurable fret range` to `Renders neck: variable string count (from tuning) × configurable fret range`.
(c) Under `## State`, add to the list:
```
- `tuning: NoteName[]` (low→high) — persisted to localStorage
- `instrumentId: string` — derived from tuning via matchInstrument
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md src/core/CLAUDE.md src/components/CLAUDE.md
git commit -m "docs: document instruments and custom tunings"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all suites pass (instruments, fretboard, tuningStorage, useFretboardContext, TuningControls, smoke).

- [ ] **Step 2: Type-check + production build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Final manual pass**

Run `pnpm dev` and confirm the full flow once more: switch instruments, retune strings, change string count, verify box patterns render for bass, export/copy still works, reload restores tuning. Stop the server.

- [ ] **Step 5: Confirms-done commit (if anything was fixed in this task)**

```bash
git add -A
git commit -m "chore: final verification fixes for instruments and tunings" || echo "nothing to commit"
```
