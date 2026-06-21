import { useEffect, useReducer, useRef } from "react";
import type {
	Challenge,
	ChallengeType,
	FretboardMarkChallenge,
} from "@/core/practice";
import {
	checkFretboardAnswer,
	generateChallenge,
	nextDuration,
	TIMER_CONFIG,
} from "@/core/practice";
import type {
	FretPosition,
	IntervalName,
	NoteName,
	Tuning,
} from "@/types/music";

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

function pickRandomType(score: number): ChallengeType {
	// First 5 correct answers: text-only challenges
	if (score < 5) {
		return Math.random() < 0.5 ? "identify-interval" : "identify-note";
	}
	// Score 5–9: fretboard appears 15% of the time
	if (score < 10) {
		const r = Math.random();
		if (r < 0.425) return "identify-interval";
		if (r < 0.85) return "identify-note";
		return "fretboard-mark";
	}
	// Score 10+: fretboard appears 25% of the time
	const r = Math.random();
	if (r < 0.375) return "identify-interval";
	if (r < 0.75) return "identify-note";
	return "fretboard-mark";
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
			// Use newDurations so currentTimerMs is correct when next type == prev type
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: timerStartedAt is intentional — it is the trigger to restart the countdown when a new challenge arrives
	useEffect(() => {
		if (state.phase !== "playing") return;
		const id = setTimeout(
			() => dispatch({ type: "TIMEOUT" }),
			state.currentTimerMs,
		);
		return () => clearTimeout(id);
	}, [state.timerStartedAt, state.phase, state.currentTimerMs]);

	function start() {
		const type = pickRandomType(0);
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
		const nextScore = isCorrect ? state.score + 1 : state.score;
		const nextType = pickRandomType(nextScore);
		const nextChallenge = generateChallenge(nextType, tuningRef.current);
		dispatch({
			type: "NEXT",
			payload: {
				isCorrect,
				nextChallenge,
				now: Date.now(),
				newDuration,
				prevType,
			},
		});
	}

	function togglePosition(pos: FretPosition) {
		dispatch({ type: "TOGGLE_POSITION", payload: `${pos.string}-${pos.fret}` });
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
		const nextScore = isCorrect ? state.score + 1 : state.score;
		const nextType = pickRandomType(nextScore);
		const nextChallenge = generateChallenge(nextType, tuningRef.current);
		dispatch({
			type: "NEXT",
			payload: {
				isCorrect,
				nextChallenge,
				now: Date.now(),
				newDuration,
				prevType,
			},
		});
	}

	function restart() {
		dispatch({ type: "RESTART" });
	}

	return { state, start, answer, togglePosition, submitFretboard, restart };
}
