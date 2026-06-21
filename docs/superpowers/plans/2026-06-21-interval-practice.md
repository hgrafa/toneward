# Interval Practice Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gamified "Practice" view with three interval challenge types, a per-challenge countdown timer that speeds up on correct answers, and a game-over screen when the timer runs out.

**Architecture:** A `useReducer`-based hook (`usePracticeGame`) manages all game state; it receives tuning from the existing `useInstrument` context. Pure challenge-generation and timer math live in `src/core/practice.ts`. Six focused components handle each phase/challenge type and share a consistent visual shell.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (`Button`), lucide-react, react-i18next, Vitest + React Testing Library.

## Global Constraints

- `src/core/` must stay pure TypeScript — no React, no DOM, no browser APIs.
- Use only `lucide-react` or `@phosphor-icons/react` for icons (no other icon libs).
- All UI controls use shadcn/ui primitives from `@/components/ui/`.
- Use `@/` path alias for all imports (maps to `src/`).
- Double quotes, tabs, semicolons — Biome handles formatting.
- No new context — `usePracticeGame` is a hook, not a Provider.
- Do not duplicate `FretboardDiagram.tsx` — extend it.
- Run `pnpm lint:fix && pnpm build && pnpm test --run` before each commit.

---

### Task 1: Core practice module

**Files:**
- Create: `src/core/practice.ts`
- Create: `src/core/practice.test.ts`

**Interfaces:**
- Produces:
  - `ChallengeType` union: `"identify-interval" | "identify-note" | "fretboard-mark"`
  - `IdentifyIntervalChallenge`, `IdentifyNoteChallenge`, `FretboardMarkChallenge`, `Challenge` union
  - `PRACTICE_INTERVALS: IntervalName[]`
  - `TIMER_CONFIG: Record<ChallengeType, { start: number; min: number; step: number }>`
  - `generateChallenge(type: ChallengeType, tuning: Tuning): Challenge`
  - `allFretboardPositions(tuning: Tuning): FretPosition[]`
  - `checkFretboardAnswer(challenge: FretboardMarkChallenge, marked: Set<string>): boolean`
  - `nextDuration(current: number, type: ChallengeType): number`

- [ ] **Step 1: Write failing tests**

Create `src/core/practice.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveInterval } from "@/core/notes";
import type { Tuning } from "@/types/music";
import {
  checkFretboardAnswer,
  generateChallenge,
  nextDuration,
  TIMER_CONFIG,
} from "./practice";

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"];

describe("generateChallenge – identify-interval", () => {
  it("has correct answer in options", () => {
    const c = generateChallenge("identify-interval", GUITAR);
    if (c.type !== "identify-interval") throw new Error("wrong type");
    expect(c.options).toContain(c.answer);
    expect(c.options).toHaveLength(4);
  });

  it("target equals resolveInterval(root, answer)", () => {
    const c = generateChallenge("identify-interval", GUITAR);
    if (c.type !== "identify-interval") throw new Error("wrong type");
    expect(resolveInterval(c.root, c.answer)).toBe(c.target);
  });

  it("has 4 unique options", () => {
    const c = generateChallenge("identify-interval", GUITAR);
    if (c.type !== "identify-interval") throw new Error("wrong type");
    expect(new Set(c.options).size).toBe(4);
  });
});

describe("generateChallenge – identify-note", () => {
  it("has correct answer in options", () => {
    const c = generateChallenge("identify-note", GUITAR);
    if (c.type !== "identify-note") throw new Error("wrong type");
    expect(c.options).toContain(c.answer);
    expect(c.options).toHaveLength(4);
  });

  it("answer equals resolveInterval(root, interval)", () => {
    const c = generateChallenge("identify-note", GUITAR);
    if (c.type !== "identify-note") throw new Error("wrong type");
    expect(resolveInterval(c.root, c.interval)).toBe(c.answer);
  });
});

describe("generateChallenge – fretboard-mark", () => {
  it("returns non-empty correctPositions", () => {
    const c = generateChallenge("fretboard-mark", GUITAR);
    if (c.type !== "fretboard-mark") throw new Error("wrong type");
    expect(c.correctPositions.length).toBeGreaterThan(0);
  });

  it("all correctPositions have the interval note", () => {
    const c = generateChallenge("fretboard-mark", GUITAR);
    if (c.type !== "fretboard-mark") throw new Error("wrong type");
    const target = resolveInterval(c.root, c.interval);
    for (const pos of c.correctPositions) {
      expect(pos.note).toBe(target);
    }
  });
});

describe("checkFretboardAnswer", () => {
  it("accepts exact correct marked positions", () => {
    const c = generateChallenge("fretboard-mark", GUITAR);
    if (c.type !== "fretboard-mark") throw new Error("wrong type");
    const marked = new Set(c.correctPositions.map((p) => `${p.string}-${p.fret}`));
    expect(checkFretboardAnswer(c, marked)).toBe(true);
  });

  it("rejects when a position is missing", () => {
    const c = generateChallenge("fretboard-mark", GUITAR);
    if (c.type !== "fretboard-mark") throw new Error("wrong type");
    if (c.correctPositions.length === 0) return;
    const marked = new Set(c.correctPositions.map((p) => `${p.string}-${p.fret}`));
    const first = [...marked][0];
    marked.delete(first);
    expect(checkFretboardAnswer(c, marked)).toBe(false);
  });

  it("rejects when an extra position is marked", () => {
    const c = generateChallenge("fretboard-mark", GUITAR);
    if (c.type !== "fretboard-mark") throw new Error("wrong type");
    const marked = new Set(c.correctPositions.map((p) => `${p.string}-${p.fret}`));
    marked.add("99-99");
    expect(checkFretboardAnswer(c, marked)).toBe(false);
  });
});

describe("nextDuration", () => {
  it("reduces by step", () => {
    const cfg = TIMER_CONFIG["identify-interval"];
    expect(nextDuration(cfg.start, "identify-interval")).toBe(cfg.start - cfg.step);
  });

  it("clamps to minimum", () => {
    const cfg = TIMER_CONFIG["identify-interval"];
    expect(nextDuration(cfg.min, "identify-interval")).toBe(cfg.min);
    expect(nextDuration(cfg.min + cfg.step - 1, "identify-interval")).toBe(cfg.min);
  });

  it("fretboard-mark has its own config", () => {
    const cfg = TIMER_CONFIG["fretboard-mark"];
    expect(nextDuration(cfg.start, "fretboard-mark")).toBe(cfg.start - cfg.step);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test --run src/core/practice.test.ts
```

