# Interval Practice Tab — Design Spec

**Date:** 2026-06-21  
**Issue:** #17  
**Status:** approved

---

## Summary

A new "Practice" view adds a gamified interval-training game. Three challenge types test the user's ability to identify intervals. A per-challenge countdown timer speeds up as the player answers correctly; running out ends the round.

---

## Challenge Types

### Type 1 — Identify the Interval
Show two note names (root + target). The user picks the correct interval from 4 choices.  
Example: "C and D#" → buttons: `Minor 2nd`, `Minor 3rd`, `Major 3rd`, `Perfect 4th`

### Type 2 — Identify the Note
Show a root note and an interval name. The user picks the correct target note from 4 choices.  
Example: "G + Minor 7th" → buttons: `E`, `F`, `F#`, `A`

### Type 3 — Mark the Fretboard
Show the full fretboard with all root note positions highlighted. The user clicks every fret dot that is the given interval away from the nearest root on that string, then hits "Check".  
Example: "Mark all Perfect 5ths from C" → user clicks all D positions... wait, C+P5 = G. User clicks all G positions.

---

## Timer Mechanic

- Each correct answer reduces the timer for the *next* challenge.
- Timer running out = **game over** (no partial score saved).
- Timing per type:

| Challenge type | Starting duration | Minimum duration | Reduction per correct answer |
|---|---|---|---|
| 1 — Identify Interval | 8 s | 3 s | 0.5 s |
| 2 — Identify Note | 8 s | 3 s | 0.5 s |
| 3 — Fretboard Mark | 25 s | 10 s | 1.5 s |

Challenges are generated randomly (any of the 3 types). The timer duration tracked separately per type so streaks in type 1 don't bleed into type 3's timer.

---

## Data Model (`src/core/practice.ts`)

Pure TypeScript — no React, no DOM.

```ts
type ChallengeType = "identify-interval" | "identify-note" | "fretboard-mark";

interface IdentifyIntervalChallenge {
  type: "identify-interval";
  root: NoteName;
  target: NoteName;
  answer: IntervalName;
  options: IntervalName[]; // 4 items, shuffled, includes answer
}

interface IdentifyNoteChallenge {
  type: "identify-note";
  root: NoteName;
  interval: IntervalName;
  answer: NoteName;
  options: NoteName[]; // 4 items, shuffled, includes answer
}

interface FretboardMarkChallenge {
  type: "fretboard-mark";
  root: NoteName;
  interval: IntervalName;
  correctPositions: FretPosition[]; // all positions where interval lands
}

type Challenge = IdentifyIntervalChallenge | IdentifyNoteChallenge | FretboardMarkChallenge;
```

**Functions:**
- `generateChallenge(type: ChallengeType, tuning: Tuning): Challenge` — random root/target, 4 shuffled options
- `checkFretboardAnswer(challenge: FretboardMarkChallenge, marked: FretPosition[]): boolean` — exact-set match (string + fret)
- `nextDuration(current: number, type: ChallengeType): number` — clamped reduction

---

## Game State Machine (`src/hooks/usePracticeGame.ts`)

`useReducer`-based hook. Only `PracticeView` subscribes — no context needed.

**Phases:** `idle → playing → game_over → idle`

```ts
interface PracticeState {
  phase: "idle" | "playing" | "game_over";
  challenge: Challenge | null;
  score: number;
  streak: number;
  // Per-type timer durations (start at maximums, decrease as streak grows)
  durations: Record<ChallengeType, number>;
  timerStartedAt: number; // Date.now() snapshot, used to key the timeout effect
  markedPositions: FretPosition[]; // type 3 only
}
```

**Actions:**
- `START` — pick random type, generate first challenge, record `timerStartedAt`
- `ANSWER(answer: IntervalName | NoteName)` — validate, update score/streak/durations, generate next challenge
- `MARK_POSITION(pos)` / `UNMARK_POSITION(pos)` — toggle for type 3
- `SUBMIT_FRETBOARD` — validate marked set, same outcome as ANSWER
- `TIMEOUT` — phase → `game_over`
- `RESTART` — reset to initial state

**Timer:** a `useEffect` keyed on `timerStartedAt` fires a single `setTimeout` per challenge. Dispatches `TIMEOUT` when it fires. Cleared on cleanup.

**Feedback delay:** after a correct/incorrect answer on types 1 & 2, the UI shows green/red for 600 ms before auto-advancing (the `ANSWER` action returns an `isCorrect` flag; component handles the delay locally with `useState`).

---

## Components (`src/components/practice/`)

