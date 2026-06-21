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
		const prev = state.lastResult;
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
					{prev !== null && (
						<div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-border bg-muted/40 text-sm">
							<span className="text-muted-foreground font-medium">
								{t("ui.practice.lastMatch")}
							</span>
							<span className="font-black text-foreground tabular-nums">
								{t("ui.practice.lastMatchScore", {
									score: prev.score,
									time: formatTime(prev.totalTimeMs),
								})}
							</span>
							<span className="text-muted-foreground text-xs">
								{formatDate(prev.endedAt).date} {formatDate(prev.endedAt).time}
							</span>
						</div>
					)}
					{scores.length > 0 && (
						<div className="w-full space-y-2">
							<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
								{t("ui.practice.bestScores")}
							</p>
							<div className="rounded-lg border border-border overflow-hidden">
								<table className="w-full text-sm border-collapse">
									<thead>
										<tr className="bg-muted/60 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											<th className="text-left px-4 md:px-6 py-2.5 whitespace-nowrap">
												{t("ui.practice.colRank")}
											</th>
											<th className="text-center px-4 md:px-6 py-2.5 w-full">
												{t("ui.practice.score")}
											</th>
											<th className="text-right px-4 md:px-6 py-2.5 whitespace-nowrap">
												{t("ui.practice.colTime")}
											</th>
											<th className="text-right px-4 md:px-6 py-2.5 whitespace-nowrap">
												{t("ui.practice.colDate")}
											</th>
										</tr>
									</thead>
									<tbody>
										{scores.slice(0, 5).map((s, i) => {
											const style = rankStyle[i];
											const { date, time } = formatDate(s.date);
											return (
												<tr
													key={`${s.date}-${i}`}
													className="bg-card border-b border-border last:border-0"
												>
													<td className="px-4 md:px-6 py-3 whitespace-nowrap">
														<span className="flex items-center gap-1.5">
															{style && (
																<Trophy
																	size={13}
																	className={style.iconColor}
																	strokeWidth={2.5}
																/>
															)}
															<span
																className={`font-bold text-sm ${style ? style.textColor : "text-muted-foreground"}`}
															>
																#{i + 1}
															</span>
														</span>
													</td>
													<td className="px-4 md:px-6 py-3 text-center">
														<span className="font-black text-xl tabular-nums">
															{s.score}
														</span>
													</td>
													<td className="px-4 md:px-6 py-3 text-right text-muted-foreground tabular-nums whitespace-nowrap">
														{formatTime(s.totalTimeMs)}
													</td>
													<td className="px-4 md:px-6 py-3 text-right text-muted-foreground whitespace-nowrap">
														{date} · {time}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
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