Expected: `Cannot find module './practice'`

- [ ] **Step 3: Implement `src/core/practice.ts`**

```ts
import { getNoteAtPosition, mapNotesToFretboard } from "@/core/fretboard";
import { CHROMATIC, resolveInterval } from "@/core/notes";
import type {
  FretPosition,
  IntervalName,
  Letter,
  NoteName,
  Tuning,
} from "@/types/music";

export type ChallengeType =
  | "identify-interval"
  | "identify-note"
  | "fretboard-mark";

export interface IdentifyIntervalChallenge {
  type: "identify-interval";
  root: NoteName;
  target: NoteName;
  answer: IntervalName;
  options: IntervalName[];
}

export interface IdentifyNoteChallenge {
  type: "identify-note";
  root: NoteName;
  interval: IntervalName;
  answer: NoteName;
  options: NoteName[];
}

export interface FretboardMarkChallenge {
  type: "fretboard-mark";
  root: NoteName;
  interval: IntervalName;
  correctPositions: FretPosition[];
}

export type Challenge =
  | IdentifyIntervalChallenge
  | IdentifyNoteChallenge
  | FretboardMarkChallenge;

export const PRACTICE_INTERVALS: IntervalName[] = [
  "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7",
];

export const TIMER_CONFIG: Record<
  ChallengeType,
  { start: number; min: number; step: number }
> = {
  "identify-interval": { start: 8000, min: 3000, step: 500 },
  "identify-note": { start: 8000, min: 3000, step: 500 },
  "fretboard-mark": { start: 25000, min: 10000, step: 1500 },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateChallenge(
  type: ChallengeType,
  tuning: Tuning,
): Challenge {
  if (type === "identify-interval") {
    const root = pickRandom(CHROMATIC);
    const answer = pickRandom(PRACTICE_INTERVALS);
    const target = resolveInterval(root, answer);
    const wrongs = shuffle(
      PRACTICE_INTERVALS.filter((i) => i !== answer),
    ).slice(0, 3) as IntervalName[];
    return {
      type,
      root,
      target,
      answer,
      options: shuffle([answer, ...wrongs]) as IntervalName[],
    };
  }

  if (type === "identify-note") {
    const root = pickRandom(CHROMATIC);
    const interval = pickRandom(PRACTICE_INTERVALS);
    const answer = resolveInterval(root, interval);
    const wrongs = shuffle(
      CHROMATIC.filter((n) => n !== answer),
    ).slice(0, 3) as NoteName[];
    return {
      type,
      root,
      interval,
      answer,
      options: shuffle([answer, ...wrongs]) as NoteName[],
    };
  }

  // fretboard-mark
  const root = pickRandom(CHROMATIC);
  const interval = pickRandom(PRACTICE_INTERVALS);
  const intervalNote = resolveInterval(root, interval);
  const letter = intervalNote[0] as Letter;
  const accidental = intervalNote.length > 1 ? 1 : 0;
  const correctPositions = mapNotesToFretboard(
    { notes: [{ letter, accidental }], root: undefined },
    tuning,
    [0, 12],
  );
  return { type: "fretboard-mark", root, interval, correctPositions };
}

// Returns FretPosition for every string/fret combination (frets 0–12).
// Used by ChallengeFretboardMark to render a fully clickable fretboard.
export function allFretboardPositions(tuning: Tuning): FretPosition[] {
  const stringCount = tuning.length;
  const positions: FretPosition[] = [];
  for (let stringIdx = 0; stringIdx < stringCount; stringIdx++) {
    for (let fret = 0; fret <= 12; fret++) {
      const note = getNoteAtPosition(tuning, stringIdx, fret);
      const letter = note[0] as Letter;
      const accidental = note.length > 1 ? 1 : 0;
      positions.push({
        string: stringCount - stringIdx,
        fret,
        note,
        spelled: { letter, accidental },
      });
    }
  }
  return positions;
}

export function checkFretboardAnswer(
  challenge: FretboardMarkChallenge,
  marked: Set<string>,
): boolean {
  const correct = new Set(
    challenge.correctPositions.map((p) => `${p.string}-${p.fret}`),
  );
  if (correct.size !== marked.size) return false;
  for (const key of correct) {
    if (!marked.has(key)) return false;
  }
  return true;
}

export function nextDuration(current: number, type: ChallengeType): number {
  const { min, step } = TIMER_CONFIG[type];
  return Math.max(min, current - step);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --run src/core/practice.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/practice.ts src/core/practice.test.ts
git commit -m "feat: add core practice module (challenge generation, timer math)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: i18n additions

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/pt-BR.ts`

