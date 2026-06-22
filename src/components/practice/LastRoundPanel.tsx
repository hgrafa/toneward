import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatTime, loadScores } from "@/lib/practiceScores";

interface LastRoundPanelProps {
	score: number;
	totalTimeMs: number;
	maxStreak: number;
	endedAt: number;
	onPlayAgain: () => void;
}

export function LastRoundPanel({
	score,
	totalTimeMs,
	maxStreak,
	endedAt,
	onPlayAgain,
}: LastRoundPanelProps) {
	const { t } = useTranslation();
	const scores = loadScores();
	// A zero-score round is never saved (guarded in the hook), so findIndex returns -1 → +1 = 0 → || null (no rank badge).
	const rank = scores.findIndex((s) => s.date === endedAt) + 1 || null;

	return (
		<div className="w-full rounded-2xl border border-border bg-card shadow-lg">
			<div className="flex flex-col items-center gap-6 px-6 py-8">
				<div className="text-center space-y-3">
					<p className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
						{t("ui.practice.timeUp")}
					</p>
					{rank && rank <= 3 && (
						<p className="font-pixel text-xs text-primary">
							#{rank} {t("ui.practice.allTime")}
						</p>
					)}
					<p className="font-pixel text-6xl tabular-nums">{score}</p>
					<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
						<span className="tabular-nums">
							{t("ui.practice.finalScore")} · {formatTime(totalTimeMs)}
						</span>
						<span className="tabular-nums">
							{t("ui.practice.bestStreak")} ×{maxStreak}
						</span>
					</div>
				</div>
				<Button size="lg" onClick={onPlayAgain} className="font-pixel text-xs">
					{t("ui.practice.restart")}
				</Button>
			</div>
		</div>
	);
}