```
PracticeView.tsx              — phase switch: idle shell | active game | game over
GameHeader.tsx                — score badge + timer progress bar
ChallengeIdentifyInterval.tsx — two note names, 4 interval choice buttons
ChallengeIdentifyNote.tsx     — root + interval label, 4 note choice buttons
ChallengeFretboardMark.tsx    — FretboardDiagram reused, click-to-mark, Check button
GameOverScreen.tsx            — final score + Play Again button
```

### ChallengeFretboardMark
- Reuses `FretboardDiagram` from `components/FretboardDiagram.tsx` — no new SVG.
- Root positions passed as highlighted `positions` with a distinct color.
- `onHoverPosition` wired for click-toggle of `markedPositions`.

### GameHeader timer bar
- Plain `div` with a CSS `width` transition from 100% → 0% over `timerDuration` ms.
- Keyed on `timerStartedAt` so it resets cleanly between challenges.
- No JS interval — purely CSS animation driven by a key change.

### Multiple-choice buttons (types 1 & 2)
- 2×2 grid of shadcn `Button`.
- Shows interval/note names via i18n.
- After selection: correct = green variant, wrong = red variant, 600 ms, then next challenge.

---

## i18n (`src/i18n/locales/en.ts` + `pt-BR.ts`)

New keys added under `ui.intervals` and `ui.practice`:

```ts
// en additions
intervals: {
  "1": "Perfect Unison", b2: "Minor 2nd",  "2": "Major 2nd",  b3: "Minor 3rd",
  "3": "Major 3rd",      "4": "Perfect 4th", b5: "Tritone",   "5": "Perfect 5th",
  "#5": "Augmented 5th", "6": "Major 6th",  b7: "Minor 7th",  "7": "Major 7th",
},
practice: {
  title: "Interval Practice",
  start: "Start",
  restart: "Play Again",
  score: "Score",
  check: "Check",
  timeUp: "Time's up!",
  finalScore: "Final Score",
  whatInterval: "What interval is this?",
  whatNote: "What note is the {{interval}} of {{root}}?",
  markInterval: "Mark all {{interval}} from {{root}} on the fretboard",
},
```

```ts
// pt-BR additions
intervals: {
  "1": "Uníssono",        b2: "2ª menor",   "2": "2ª maior",   b3: "3ª menor",
  "3": "3ª maior",        "4": "4ª justa",   b5: "Trítono",    "5": "5ª justa",
  "#5": "5ª aumentada",   "6": "6ª maior",   b7: "7ª menor",   "7": "7ª maior",
},
practice: {
  title: "Prática de Intervalos",
  start: "Começar",
  restart: "Jogar novamente",
  score: "Pontuação",
  check: "Verificar",
  timeUp: "Tempo esgotado!",
  finalScore: "Pontuação final",
  whatInterval: "Que intervalo é este?",
  whatNote: "Qual é a {{interval}} de {{root}}?",
  markInterval: "Marque todas as {{interval}} a partir de {{root}} no braço",
},
```

---

## Integration

- `src/types/showroom.ts` — `AppView` gains `"practice"`
- `src/hooks/ViewContext.tsx` — `loadView` default stays `"fretboard"`; `"practice"` is a valid persisted value
- `src/components/AppSidebar.tsx` — `Target` icon (lucide-react), label `t("ui.sidebar.practice")`
- `src/App.tsx` — `AppShell` renders `<PracticeView />` when `view === "practice"`

---

## Files to Create

| File | Purpose |
|---|---|
| `src/core/practice.ts` | Challenge generation + timer math (pure TS) |
| `src/hooks/usePracticeGame.ts` | Game state reducer |
| `src/components/practice/PracticeView.tsx` | Phase orchestrator |
| `src/components/practice/GameHeader.tsx` | Score + timer bar |
| `src/components/practice/ChallengeIdentifyInterval.tsx` | Type 1 UI |
| `src/components/practice/ChallengeIdentifyNote.tsx` | Type 2 UI |
| `src/components/practice/ChallengeFretboardMark.tsx` | Type 3 UI |
| `src/components/practice/GameOverScreen.tsx` | End screen |

## Files to Modify

| File | Change |
|---|---|
| `src/types/showroom.ts` | Add `"practice"` to `AppView` |
| `src/hooks/ViewContext.tsx` | Accept `"practice"` as valid view |
| `src/components/AppSidebar.tsx` | Add Practice nav entry |
| `src/App.tsx` | Render `PracticeView` for `practice` view |
| `src/i18n/locales/en.ts` | Add `intervals` + `practice` keys |
| `src/i18n/locales/pt-BR.ts` | Add `intervals` + `practice` keys |

---

## Out of Scope (this iteration)

- High score persistence (localStorage)
- Choosing which challenge types to practice
- Difficulty presets
- Audio feedback on correct/incorrect answer
