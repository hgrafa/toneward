import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useInstrument } from "@/hooks/useFretboardContext";
import { usePracticeGame } from "@/hooks/usePracticeGame";
import {
	getMuted,
	playCorrect,
	playGameOver,
	playWrong,
	setMuted,
} from "@/lib/practiceAudio";
import { formatDate, formatTime, loadScores } from "@/lib/practiceScores";
import { ChallengeFretboardMark } from "./ChallengeFretboardMark";
import { ChallengeIdentifyInterval } from "./ChallengeIdentifyInterval";
import { ChallengeIdentifyNote } from "./ChallengeIdentifyNote";
import { GameHeader } from "./GameHeader";
import { GameOverScreen } from "./GameOverScreen";

export function PracticeView() {
	const { t } = useTranslation();
	const { tuning } = useInstrument();
	const {
		state,
		totalTimeMs,
		start,
		answer,
		togglePosition,
		submitFretboard,
		restart,
	} = usePracticeGame(tuning);

	const [muted, setMutedState] = useState(() => getMuted());

	function toggleMute() {
		const next = !muted;
		setMutedState(next);
		setMuted(next);
	}

	// Play game-over sound once when round ends
	useEffect(() => {
		if (state.phase === "game_over") playGameOver();
	}, [state.phase]);

	function handleSubmitFretboard() {
		const wasCorrect = submitFretboard();
		if (wasCorrect) playCorrect();
		else playWrong();
	}

	if (state.phase === "game_over") {
		return (
			<div className="flex items-center justify-center h-full p-4">
				<div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-lg">
					<GameOverScreen
						score={state.score}
						totalTimeMs={totalTimeMs}
						endedAt={state.endedAt}
						onRestart={restart}
					/>
				</div>
			</div>
		);
	}

	if (state.phase === "idle") {
		const scores = loadScores();
		const rankStyle = [
			{ iconColor: "text-yellow-400", textColor: "text-yellow-500" },
			{ iconColor: "text-slate-400", textColor: "text-slate-400" },
			{ iconColor: "text-amber-600", textColor: "text-amber-600" },
		];
		return (
			<div className="flex items-center justify-center h-full p-4 overflow-y-auto">
				<div className="flex flex-col items-center gap-8 text-center py-8 w-full max-w-sm md:max-w-2xl">
					<div className="space-y-2">
						<h1 className="text-3xl font-black">{t("ui.practice.title")}</h1>
						<p className="text-sm text-muted-foreground">
							{t("ui.practice.description")}
						</p>
					</div>
					<Button size="lg" onClick={start} className="px-10">
						{t("ui.practice.start")}
					</Button>
					{scores.length > 0 && (
						<div className="w-full space-y-2 text-left">
							<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
								{t("ui.practice.bestScores")}
							</p>
							<div className="rounded-lg border border-border overflow-hidden">
								{/* column headers */}
								<div className="grid grid-cols-[2.5rem_1fr_3.5rem_5.5rem] md:grid-cols-[3.5rem_1fr_6rem_8.5rem] items-center px-3 md:px-6 py-2 bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
									<span>{t("ui.practice.colRank")}</span>
									<span className="text-center">{t("ui.practice.score")}</span>
									<span className="text-right">{t("ui.practice.colTime")}</span>
									<span className="text-right">{t("ui.practice.colDate")}</span>
								</div>
								{scores.slice(0, 5).map((s, i) => {
									const style = rankStyle[i];
									return (
										<div
											key={`${s.date}-${i}`}
											className="grid grid-cols-[2.5rem_1fr_3.5rem_5.5rem] md:grid-cols-[3.5rem_1fr_6rem_8.5rem] items-center px-3 md:px-6 py-3 bg-card text-sm border-b border-border last:border-0"
										>
											<span className="flex items-center gap-1">
												{style && (
													<Trophy
														size={12}
														className={style.iconColor}
														strokeWidth={2.5}
													/>
												)}
												<span
													className={`font-bold tabular-nums text-xs ${style ? style.textColor : "text-muted-foreground"}`}
												>
													#{i + 1}
												</span>
											</span>
											<span className="text-center font-black text-lg tabular-nums">
												{s.score}
											</span>
											<span className="text-right text-muted-foreground tabular-nums text-xs">
												{formatTime(s.totalTimeMs)}
											</span>
											<span className="text-right leading-tight">
												<span className="block text-muted-foreground text-xs">
													{formatDate(s.date).date}
												</span>
												<span className="block text-muted-foreground text-xs tabular-nums">
													{formatDate(s.date).time}
												</span>
											</span>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	// playing — natural-height card centered on the page
	const isFretboard = state.challenge?.type === "fretboard-mark";
	return (
		<div className="flex items-center justify-center h-full p-4">
			<div
				className={`w-full rounded-2xl border border-border shadow-lg overflow-hidden ${isFretboard ? "max-w-2xl" : "max-w-lg"}`}
			>
				<GameHeader
					score={state.score}
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