**Interfaces:**
- Consumes: existing `TranslationSchema` type exported from `en.ts`
- Produces: `t("ui.intervals.b3")` → `"Minor 3rd"` (en) / `"3ª menor"` (pt-BR); `t("ui.practice.title")` etc.

- [ ] **Step 1: Add keys to `src/i18n/locales/en.ts`**

Add to the `ui` object (before the closing `},`):

```ts
// Inside the `ui: { ... }` block, after `showroom: { ... },`:
intervals: {
  b2: "Minor 2nd",
  "2": "Major 2nd",
  b3: "Minor 3rd",
  "3": "Major 3rd",
  "4": "Perfect 4th",
  b5: "Tritone",
  "5": "Perfect 5th",
  "#5": "Augmented 5th",
  "6": "Major 6th",
  b7: "Minor 7th",
  "7": "Major 7th",
  "1": "Perfect Unison",
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

Also update `ui.sidebar` to add:
```ts
practice: "Practice",
```

- [ ] **Step 2: Add matching keys to `src/i18n/locales/pt-BR.ts`**

```ts
// intervals block:
intervals: {
  b2: "2ª menor",
  "2": "2ª maior",
  b3: "3ª menor",
  "3": "3ª maior",
  "4": "4ª justa",
  b5: "Trítono",
  "5": "5ª justa",
  "#5": "5ª aumentada",
  "6": "6ª maior",
  b7: "7ª menor",
  "7": "7ª maior",
  "1": "Uníssono",
},
// practice block:
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
// sidebar addition:
practice: "Prática",
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no type errors (TypeScript will catch any `pt-BR.ts` key mismatches).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.ts src/i18n/locales/pt-BR.ts
git commit -m "feat: add interval and practice i18n keys (en + pt-BR)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: View routing — add "practice" view

**Files:**
- Modify: `src/types/showroom.ts`
- Modify: `src/hooks/ViewContext.tsx`
- Modify: `src/components/AppSidebar.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/practice/PracticeView.tsx` (stub)

**Interfaces:**
- Consumes: `AppView` type, `useView` hook, `useTranslation`
- Produces: `AppView` now includes `"practice"`; sidebar shows Practice nav item; App renders `<PracticeView />` for `view === "practice"`

- [ ] **Step 1: Add `"practice"` to `AppView` in `src/types/showroom.ts`**

```ts
export type AppView = "fretboard" | "showroom" | "practice";
```

- [ ] **Step 2: Update `loadView` in `src/hooks/ViewContext.tsx`**

Replace:
```ts
function loadView(): AppView {
  try {
    return localStorage.getItem(VIEW_KEY) === "showroom"
      ? "showroom"
      : "fretboard";
  } catch {
    return "fretboard";
  }
}
```

With:
```ts
const VALID_VIEWS: AppView[] = ["fretboard", "showroom", "practice"];

function loadView(): AppView {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return VALID_VIEWS.includes(saved as AppView) ? (saved as AppView) : "fretboard";
  } catch {
    return "fretboard";
  }
}
```

- [ ] **Step 3: Create stub `src/components/practice/PracticeView.tsx`**

```tsx
export function PracticeView() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Practice — coming soon
    </div>
  );
}
```

- [ ] **Step 4: Add Practice nav entry to `src/components/AppSidebar.tsx`**

Add import at top:
```tsx
import { Guitar, Music4, Target, PanelLeftClose, PanelLeftOpen } from "lucide-react";
```

Update the `NAV` array:
```tsx
const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
  { view: "fretboard", label: t("ui.sidebar.fretboard"), icon: Guitar },
  { view: "showroom", label: t("ui.sidebar.showroom"), icon: Music4 },
  { view: "practice", label: t("ui.sidebar.practice"), icon: Target },
];
```

- [ ] **Step 5: Update `src/App.tsx` to render PracticeView**

Add import:
```tsx
import { PracticeView } from "@/components/practice/PracticeView";
```

