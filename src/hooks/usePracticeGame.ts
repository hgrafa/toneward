import { useEffect, useReducer, useRef } from "react";
import type {
	Challenge,
	ChallengeType,
	FretboardMarkChallenge,
} from "@/core/practice";
import {
	checkFretboardAnswer,
	durationForStreak,
	generateChallenge,
	TIMER_CONFIG,
} from "@/core/practice";
import { playWrong } from "@/lib/practiceAudio";
import { saveScore } from "@/lib/practiceScores";
import type {
	FretPosition,
	IntervalName,
	NoteName,
	Tuning,
} from "@/types/music";

export interface LastResult {
	score: number;
	totalTimeMs: number;
	endedAt: number;
	maxStreak: number;
}

export interface PracticeState {
	phase: "idle" | "playing" | "game_over";
	challenge: Challenge | null;
	score: number;
	lives: number;
	streak: number;
	maxStreak: number;
	timerStartedAt: number;
	currentTimerMs: number;
	paused: boolean;
	markedPositions: Set<string>;
	gameStartedAt: number;
	endedAt: number;
	lastResult: LastResult | null;
}

type Action =
	| { type: "START"; payload: { challenge: Challenge; now: number } }
	| {
			type: "NEXT";
			payload: {
				isCorrect: boolean;
				nextChallenge: Challenge;
				now: number;
				nextStreak: number;
				nextMaxStreak: number;
				nextLives: number;
				nextTimerMs: number;
			};
	  }
	| { type: "TOGGLE_POSITION"; payload: string }
	| { type: "PAUSE"; payload: number }
	| { type: "RESUME"; payload: number }
	| { type: "QUIT" }
	| { type: "GAME_OVER"; payload: number };

const INITIAL_STATE: PracticeState = {
	phase: "idle",
	challenge: null,
	score: 0,
	lives: 3,
	streak: 0,
	maxStreak: 0,
	timerStartedAt: 0,
	currentTimerMs: 0,
	paused: false,
	markedPositions: new Set(),
	gameStartedAt: 0,
	endedAt: 0,
	lastResult: null,
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
				timerStartedAt: now,
				currentTimerMs: TIMER_CONFIG[challenge.type].start,
				gameStartedAt: now,
			};
		}
		case "NEXT": {
			const {
				isCorrect,
				nextChallenge,
				now,
				nextStreak,
				nextMaxStreak,
				nextLives,
				nextTimerMs,
			} = action.payload;
			return {
				...state,
				score: isCorrect ? state.score + 1 : state.score,
				lives: nextLives,
				streak: nextStreak,
				maxStreak: nextMaxStreak,
				challenge: nextChallenge,
				timerStartedAt: now,
				currentTimerMs: nextTimerMs,
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
		case "PAUSE": {
			// Freeze the countdown, keeping the time left for resume.
			const remaining = Math.max(
				0,
				state.currentTimerMs - (action.payload - state.timerStartedAt),
			);
			return { ...state, paused: true, currentTimerMs: remaining };
		}
		case "RESUME": {
			return { ...state, paused: false, timerStartedAt: action.payload };
		}
		case "QUIT": {
			// Abandon the round: back to the landing, no score saved. Keep the
			// previously finished match so the landing still shows it.
			return { ...INITIAL_STATE, lastResult: state.lastResult };
		}
		case "GAME_OVER": {
			const endedAt = action.payload;
			return {
				...state,
				phase: "game_over",
				endedAt,
				lastResult: {
					score: state.score,
					totalTimeMs: endedAt - state.gameStartedAt,
					endedAt,
					maxStreak: state.maxStreak,
				},
			};
		}
		default:
			return state;
	}
}

export function usePracticeGame(tuning: Tuning) {
	const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
	const tuningRef = useRef(tuning);
	tuningRef.current = tuning;

	const stateRef = useRef(state);
	stateRef.current = state;

	// Countdown timer — single shot per challenge. timerStartedAt is the reset
	// signal. On expiry: lose a heart and (if any hearts remain) advance to the
	// next challenge with the streak reset — a timeout is forgiving, not instant
	// death. Game over only when the last heart is spent.
	useEffect(() => {
		if (state.phase !== "playing" || state.paused) return;
		const id = setTimeout(() => {
			const s = stateRef.current;
			const nextLives = s.lives - 1;
			if (nextLives <= 0) {
				playWrong();
				dispatch({ type: "GAME_OVER", payload: Date.now() });
				return;
			}
			playWrong();
			const nextType = pickRandomType(s.score);
			const nextChallenge = generateChallenge(nextType, tuningRef.current);
			dispatch({
				type: "NEXT",
				payload: {
					isCorrect: false,
					nextChallenge,
					now: Date.now(),
					nextStreak: 0,
					nextMaxStreak: s.maxStreak,
					nextLives,
					nextTimerMs: durationForStreak(0, nextType),
				},
			});
		}, state.currentTimerMs);
		return () => clearTimeout(id);
	}, [state.phase, state.currentTimerMs, state.paused]);

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

	function advance(isCorrect: boolean) {
		const nextStreak = isCorrect ? state.streak + 1 : 0;
		const nextMaxStreak = Math.max(state.maxStreak, nextStreak);
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
				nextStreak,
				nextMaxStreak,
				nextLives,
				nextTimerMs: durationForStreak(nextStreak, nextType),
			},
		});
	}

	function answer(ans: IntervalName | NoteName) {
		if (!state.challenge || state.challenge.type === "fretboard-mark") return;
		const isCorrect = ans === state.challenge.answer;
		advance(isCorrect);
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
		advance(isCorrect);
		return isCorrect;
	}

	function pause() {
		dispatch({ type: "PAUSE", payload: Date.now() });
	}

	function resume() {
		dispatch({ type: "RESUME", payload: Date.now() });
	}

	function quit() {
		dispatch({ type: "QUIT" });
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
		pause,
		resume,
		quit,
	};
}
