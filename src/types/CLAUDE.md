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