Update `AppShell`:
```tsx
function AppShell() {
  const { view } = useView();
  return (
    <div className="flex h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {view === "fretboard" && <FretboardView />}
        {view === "showroom" && <ShowroomView />}
        {view === "practice" && <PracticeView />}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify build + tests pass**

```bash
pnpm lint:fix && pnpm build && pnpm test --run
```

Expected: 85+ tests passing, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/showroom.ts src/hooks/ViewContext.tsx src/components/AppSidebar.tsx src/App.tsx src/components/practice/PracticeView.tsx
git commit -m "feat: add practice view routing and sidebar nav entry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Game state hook

**Files:**
- Create: `src/hooks/usePracticeGame.ts`

**Interfaces:**
- Consumes: `generateChallenge`, `checkFretboardAnswer`, `nextDuration`, `TIMER_CONFIG`, `ChallengeType`, `Challenge`, `FretboardMarkChallenge` from `@/core/practice`; `FretPosition`, `IntervalName`, `NoteName`, `Tuning` from `@/types/music`
- Produces:
```ts
interface PracticeGameAPI {
  state: PracticeState;
  start: () => void;
  answer: (ans: IntervalName | NoteName) => void;
  togglePosition: (pos: FretPosition) => void;
  submitFretboard: () => void;
  restart: () => void;
}

interface PracticeState {
  phase: "idle" | "playing" | "game_over";
  challenge: Challenge | null;
  score: number;
  durations: Record<ChallengeType, number>;
  timerStartedAt: number;
  currentTimerMs: number;
  markedPositions: Set<string>;
}
```

- [ ] **Step 1: Create `src/hooks/usePracticeGame.ts`**

```ts
import { useEffect, useReducer, useRef } from "react";
import {
  checkFretboardAnswer,
  generateChallenge,
  nextDuration,
  TIMER_CONFIG,
} from "@/core/practice";
import type { ChallengeType, Challenge, FretboardMarkChallenge } from "@/core/practice";
import type { FretPosition, IntervalName, NoteName, Tuning } from "@/types/music";

export interface PracticeState {
  phase: "idle" | "playing" | "game_over";
  challenge: Challenge | null;
  score: number;
  durations: Record<ChallengeType, number>;
  timerStartedAt: number;
  currentTimerMs: number;
  markedPositions: Set<string>;
}

type Action =
  | { type: "START"; payload: { challenge: Challenge; now: number } }
  | {
      type: "NEXT";
      payload: {
        isCorrect: boolean;
        nextChallenge: Challenge;
        now: number;
        newDuration: number;
        prevType: ChallengeType;
      };
    }
  | { type: "TOGGLE_POSITION"; payload: string }
  | { type: "TIMEOUT" }
  | { type: "RESTART" };

const INITIAL_DURATIONS: Record<ChallengeType, number> = {
  "identify-interval": TIMER_CONFIG["identify-interval"].start,
  "identify-note": TIMER_CONFIG["identify-note"].start,
  "fretboard-mark": TIMER_CONFIG["fretboard-mark"].start,
};

const INITIAL_STATE: PracticeState = {
  phase: "idle",
  challenge: null,
  score: 0,
  durations: { ...INITIAL_DURATIONS },
  timerStartedAt: 0,
  currentTimerMs: 0,
  markedPositions: new Set(),
};

const CHALLENGE_TYPES: ChallengeType[] = [
  "identify-interval",
  "identify-note",
  "fretboard-mark",
];

function pickRandomType(): ChallengeType {
  return CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)];
}

