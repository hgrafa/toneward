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
