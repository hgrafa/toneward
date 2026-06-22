# Core - Music Theory Logic

Pure TypeScript. No React, no DOM. Everything here is unit-testable in isolation.

## Modules

### notes.ts
- `CHROMATIC` pitch classes (sharps): `C C# D D# E F F# G G# A A# B`.
- `normalizeNote` (flats/case -> sharp pitch class), `transpose`, `intervalBetween`, `resolveInterval`, `isValidInterval`.
- Spelling layer: `SpelledNote = { letter, accidental }`; `spelledToPitchClass`, `formatSpelled`, `parseSpelledNote` (preserves written accidentals), `spellDegree` (degree-based spelling), `INTERVAL_DEGREE`.
  - `spellDegree` caps accidentals at a single `#`/`b`: if strict degree spelling would need a double accidental, it falls back to the simplest enharmonic spelling, following the root's leaning (flat root -> flats, sharp root -> sharps). This trades a repeated letter for readability.

### parser.ts
- Notes mode `"C E G Bb"` -> preserves written accidentals.
- Intervals mode `root: G` + `1 b3 4 5 b7` -> each degree spelled on its own letter via `spellDegree`.
- Output: `NoteSet { notes: SpelledNote[], root?: SpelledNote }`. Dedup is by pitch class.

### fretboard.ts
- Tuning passed in as `NoteName[]` (low->high, index 0 = lowest string); no hardcoded tuning.
- `mapNotesToFretboard(noteSet, tuning, range)` matches positions by pitch class and stamps both `note` (pitch class) and `spelled` (label) on each `FretPosition`.
- `generateBoxPatterns` references the lowest string. Known limitation: guitar-scale heuristic; out of scope to fix here.

### pitch.ts
- `Pitch = { note, octave }` - absolute sounding pitch. Spelling is deliberately not part of `Pitch` because it is context-dependent.
- `assignOctaves` derives octaves from a low->high tuning; `getPitchAtPosition`; `midiNumber`.
- Foundation for future audio/sorting - nothing consumes it yet.

## Key invariant

Pitch class is the math identity. Spelling and octave are additive layers on top.

## What Not To Do

- Do not add React/DOM imports here.
- Do not collapse spelling back to sharps in core math.
- Do not store octaves - they are derived from the tuning.
