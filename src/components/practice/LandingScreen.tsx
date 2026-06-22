import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { LastResult } from "@/hooks/usePracticeGame";
import { formatDate, formatTime, loadScores } from "@/lib/practiceScores";
import { LastRoundPanel } from "./LastRoundPanel";

interface LandingScreenProps {
	lastResult: LastResult | null;
	onStart: () => void;
}

export function LandingScreen({ lastResult, onStart }: LandingScreenProps) {
	const { t } = useTranslation();
	const scores = loadScores();
	const rankStyle = [
		{ iconColor: "text-yellow-400", textColor: "text-yellow-500" },
		{ iconColor: "text-slate-400", textColor: "text-slate-400" },
		{ iconColor: "text-amber-600", textColor: "text-amber-600" },
	];

	return (
		<div className="flex items-center justify-center h-full p-4 overflow-y-auto">
			<div className="flex flex-col items-center gap-8 text-center py-8 w-full max-w-sm md:max-w-2xl">
				{lastResult ? (
					<LastRoundPanel
						score={lastResult.score}
						totalTimeMs={lastResult.totalTimeMs}
						maxStreak={lastResult.maxStreak}
						endedAt={lastResult.endedAt}
						onPlayAgain={onStart}
					/>
				) : (
					<>
						<div className="space-y-3">
							<h1 className="font-pixel text-2xl leading-relaxed">
								{t("ui.practice.title")}
							</h1>
							<p className="text-sm text-muted-foreground">
								{t("ui.practice.description")}
							</p>
						</div>
						<Button
							size="lg"
							onClick={onStart}
							className="font-pixel text-xs px-10"
						>
							{t("ui.practice.start")}
						</Button>
					</>
				)}
				{scores.length > 0 && (
					<div className="w-full space-y-2">
						<p className="font-pixel text-[10px] uppercase tracking-wider text-muted-foreground text-center">
							{t("ui.practice.bestScores")}
						</p>
						<div className="rounded-lg border border-border overflow-hidden">
							<table className="w-full text-sm border-collapse">
								<thead>
									<tr className="bg-muted/60 border-b border-border font-pixel text-[9px] uppercase text-muted-foreground">
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
										const isLast = lastResult?.endedAt === s.date;
										return (
											<tr
												key={`${s.date}-${i}`}
												className={`border-b border-border last:border-0 ${isLast ? "bg-primary/10" : "bg-card"}`}
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
															className={`font-pixel text-[10px] ${style ? style.textColor : "text-muted-foreground"}`}
														>
															#{i + 1}
														</span>
													</span>
												</td>
												<td className="px-4 md:px-6 py-3 text-center">
													<span className="font-pixel text-base tabular-nums">
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
