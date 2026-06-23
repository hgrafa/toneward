import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type TimerMode = "up" | "down";

export function formatClock(total: number): string {
	const s = Math.max(0, Math.floor(total));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// Self-contained study-time tracker. Lives at the app shell and ticks on its
// own interval, so it is completely independent of the fretboard, the practice
// game, the metronome, and the audio player — starting it never disturbs them.

const GOAL_KEY = "tw-study-goal";
const MODE_KEY = "tw-study-mode";
const DURATION_KEY = "tw-study-duration";
const MIN_DURATION = 1;
const MAX_DURATION = 180;

function read(key: string, fallback: string): string {
	try {
		return localStorage.getItem(key) ?? fallback;
	} catch {
		return fallback;
	}
}

function clampDuration(n: number): number {
	if (!Number.isFinite(n)) return 25;
	return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(n)));
}

interface StudyTimerState {
	mode: TimerMode;
	setMode: (m: TimerMode) => void;
	running: boolean;
	elapsed: number; // seconds counted since the last reset
	durationMin: number; // target length for "down" mode
	setDurationMin: (n: number) => void;
	remaining: number; // seconds left in "down" mode
	finished: boolean; // a countdown reached zero
	goal: string;
	setGoal: (g: string) => void;
	start: () => void;
	pause: () => void;
	reset: () => void;
	finish: () => void;
	dismissFinished: () => void;
}

const StudyTimerContext = createContext<StudyTimerState | null>(null);

export function StudyTimerProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<TimerMode>(() =>
		read(MODE_KEY, "down") === "up" ? "up" : "down",
	);
	const [durationMin, setDurationMinState] = useState<number>(() =>
		clampDuration(Number(read(DURATION_KEY, "25"))),
	);
	const [goal, setGoalState] = useState<string>(() => read(GOAL_KEY, ""));
	const [elapsed, setElapsed] = useState(0);
	const [running, setRunning] = useState(false);
	const [finished, setFinished] = useState(false);

	const durationSec = durationMin * 60;
	const remaining = Math.max(0, durationSec - elapsed);

	// Tick once per second while running.
	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
		return () => window.clearInterval(id);
	}, [running]);

	// Stop a countdown the moment it reaches zero and flag the congrats state.
	useEffect(() => {
		if (mode === "down" && running && elapsed >= durationSec) {
			setRunning(false);
			setFinished(true);
		}
	}, [mode, running, elapsed, durationSec]);

	// Persist the settings (not the live count).
	useEffect(() => {
		try {
			localStorage.setItem(MODE_KEY, mode);
		} catch {
			/* storage unavailable */
		}
	}, [mode]);
	useEffect(() => {
		try {
			localStorage.setItem(DURATION_KEY, String(durationMin));
		} catch {
			/* storage unavailable */
		}
	}, [durationMin]);
	useEffect(() => {
		try {
			localStorage.setItem(GOAL_KEY, goal);
		} catch {
			/* storage unavailable */
		}
	}, [goal]);

	const setMode = useCallback((m: TimerMode) => {
		setModeState(m);
		setRunning(false);
		setElapsed(0);
		setFinished(false);
	}, []);

	const setDurationMin = useCallback((n: number) => {
		setDurationMinState(clampDuration(n));
		setElapsed(0);
		setFinished(false);
	}, []);

	const start = useCallback(() => {
		// Restart a finished countdown from the top.
		setElapsed((e) => (mode === "down" && e >= durationSec ? 0 : e));
		setFinished(false);
		setRunning(true);
	}, [mode, durationSec]);

	const pause = useCallback(() => setRunning(false), []);

	const reset = useCallback(() => {
		setRunning(false);
		setElapsed(0);
		setFinished(false);
	}, []);

	// Finish a count-up session on demand (no countdown to reach zero).
	const finish = useCallback(() => {
		setRunning(false);
		setFinished(true);
	}, []);

	const setGoal = useCallback((g: string) => setGoalState(g), []);
	const dismissFinished = useCallback(() => setFinished(false), []);

	const value = useMemo<StudyTimerState>(
		() => ({
			mode,
			setMode,
			running,
			elapsed,
			durationMin,
			setDurationMin,
			remaining,
			finished,
			goal,
			setGoal,
			start,
			pause,
			reset,
			finish,
			dismissFinished,
		}),
		[
			mode,
			setMode,
			running,
			elapsed,
			durationMin,
			setDurationMin,
			remaining,
			finished,
			goal,
			setGoal,
			start,
			pause,
			reset,
			dismissFinished,
			finish,
		],
	);

	return (
		<StudyTimerContext.Provider value={value}>
			{children}
		</StudyTimerContext.Provider>
	);
}

export function useStudyTimer(): StudyTimerState {
	const ctx = useContext(StudyTimerContext);
	if (!ctx)
		throw new Error("useStudyTimer must be used within a StudyTimerProvider");
	return ctx;
}
