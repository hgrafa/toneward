import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useInstrument } from "@/hooks/useFretboardContext";
import { usePracticeGame } from "@/hooks/usePracticeGame";
import { ChallengeFretboardMark } from "./ChallengeFretboardMark";
import { ChallengeIdentifyInterval } from "./ChallengeIdentifyInterval";
import { ChallengeIdentifyNote } from "./ChallengeIdentifyNote";
import { GameHeader } from "./GameHeader";
import { GameOverScreen } from "./GameOverScreen";

export function PracticeView() {
	const { t } = useTranslation();
	const { tuning } = useInstrument();
	const { state, start, answer, togglePosition, submitFretboard, restart } =
		usePracticeGame(tuning);

	if (state.phase === "game_over") {
		return <GameOverScreen score={state.score} onRestart={restart} />;
	}

	if (state.phase === "idle") {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-black">{t("ui.practice.title")}</h1>
					<p className="text-sm text-muted-foreground max-w-xs mx-auto">
						{t("ui.practice.description")}
					</p>
				</div>
				<Button size="lg" onClick={start} className="px-10">
					{t("ui.practice.start")}
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<GameHeader
				score={state.score}
				timerMs={state.currentTimerMs}
				timerStartedAt={state.timerStartedAt}
			/>
			<div className="flex-1 flex items-center justify-center overflow-y-auto">
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
						onSubmit={submitFretboard}
					/>
				)}
			</div>
		</div>
	);
}
