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
import { saveScore } from "@/lib/practiceScores";
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
	lives: number;
	durations: Record<ChallengeType, number>;
	timerStartedAt: number;
	currentTimerMs: number;
	markedPositions: Set<string>;
	gameStartedAt: number;
	endedAt: number;
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
				nextLives: number;
			};
	  }
	| { type: "TOGGLE_POSITION"; payload: string }
	| { type: "TIMEOUT"; payload: number }
	| { type: "GAME_OVER"; payload: number }
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
	lives: 3,
	durations: { ...INITIAL_DURATIONS },
	timerStartedAt: 0,
	currentTimerMs: 0,
	markedPositions: new Set(),
	gameStartedAt: 0,
	endedAt: 0,
};

function pickRandomType(score: number): ChallengeType {
	if (score < 5) {
		return Math.random() < 0.5 ? "identify-interval" : "identify-note";
	}
	if (score < 10) {
		const r = Math.random();
		if (r < 0.425) return "identify-interval";
		if (r < 0.85) return "identify-note";
		return "fretboard-mark";
	}
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
				gameStartedAt: now,
			};
		}
		case "NEXT": {
			const {
				isCorrect,
				nextChallenge,
				now,
				newDuration,
				prevType,
				nextLives,
			} = action.payload;
			const newDurations = { ...state.durations, [prevType]: newDuration };
			return {
				...state,
				score: isCorrect ? state.score + 1 : state.score,
				lives: nextLives,
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
			return { ...state, phase: "game_over", endedAt: action.payload };
		case "GAME_OVER":
			return { ...state, phase: "game_over", endedAt: action.payload };
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

	// Countdown timer — single shot per challenge.
	// state.timerStartedAt is intentionally listed: it is the signal that a new
	// challenge has arrived and the countdown should restart even when
	// currentTimerMs happens to be the same value.
	useEffect(() => {
		if (state.phase !== "playing") return;
		void state.timerStartedAt; // declare dep explicitly; reset signal
		const id = setTimeout(
			() => dispatch({ type: "TIMEOUT", payload: Date.now() }),
			state.currentTimerMs,
		);
		return () => clearTimeout(id);
	}, [state.timerStartedAt, state.phase, state.currentTimerMs]);

	// End round when lives reach 0
	useEffect(() => {
		if (state.phase === "playing" && state.lives === 0) {
			dispatch({ type: "GAME_OVER", payload: Date.now() });
		}
	}, [state.lives, state.phase]);

	// Save score once when round ends
	useEffect(() => {
		if (state.phase === "game_over" && state.endedAt > 0 && state.score > 0) {
			saveScore({
				score: state.score,
				totalTimeMs: state.endedAt - state.gameStartedAt,
				date: state.endedAt,
			});
		}
	}, [state.endedAt, state.gameStartedAt, state.phase, state.score]);

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
		const nextLives = isCorrect ? state.lives : state.lives - 1;
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
				nextLives,
			},
		});
	}

	function togglePosition(pos: FretPosition) {
		dispatch({
			type: "TOGGLE_POSITION",
			payload: `${pos.string}-${pos.fret}`,
		});
	}

	function submitFretboard(): boolean {
		if (!state.challenge || state.challenge.type !== "fretboard-mark")
			return false;
		const isCorrect = checkFretboardAnswer(
			state.challenge as FretboardMarkChallenge,
			state.markedPositions,
		);
		const prevType = state.challenge.type;
		const newDuration = isCorrect
			? nextDuration(state.durations[prevType], prevType)
			: state.durations[prevType];
		const nextLives = isCorrect ? state.lives : state.lives - 1;
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
				nextLives,
			},
		});
		return isCorrect;
	}

	function restart() {
		dispatch({ type: "RESTART" });
	}

	const totalTimeMs =
		state.endedAt > 0 ? state.endedAt - state.gameStartedAt : 0;

	return {
		state,
		totalTimeMs,
		start,
		answer,
		togglePosition,
		submitFretboard,
		restart,
	};
}
