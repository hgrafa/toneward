import { useEffect, useRef, useState } from "react";
import { useInstrument } from "@/hooks/useFretboardContext";
import { usePracticeGame } from "@/hooks/usePracticeGame";
import {
	getMuted,
	playCorrect,
	playGameOver,
	playWrong,
	setMuted,
} from "@/lib/practiceAudio";
import { ChallengeFretboardMark } from "./ChallengeFretboardMark";
import { ChallengeIdentifyInterval } from "./ChallengeIdentifyInterval";
import { ChallengeIdentifyNote } from "./ChallengeIdentifyNote";
import { GameHeader } from "./GameHeader";
import { LandingScreen } from "./LandingScreen";

export function PracticeView() {
	const { tuning } = useInstrument();
	const { state, start, answer, togglePosition, submitFretboard } =
		usePracticeGame(tuning);

	const [muted, setMutedState] = useState(() => getMuted());

	function toggleMute() {
		const next = !muted;
		setMutedState(next);
		setMuted(next);
	}

	// Game-over sound, once per round.
	useEffect(() => {
		if (state.phase === "game_over") playGameOver();
	}, [state.phase]);

	// Shake the card briefly when a life is lost.
	const [shakeKey, setShakeKey] = useState(0);
	const prevLives = useRef(state.lives);
	useEffect(() => {
		if (state.lives < prevLives.current) setShakeKey((k) => k + 1);
		prevLives.current = state.lives;
	}, [state.lives]);

	function handleSubmitFretboard() {
		const wasCorrect = submitFretboard();
		if (wasCorrect) playCorrect();
		else playWrong();
	}

	if (state.phase !== "playing") {
		return <LandingScreen lastResult={state.lastResult} onStart={start} />;
	}

	const isFretboard = state.challenge?.type === "fretboard-mark";
	return (
		<div className="flex items-center justify-center h-full p-4">
			<div
				key={shakeKey}
				className={`w-full rounded-2xl border border-border shadow-lg overflow-hidden ${shakeKey > 0 ? "anim-card-shake" : ""} ${isFretboard ? "max-w-2xl" : "max-w-lg"}`}
			>
				<GameHeader
					score={state.score}
					streak={state.streak}
					lives={state.lives}
					timerMs={state.currentTimerMs}
					timerStartedAt={state.timerStartedAt}
					muted={muted}
					onToggleMute={toggleMute}
				/>
				<div className="p-6">
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
						<ChallengeFretboardMark
							challenge={state.challenge}
							tuning={tuning}
							markedPositions={state.markedPositions}
							onToggle={togglePosition}
							onSubmit={handleSubmitFretboard}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
