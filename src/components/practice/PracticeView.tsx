import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const { t } = useTranslation();
	const { tuning } = useInstrument();
	const {
		state,
		start,
		answer,
		togglePosition,
		submitFretboard,
		pause,
		resume,
		quit,
	} = usePracticeGame(tuning);

	const [muted, setMutedState] = useState(() => getMuted());
	const [confirmQuit, setConfirmQuit] = useState(false);

	function toggleMute() {
		const next = !muted;
		setMutedState(next);
		setMuted(next);
	}

	// Open the quit confirmation and freeze the countdown while deciding.
	function requestQuit() {
		setConfirmQuit(true);
		pause();
	}

	// Cancel: close the dialog and resume the frozen countdown.
	function cancelQuit() {
		setConfirmQuit(false);
		resume();
	}

	// Confirm: abandon the round and return to the landing screen.
	function confirmQuitRound() {
		setConfirmQuit(false);
		quit();
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
				className={`w-full rounded-2xl border border-border shadow-lg overflow-hidden ${shakeKey > 0 ? "anim-card-shake" : ""} ${isFretboard ? "max-w-2xl" : "max-w-xl"}`}
			>
				<GameHeader
					score={state.score}
					streak={state.streak}
					lives={state.lives}
					timerMs={state.currentTimerMs}
					timerStartedAt={state.timerStartedAt}
					muted={muted}
					onToggleMute={toggleMute}
					onExit={requestQuit}
				/>
				<div className="p-10">
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
			<Dialog
				open={confirmQuit}
				onOpenChange={(open) => {
					if (!open) cancelQuit();
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>{t("ui.practice.quitTitle")}</DialogTitle>
						<DialogDescription>{t("ui.practice.quitBody")}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={cancelQuit}>
							{t("ui.practice.quitCancel")}
						</Button>
						<Button variant="destructive" onClick={confirmQuitRound}>
							{t("ui.practice.quitConfirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
