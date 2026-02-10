# Core — Music Theory Logic

Pure TypeScript module. No React, no DOM dependencies. Everything here must be unit-testable in isolation.

## Modules

### notes.ts
- Chromatic scale: `['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']`
- Flat-to-sharp normalization: `Db→C#`, `Eb→D#`, `Gb→F#`, `Ab→G#`, `Bb→A#`
- Note math: transpose, interval between two notes, enharmonic equivalence

### parser.ts
Two input modes:
1. **Notes mode**: `"C E G Bb"` → `NoteSet { notes: ['C', 'E', 'G', 'Bb'], root: undefined }`
2. **Intervals mode**: `root: G` + `"1 b3 4 5 b7"` → resolves intervals to absolute notes

Interval notation: `1, b2, 2, b3, 3, 4, b5, 5, b5, 6, b7, 7` (chromatic degrees)

### fretboard.ts
- Standard tuning: `['E', 'A', 'D', 'G', 'B', 'E']` (string 6→1, low→high)
- Maps a set of notes to all positions on the fretboard: `(notes) → Position[]`
- Position: `{ string: number, fret: number, note: string, interval?: string }`
- Fret range: 0–22

## Key Constraint
Internal representation always uses sharps (C#, not Db). Parser accepts both, normalizes on input.