function reducer(state: PracticeState, action: Action): PracticeState {
  switch (action.type) {
    case "START": {
      const { challenge, now } = action.payload;
      return {
        ...INITIAL_STATE,
        phase: "playing",
        challenge,
        durations: { ...INITIAL_DURATIONS },
        timerStartedAt: now,
        currentTimerMs: INITIAL_DURATIONS[challenge.type],
      };
    }
    case "NEXT": {
      const { isCorrect, nextChallenge, now, newDuration, prevType } =
        action.payload;
      // Compute new durations first so currentTimerMs uses the updated value
      // when next challenge type == prev type (after a correct answer).
      const newDurations = { ...state.durations, [prevType]: newDuration };
      return {
        ...state,
        score: isCorrect ? state.score + 1 : state.score,
        durations: newDurations,
        challenge: nextChallenge,
        timerStartedAt: now,
        currentTimerMs: newDurations[nextChallenge.type],
        markedPositions: new Set(),
      };
    }
    case "TOGGLE_POSITION": {
      const next = new Set(state.markedPositions);
      if (next.has(action.payload)) {
        next.delete(action.payload);
      } else {
        next.add(action.payload);
      }
      return { ...state, markedPositions: next };
    }
    case "TIMEOUT":
      return { ...state, phase: "game_over" };
    case "RESTART":
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export function usePracticeGame(tuning: Tuning) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  useEffect(() => {
    if (state.phase !== "playing" || !state.currentTimerMs) return;
    const id = setTimeout(() => dispatch({ type: "TIMEOUT" }), state.currentTimerMs);
    return () => clearTimeout(id);
  }, [state.timerStartedAt, state.phase, state.currentTimerMs]);

  function start() {
    const type = pickRandomType();
    const challenge = generateChallenge(type, tuningRef.current);
    dispatch({ type: "START", payload: { challenge, now: Date.now() } });
  }

  function answer(ans: IntervalName | NoteName) {
    if (!state.challenge || state.challenge.type === "fretboard-mark") return;
    const isCorrect = ans === state.challenge.answer;
    const prevType = state.challenge.type;
    const newDuration = isCorrect
      ? nextDuration(state.durations[prevType], prevType)
      : state.durations[prevType];
    const nextType = pickRandomType();
    const nextChallenge = generateChallenge(nextType, tuningRef.current);
    dispatch({
      type: "NEXT",
      payload: { isCorrect, nextChallenge, now: Date.now(), newDuration, prevType },
    });
  }

  function togglePosition(pos: FretPosition) {
    dispatch({
      type: "TOGGLE_POSITION",
      payload: `${pos.string}-${pos.fret}`,
    });
  }

  function submitFretboard() {
    if (!state.challenge || state.challenge.type !== "fretboard-mark") return;
    const isCorrect = checkFretboardAnswer(
      state.challenge as FretboardMarkChallenge,
      state.markedPositions,
    );
    const prevType = state.challenge.type;
    const newDuration = isCorrect
      ? nextDuration(state.durations[prevType], prevType)
      : state.durations[prevType];
    const nextType = pickRandomType();
    const nextChallenge = generateChallenge(nextType, tuningRef.current);
    dispatch({
      type: "NEXT",
      payload: { isCorrect, nextChallenge, now: Date.now(), newDuration, prevType },
    });
  }

  function restart() {
    dispatch({ type: "RESTART" });
  }

  return { state, start, answer, togglePosition, submitFretboard, restart };
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm build 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePracticeGame.ts
git commit -m "feat: add usePracticeGame reducer hook

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Shell components — PracticeView, GameHeader, GameOverScreen

**Files:**
- Modify: `src/components/practice/PracticeView.tsx` (replace stub)
- Create: `src/components/practice/GameHeader.tsx`
- Create: `src/components/practice/GameOverScreen.tsx`

**Interfaces:**
- Consumes: `usePracticeGame` → `PracticeState`, `start`, `restart`; `useInstrument` → `tuning`; `useTranslation`
- Produces: full game shell rendering idle / playing / game_over phases

- [ ] **Step 1: Create `src/components/practice/GameHeader.tsx`**

```tsx
import { useTranslation } from "react-i18next";

interface GameHeaderProps {
  score: number;
  timerMs: number;
  timerStartedAt: number;
}

export function GameHeader({ score, timerMs, timerStartedAt }: GameHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 px-6 py-3 border-b border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {t("ui.practice.score")}
        </span>
        <span className="text-lg font-bold tabular-nums">{score}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          key={timerStartedAt}
          className="h-full bg-primary rounded-full"
          style={{
            animation: `shrink ${timerMs}ms linear forwards`,
          }}
        />
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/practice/GameOverScreen.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

export function GameOverScreen({ score, onRestart }: GameOverScreenProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-center">
        <p className="text-lg font-medium text-muted-foreground mb-1">
          {t("ui.practice.timeUp")}
        </p>
        <p className="text-4xl font-bold tabular-nums">{score}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("ui.practice.finalScore")}
        </p>
      </div>
      <Button onClick={onRestart}>{t("ui.practice.restart")}</Button>
    </div>
  );
}
```

- [ ] **Step 3: Replace stub `src/components/practice/PracticeView.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useInstrument } from "@/hooks/useFretboardContext";
import { usePracticeGame } from "@/hooks/usePracticeGame";
import { GameHeader } from "./GameHeader";
import { GameOverScreen } from "./GameOverScreen";

export function PracticeView() {
  const { t } = useTranslation();
  const { tuning } = useInstrument();
  // Only destructure what this task uses; expand in Tasks 6 & 7
  const { state, start, restart } = usePracticeGame(tuning);

  if (state.phase === "game_over") {
    return <GameOverScreen score={state.score} onRestart={restart} />;
  }

  if (state.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1 className="text-2xl font-bold">{t("ui.practice.title")}</h1>
        <Button size="lg" onClick={start}>
          {t("ui.practice.start")}
        </Button>
      </div>
    );
  }

  // playing — challenge components rendered in Task 6 & 7; placeholder for now
  return (
    <div className="flex flex-col h-full">
      <GameHeader
        score={state.score}
        timerMs={state.currentTimerMs}
        timerStartedAt={state.timerStartedAt}
      />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Challenge: {state.challenge?.type}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build and test**

```bash
pnpm lint:fix && pnpm build && pnpm test --run
```

Expected: passing. Open `pnpm dev`, navigate to Practice, click Start — timer bar should animate down.

- [ ] **Step 5: Commit**

```bash
git add src/components/practice/PracticeView.tsx src/components/practice/GameHeader.tsx src/components/practice/GameOverScreen.tsx
git commit -m "feat: add practice shell components (view, header, game over screen)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Challenge components — identify-interval and identify-note

**Files:**
- Create: `src/components/practice/ChallengeIdentifyInterval.tsx`
- Create: `src/components/practice/ChallengeIdentifyNote.tsx`
- Modify: `src/components/practice/PracticeView.tsx` (wire challenge routing)

**Interfaces:**
- Consumes: `IdentifyIntervalChallenge`, `IdentifyNoteChallenge` from `@/core/practice`; `answer` from `usePracticeGame`; `useTranslation`
- Produces: 2×2 choice grid; green/red feedback for 600 ms; then calls `answer(selected)`

- [ ] **Step 1: Create `src/components/practice/ChallengeIdentifyInterval.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IdentifyIntervalChallenge } from "@/core/practice";
import { Button } from "@/components/ui/button";
import type { IntervalName } from "@/types/music";

interface Props {
  challenge: IdentifyIntervalChallenge;
  onAnswer: (ans: IntervalName) => void;
}

export function ChallengeIdentifyInterval({ challenge, onAnswer }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<IntervalName | null>(null);

  function pick(opt: IntervalName) {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => {
      setSelected(null);
      onAnswer(opt);
    }, 600);
  }

  function buttonVariant(opt: IntervalName) {
    if (!selected) return "outline" as const;
    if (opt === challenge.answer) return "default" as const;
    if (opt === selected) return "destructive" as const;
    return "outline" as const;
  }

  return (
    <div className="flex flex-col items-center gap-8 p-6 max-w-md mx-auto">
      <p className="text-sm font-medium text-muted-foreground">
        {t("ui.practice.whatInterval")}
      </p>
      <div className="flex items-center gap-6">
        <span className="text-5xl font-bold">{challenge.root}</span>
        <span className="text-muted-foreground text-2xl">→</span>
        <span className="text-5xl font-bold">{challenge.target}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {challenge.options.map((opt) => (
          <Button
            key={opt}
            variant={buttonVariant(opt)}
            className="h-14 text-base"
            onClick={() => pick(opt)}
            disabled={Boolean(selected)}
          >
            {t(`ui.intervals.${opt}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/practice/ChallengeIdentifyNote.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IdentifyNoteChallenge } from "@/core/practice";
import { Button } from "@/components/ui/button";
import type { NoteName } from "@/types/music";

interface Props {
  challenge: IdentifyNoteChallenge;
  onAnswer: (ans: NoteName) => void;
}

export function ChallengeIdentifyNote({ challenge, onAnswer }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<NoteName | null>(null);

  function pick(opt: NoteName) {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => {
      setSelected(null);
      onAnswer(opt);
    }, 600);
  }

  function buttonVariant(opt: NoteName) {
    if (!selected) return "outline" as const;
    if (opt === challenge.answer) return "default" as const;
    if (opt === selected) return "destructive" as const;
    return "outline" as const;
  }

  return (
    <div className="flex flex-col items-center gap-8 p-6 max-w-md mx-auto">
      <p className="text-sm font-medium text-muted-foreground">
        {t("ui.practice.whatNote", {
          interval: t(`ui.intervals.${challenge.interval}`),
          root: challenge.root,
        })}
      </p>
      <span className="text-6xl font-bold">{challenge.root}</span>
      <div className="grid grid-cols-2 gap-3 w-full">
        {challenge.options.map((opt) => (
          <Button
            key={opt}
            variant={buttonVariant(opt)}
            className="h-14 text-base"
            onClick={() => pick(opt)}
            disabled={Boolean(selected)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire challenge routing in `src/components/practice/PracticeView.tsx`**

Replace the `// playing` section with:

```tsx
import { ChallengeIdentifyInterval } from "./ChallengeIdentifyInterval";
import { ChallengeIdentifyNote } from "./ChallengeIdentifyNote";

// ... inside the playing block:
return (
  <div className="flex flex-col h-full">
    <GameHeader
      score={state.score}
      timerMs={state.currentTimerMs}
      timerStartedAt={state.timerStartedAt}
    />
    <div className="flex-1 flex items-center justify-center">
      {state.challenge?.type === "identify-interval" && (
        <ChallengeIdentifyInterval
          challenge={state.challenge}
          onAnswer={answer}
        />
      )}
      {state.challenge?.type === "identify-note" && (
        <ChallengeIdentifyNote
          challenge={state.challenge}
          onAnswer={answer}
        />
      )}
      {state.challenge?.type === "fretboard-mark" && (
        <div className="text-muted-foreground">
          Fretboard challenge — coming in next task
        </div>
      )}
    </div>
  </div>
);
```

- [ ] **Step 4: Build and manual test**

```bash
pnpm lint:fix && pnpm build && pnpm test --run
```

Then `pnpm dev`, navigate to Practice, click Start. Verify:
- Challenge cards render with two note names or a root + interval label
- Clicking the correct answer turns it green for 600 ms then advances
- Clicking the wrong answer turns it red + correct turns green, then advances
- Timer bar resets with each new challenge

- [ ] **Step 5: Commit**

```bash
git add src/components/practice/ChallengeIdentifyInterval.tsx src/components/practice/ChallengeIdentifyNote.tsx src/components/practice/PracticeView.tsx
git commit -m "feat: add identify-interval and identify-note challenge components

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: FretboardDiagram click extension + ChallengeFretboardMark

**Files:**
- Modify: `src/components/FretboardDiagram.tsx` (add `onClickPosition`, `markedPositions` props)
- Create: `src/components/practice/ChallengeFretboardMark.tsx`
- Modify: `src/components/practice/PracticeView.tsx` (wire fretboard challenge)

**Interfaces:**
- Consumes: `FretboardDiagram` extended API; `FretboardMarkChallenge`; `allFretboardPositions` from `@/core/practice`; `togglePosition`, `submitFretboard` from `usePracticeGame`; `useInstrument().tuning`
- Produces: fully interactive fretboard challenge; ghost dots everywhere, root highlighted, marked positions shown in primary color

- [ ] **Step 1: Extend `FretboardDiagramProps` in `src/components/FretboardDiagram.tsx`**

In the `FretboardDiagramProps` interface, add two optional props after `onHoverPosition`:

```tsx
onClickPosition?: (pos: FretPosition) => void;
markedPositions?: Set<string>; // keys: `${string}-${fret}`
```

- [ ] **Step 2: Destructure new props in `FretboardDiagram` function signature**

Change:
```tsx
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
```

To:
```tsx
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
  onClickPosition,
  markedPositions,
}: FretboardDiagramProps) {
```

- [ ] **Step 3: Update dot rendering in `FretboardDiagram.tsx`**

Replace the `{positions.map((pos) => {` block:

```tsx
{positions.map((pos) => {
  const cx = dotX(pos.fret);
  const cy = stringY(pos.string);
  const root = isRoot(pos);
  const label = dotLabel(pos);
  const posKey = `${pos.string}-${pos.fret}`;
  const isMarked = markedPositions?.has(posKey) ?? false;
  const isGhost = markedPositions !== undefined && !root && !isMarked;
  const interactive = Boolean(onHoverPosition) || Boolean(onClickPosition);

  return (
    <g
      key={`dot-${pos.string}-${pos.fret}`}
      className={interactive ? "cursor-pointer" : undefined}
      onMouseEnter={
        onHoverPosition
          ? () => onHoverPosition({ x: cx, y: cy, pos })
          : undefined
      }
      onMouseLeave={
        onHoverPosition ? () => onHoverPosition(null) : undefined
      }
      onClick={onClickPosition ? () => onClickPosition(pos) : undefined}
    >
      <circle
        cx={cx}
        cy={cy}
        r={d.dotRadius}
        className={
          root
            ? "fill-rose-500 stroke-rose-300"
            : isMarked
              ? "fill-primary stroke-primary/50"
              : isGhost
                ? "fill-muted-foreground/25 stroke-transparent"
                : "fill-foreground stroke-background"
        }
        strokeWidth={root ? 2 : 1}
      />
      {label && !isGhost && (
        <text
          x={cx}
          y={cy}
          dy="0.35em"
          textAnchor="middle"
          fontSize={d.dotFontSize}
          fontWeight={root ? 700 : 500}
          className={
            root
              ? "fill-white select-none"
              : "fill-background select-none"
          }
        >
          {label}
        </text>
      )}
    </g>
  );
})}
```

- [ ] **Step 4: Create `src/components/practice/ChallengeFretboardMark.tsx`**

```tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { allFretboardPositions } from "@/core/practice";
import type { FretboardMarkChallenge } from "@/core/practice";
import { FretboardDiagram, MAIN_DIMENSIONS } from "@/components/FretboardDiagram";
import { Button } from "@/components/ui/button";
import type { FretPosition, Tuning } from "@/types/music";

interface Props {
  challenge: FretboardMarkChallenge;
  tuning: Tuning;
  markedPositions: Set<string>;
  onToggle: (pos: FretPosition) => void;
  onSubmit: () => void;
}

export function ChallengeFretboardMark({
  challenge,
  tuning,
  markedPositions,
  onToggle,
  onSubmit,
}: Props) {
  const { t } = useTranslation();

  const allPositions = useMemo(
    () => allFretboardPositions(tuning),
    [tuning],
  );

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full">
      <p className="text-sm font-medium text-muted-foreground text-center">
        {t("ui.practice.markInterval", {
          interval: t(`ui.intervals.${challenge.interval}`),
          root: challenge.root,
        })}
      </p>
      <div className="w-full overflow-x-auto">
        <FretboardDiagram
          positions={allPositions}
          stringCount={tuning.length}
          minFret={0}
          maxFret={12}
          dimensions={MAIN_DIMENSIONS}
          displayMode="none"
          highlightRoot
          rootPitchClass={challenge.root}
          markedPositions={markedPositions}
          onClickPosition={onToggle}
        />
      </div>
      <Button onClick={onSubmit} className="w-32">
        {t("ui.practice.check")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Wire fretboard challenge in `src/components/practice/PracticeView.tsx`**

Add import:
```tsx
import { ChallengeFretboardMark } from "./ChallengeFretboardMark";
```

Replace the fretboard placeholder (also expand the `usePracticeGame` destructuring to include `togglePosition` and `submitFretboard`):
```tsx
{state.challenge?.type === "fretboard-mark" && (
  <ChallengeFretboardMark
    challenge={state.challenge}
    tuning={tuning}
    markedPositions={state.markedPositions}
    onToggle={togglePosition}
    onSubmit={submitFretboard}
  />
)}
```

- [ ] **Step 6: Build and manual test**

```bash
pnpm lint:fix && pnpm build && pnpm test --run
```

Then `pnpm dev`, navigate to Practice. Keep clicking Start until a fretboard challenge appears. Verify:
- Full fretboard renders (frets 0–12)
- Root note positions appear highlighted in red
- Clicking a dot marks it in primary color; clicking again unmarks it
- Check button evaluates the answer and moves to the next challenge

- [ ] **Step 7: Commit**

```bash
git add src/components/FretboardDiagram.tsx src/components/practice/ChallengeFretboardMark.tsx src/components/practice/PracticeView.tsx
git commit -m "feat: add fretboard-mark challenge with click-to-mark interaction

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Final validation and PR

**Files:** no new files — validation and handoff only.

- [ ] **Step 1: Full lint + build + test**

```bash
pnpm lint:fix && pnpm lint && pnpm build && pnpm test --run
```

Expected: 0 lint errors, build succeeds, 90+ tests passing.

- [ ] **Step 2: Manual smoke test checklist**

Run `pnpm dev` and verify:
- [ ] Sidebar shows "Practice" (en) / "Prática" (pt-BR) with Target icon
- [ ] Clicking Practice shows idle screen with Start button
- [ ] Timer bar appears on game start and shrinks to zero
- [ ] Correct answers show green feedback → advance to next challenge
- [ ] Wrong answers show red + correct highlighted → advance
- [ ] Timer running out transitions to game_over screen with final score
- [ ] Play Again resets to idle
- [ ] Fretboard challenge renders full fretboard, root highlighted
- [ ] Dots toggle on click, Check submits
- [ ] Language toggle switches interval names (e.g., "Minor 3rd" ↔ "3ª menor")
- [ ] Existing fretboard view still works (regression check)

- [ ] **Step 3: Post checkpoint comment on issue**

```bash
gh issue comment 17 --repo hgrafa/toneward --body "## Claude checkpoint

Issue: #17
Branch: \`worktree-issue-17-interval-practice\`
Status: ready-for-review

### Done
- Core practice module with challenge generation + timer math (unit tested)
- i18n for all 12 interval names in en + pt-BR
- \"practice\" view added to routing + sidebar
- \`usePracticeGame\` reducer hook with timer effect
- GameHeader (score + CSS timer bar), GameOverScreen
- ChallengeIdentifyInterval, ChallengeIdentifyNote (2×2 choice grid, 600ms feedback)
- FretboardDiagram extended with \`onClickPosition\` + \`markedPositions\` ghost-dot mode
- ChallengeFretboardMark (click-to-mark full fretboard)

### Validation
- [x] \`pnpm lint\`
- [x] \`pnpm build\`
- [x] \`pnpm test\` (90+ tests)

— Claude"
```

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --base main \
  --title "feat: interval practice tab with gamified challenges" \
  --body "$(cat <<'EOF'
## Summary

Closes #17

Adds a new **Practice** view with three gamified interval challenges:

1. **Identify Interval** — two notes shown, user picks the interval name from 4 choices
2. **Identify Note** — root + interval shown, user picks the target note from 4 choices
3. **Fretboard Mark** — full fretboard shown with roots highlighted, user clicks to mark all interval positions then hits Check

A countdown timer speeds up on each correct answer. Running out ends the round.

## What changed

- `src/core/practice.ts` — pure challenge generation, timer math, fretboard position helpers (unit tested)
- `src/hooks/usePracticeGame.ts` — `useReducer` game state hook (no new context)
- `src/components/practice/` — PracticeView, GameHeader, GameOverScreen, ChallengeIdentifyInterval, ChallengeIdentifyNote, ChallengeFretboardMark
- `src/components/FretboardDiagram.tsx` — added `onClickPosition` + `markedPositions` props (ghost-dot mode for practice)
- `src/i18n/locales/en.ts` + `pt-BR.ts` — interval names and practice UI strings
- `src/types/showroom.ts`, `ViewContext`, `AppSidebar`, `App.tsx` — routing

## Validation

- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `pnpm test` (90+ tests)

## Review notes

Focus on:
- Architecture boundaries (core stays pure TS, hook is self-contained)
- Music-theory correctness in `practice.ts`
- `FretboardDiagram` change is backward-compatible (new props are optional)
- Timer CSS animation (key change resets the bar)

## Known limitations

- High score not persisted (out of scope)
- Challenge type weights are equal (1/3 each); could be tuned
- No audio feedback on correct/incorrect answer

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Update issue labels**

```bash
gh issue edit 17 --repo hgrafa/toneward --add-label "claude:review" --remove-label "claude:in-progress" || true
```
