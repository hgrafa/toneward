# Core — Music Theory Logic

Pure TypeScript. No React, no DOM. Everything here is unit-testable in isolation.

## Modules

### notes.ts
- `CHROMATIC` pitch classes (sharps): `C C# D D# E F F# G G# A A# B`.
- `normalizeNote` (flats/case → sharp pitch class), `transpose`, `intervalBetween`, `resolveInterval`, `isValidInterval`.
- **Spelling layer:** `SpelledNote = { letter, accidental }`; `spelledToPitchClass`, `formatSpelled`, `parseSpelledNote` (preserves written accidentals), `spellDegree` (degree-based spelling), `INTERVAL_DEGREE`.
  - `spellDegree` caps accidentals at a single `#`/`b`: if strict degree spelling would need a double accidental (e.g. the b2 of Db = E𝄫), it falls back to the simplest enharmonic spelling, following the root's leaning (flat root → flats, sharp root → sharps). This trades a repeated letter (Db D) for readability.

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
- `assignOctaves` derives octaves from a low→high tuning; `getPitchAtPosition`; `midiNumber`; `midiToFreq` (equal-tempered Hz, A4 = 440).
- Consumed by `playback.ts` and the `audio/notePlayer` engine.

### playback.ts
- Turns a box pattern's `FretPosition[]` into a sounding sequence for the note player. Pure (no DOM).
- `pitchesForBox` maps positions → `Pitch[]`, sorted low→high and de-duped by pitch (flips `FretPosition.string` ↔ tuning index). `orderForDirection` orders an ascending list by `PlaybackDirection` (`up` / `down` / `up-down`; up-down ascends then descends without repeating the top, closing on the root). `boxPlaybackSequence` composes the two.

## Key invariant
Pitch class is the math identity. Spelling and octave are additive layers on top.

## What NOT to do
- Don't add React/DOM imports here.
- Don't collapse spelling back to sharps in core math.
- Don't store octaves — they're derived from the tuning.
