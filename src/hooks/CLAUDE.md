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

## Other app-level contexts (NOT part of the FretboardProvider split)
These live here too but are separate concerns, composed directly in `App.tsx`:
- `ViewContext.tsx` — `useView`: the active tab (`view`/`setView`), persisted to localStorage (`fretboard.view`).
- `MediaPlayerContext.tsx` — `useMediaPlayerCtx`: the persistent player's `source`, `setSource` (revokes a prior mp3 blob), the `<audio>`/YouTube refs, and the `useMediaPlayer` controller. Mounted ONCE at the shell so playback survives tab changes. Link (YouTube) sources persist to localStorage (`tw-player-source`); uploaded files cannot (their blob URL dies on reload).
- `ShowroomContext.tsx` — `useShowroom`: the Showroom PDF document only (audio moved out to `MediaPlayerContext`).
- `MetronomeContext.tsx` / `AudioDevicesContext.tsx` — the metronome engine + shared audio-output-device discovery (used by the header Metrônomo/Áudio popovers).
- `StudyTimerContext.tsx` — `useStudyTimer`: an independent study stopwatch/countdown (up/down mode, a session-goal text, congrats when a countdown ends). Runs its own 1s interval and touches no other state, so it never disturbs the game/audio/view. UI lives in `components/StudyTimerPanel` (opened from the floating nav).

## Conventions
- One concern per context. If new state appears, put it in the matching context (or add a new one), not a god object.
- `DerivedProvider` must stay innermost — it consumes the other three hooks.

## What NOT to do
- Don't reintroduce a single `useFretboard()` that returns everything.
- Don't compute `positions`/`boxPatterns` in components — they live in `DerivedContext`.
