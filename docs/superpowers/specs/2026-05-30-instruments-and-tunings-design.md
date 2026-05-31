# Instruments & Custom Tunings — Design

**Date:** 2026-05-30
**Branch:** `worktree-instruments-and-tunings`
**Status:** Approved (design), pending implementation plan

## Goal

Let the user choose among preset instruments (Guitar 6, Bass 4, Bass 5) and freely
retune any string — including changing the number of strings — instead of being
locked to standard 6-string guitar tuning (EADGBE). The fretboard, box patterns,
and export all adapt to the active tuning.

This relaxes the core constraint currently stated in `CLAUDE.md`:
*"Standard guitar tuning only: EADGBE (low to high)."*

## Scope

**In scope**
- Preset instruments: Guitar (6, EADGBE), Bass 4 (EADG), Bass 5 (BEADG), plus "Custom".
- Per-string retuning via toolbar controls (one note picker per string, low→high).
- Variable string count (1–12) via a stepper; editing tuning/count → instrument
  becomes "Custom".
- Variable string count flows into the pure core functions and both SVG diagrams.
- Persist `{ instrumentId, tuning }` to `localStorage` (validated on load).

**Out of scope (YAGNI)**
- Octaves / pitch register (engine is pitch-class only and stays that way).
- Per-instrument fret counts or custom fret-marker layouts (guitar-style markers
  and `MAX_FRETS = 22` apply to all instruments).
- 7/8-string guitar and ukulele presets (the engine supports them, but they are
  not shipped as presets in this iteration).
- Capo, left-handed orientation, persisting `inputText`.

## Architecture

Approach: **tuning is plain data threaded through the existing pure functions** —
no new OOP, no hidden module state, matching the codebase's functional-core
convention. String count is always derived from the tuning length; there is no
separate `STRING_COUNT` source of truth.

### Conventions preserved
- **String numbering is unchanged:** string `1` = highest pitch (top of diagram),
  string `N` = lowest pitch (bottom). The `tuning` array is ordered **low→high**,
  so `tuning[0]` is string `N` (lowest) and `tuning[length-1]` is string `1`
  (highest). The 1-indexed string number for tuning index `i` is `tuning.length - i`.
- Internal note representation stays sharps-only; tuning notes are `NoteName`s.

## Data model (`src/types/music.ts`)

```ts
// Open note of each string, LOW → HIGH (index 0 = lowest-pitched string).
export type Tuning = NoteName[]

export interface InstrumentPreset {
  id: string        // "guitar-6", "bass-4", "bass-5"
  name: string      // "Guitar", "Bass (4)", "Bass (5)"
  tuning: Tuning
}
```

`FretPosition.string`'s comment generalizes from `1-6` to `1..stringCount`.

## Core: instruments (`src/core/instruments.ts`, new, pure)

```ts
export const INSTRUMENTS: InstrumentPreset[] = [
  { id: "guitar-6", name: "Guitar",   tuning: ["E","A","D","G","B","E"] },
  { id: "bass-4",   name: "Bass (4)", tuning: ["E","A","D","G"] },
  { id: "bass-5",   name: "Bass (5)", tuning: ["B","E","A","D","G"] },
]
export const DEFAULT_INSTRUMENT = INSTRUMENTS[0]   // guitar-6
export const CUSTOM_ID = "custom"

// Returns the preset id whose tuning deep-equals `tuning`, else CUSTOM_ID.
export function matchInstrument(tuning: Tuning): string
```

## Core: fretboard (`src/core/fretboard.ts`)

`STANDARD_TUNING` and the hardcoded `6` are removed. `MAX_FRETS = 22`,
`SINGLE_DOT_FRETS`, `DOUBLE_DOT_FRETS` stay as-is.

```ts
// stringIndex = index into tuning (0 = lowest string).
export function getNoteAtPosition(tuning: Tuning, stringIndex: number, fret: number): NoteName

export function mapNotesToFretboard(
  noteSet: NoteSet,
  tuning: Tuning,
  fretRange: [number, number] = [0, 12],
): FretPosition[]

export function generateBoxPatterns(
  noteSet: NoteSet,
  tuning: Tuning,
  notesPerString?: number,   // default 2
): BoxPattern[]
```

Changes:
- `getNoteAtPosition`: `note = CHROMATIC[(noteIndex(tuning[stringIndex]) + fret) mod 12]`.
- `mapNotesToFretboard`: loop `for (stringIdx = 0; stringIdx < tuning.length; stringIdx++)`;
  emit 1-indexed string number `tuning.length - stringIdx`.
- `generateBoxPatterns`: reference string is the lowest string `= tuning.length`
  (was hardcoded `byString.get(6)`); the descent loop runs `str = tuning.length …
  1` (was `6 … 1`). The 5-box cap is retained.

## State & persistence (`src/hooks/useFretboardContext.tsx`)

New context state and actions:

```ts
tuning: Tuning
instrumentId: string                                   // preset id or "custom"
setInstrument: (id: string) => void                    // load preset tuning
setStringTuning: (stringIndex: number, note: NoteName) => void
setStringCount: (n: number) => void                    // 1–12, becomes "custom"
```

Behavior:
- `setInstrument(id)` → look up preset, set its `tuning`, set `instrumentId = id`.
- `setStringTuning` / `setStringCount` → update tuning, then
  `instrumentId = matchInstrument(newTuning)` (so retuning back to a preset
  re-labels it; otherwise "custom").
- `setStringCount` operates on the **low-pitch end** (start of the low→high
  array), mirroring how real extended-range instruments add a lower string.
  Because a string's number is `tuning.length - index`, adding/removing at the
  low end preserves every existing string's number *and* open note: increase →
  prepend a default string (fill `"E"`); decrease → drop the lowest string.
- `positions` and `boxPatterns` memos depend on `tuning` and pass it to the core
  functions.

Persistence:
- Key `fretboard.tuning`, value `{ instrumentId, tuning }`, written via a small
  `useEffect` on change.
- Initial state reads + **validates**: `tuning` must be an array of valid
  `NoteName`s, length 1–12; otherwise fall back to `DEFAULT_INSTRUMENT`.
- Read/write logic lives in a small isolated, testable helper (e.g.
  `loadTuningState` / `saveTuningState`) so the context stays readable.
- `inputText` remains non-persisted, as today.

## UI: tuning controls (`src/components/TuningControls.tsx`, new)

```
[ Instrument: Guitar ▾ ]   [ – ] 6 strings [ + ]
Tuning (low→high):  [E▾] [A▾] [D▾] [G▾] [B▾] [E▾]
```

- **Instrument dropdown** — shadcn `Select`; options from `INSTRUMENTS`, plus a
  "Custom" entry shown only when `instrumentId === CUSTOM_ID`. Selection →
  `setInstrument`.
- **String-count stepper** — `–`/`+` buttons bounded 1–12 → `setStringCount`.
- **Per-string note pickers** — one shadcn `Select` per string in low→high order,
  each a 12-note chromatic dropdown → `setStringTuning(index, note)`.
- Uses shadcn/ui `Select` (project convention). If `src/components/ui/select`
  does not yet exist, add it via the installed `shadcn` CLI rather than
  hand-rolling a `<select>`.

Placement (`App.tsx`): its own row directly above the existing `Toolbar`, so
display-mode / root / NPS / fret-range / export controls stay grouped together.

## Rendering (`src/components/Fretboard.tsx`, `src/components/BoxPatterns.tsx`)

- Both replace `const STRING_COUNT = 6` with a value derived from the tuning:
  - `Fretboard.tsx` reads `tuning` from context → `stringCount = tuning.length`.
  - `BoxPatterns.tsx`'s `BoxFretboard` receives `stringCount` as a prop.
- `totalHeight`, string lines, fret-marker centering, and double-dot Y positions
  already compute from the string count, so they adapt automatically.
- **Double-dot guard:** the 12th-fret double marker uses fixed rows
  (`STRING_SPACING * 1.5` and `* 3.5`); for very low string counts (<4) clamp
  these to stay on the neck.
- String stroke widths (`1 + i * 0.3`) are already index-based — thicker-for-lower
  keeps working at any count.
- SVG export/copy (`html-to-image`) is unaffected — it snapshots the rendered DOM.

## Testing

No test framework exists today (`msw` is in devDeps but unused). The new/changed
core functions are pure and the natural test target: `getNoteAtPosition`,
`mapNotesToFretboard`, `generateBoxPatterns`, `matchInstrument`, and the
localStorage validation helper.

**Open decision for the implementation plan:** whether to introduce Vitest now
(its presence is hinted by `msw` in devDeps) or defer. Not assumed here.

## Docs to update

- Root `CLAUDE.md`: remove the "Standard guitar tuning only: EADGBE" constraint;
  note presets + custom tunings.
- `src/core/CLAUDE.md`: tuning is now a parameter to fretboard functions, not a
  module constant.
- `src/components/CLAUDE.md`: document `TuningControls` and variable string count;
  update the state list to include `tuning` / `instrumentId`.

## Files touched (summary)

| File | Change |
|------|--------|
| `src/types/music.ts` | add `Tuning`, `InstrumentPreset`; generalize `FretPosition.string` comment |
| `src/core/instruments.ts` | **new** — presets, `DEFAULT_INSTRUMENT`, `CUSTOM_ID`, `matchInstrument` |
| `src/core/fretboard.ts` | `tuning` param on 3 functions; remove `STANDARD_TUNING`/`6` |
| `src/hooks/useFretboardContext.tsx` | tuning state/actions + localStorage helper |
| `src/components/TuningControls.tsx` | **new** — instrument dropdown, stepper, per-string pickers |
| `src/components/ui/select.tsx` | add via shadcn if missing |
| `src/components/Fretboard.tsx` | derive `stringCount` from tuning; double-dot guard |
| `src/components/BoxPatterns.tsx` | `stringCount` prop |
| `src/App.tsx` | render `TuningControls` above `Toolbar` |
| `CLAUDE.md`, `src/core/CLAUDE.md`, `src/components/CLAUDE.md` | doc updates |
