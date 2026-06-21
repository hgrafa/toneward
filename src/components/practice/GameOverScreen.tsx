import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatTime, loadScores } from "@/lib/practiceScores";

interface GameOverScreenProps {
	score: number;
	totalTimeMs: number;
	endedAt: number;
	onRestart: () => void;
}

export function GameOverScreen({
	score,
	totalTimeMs,
	endedAt,
	onRestart,
}: GameOverScreenProps) {
	const { t } = useTranslation();
	const scores = loadScores();
	const rank = scores.findIndex((s) => s.date === endedAt) + 1 || null;

	return (
		<div className="flex flex-col items-center justify-center h-full gap-8 px-6">
			<div className="text-center space-y-3">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.timeUp")}
				</p>
				{rank && rank <= 3 && (
					<p className="text-sm font-bold text-primary">
						#{rank} {t("ui.practice.allTime")}
					</p>
				)}
				<p className="text-8xl font-black tabular-nums">{score}</p>
				<p className="text-sm text-muted-foreground">
					{t("ui.practice.finalScore")} · {formatTime(totalTimeMs)}
				</p>
			</div>
			<Button size="lg" onClick={onRestart}>
				{t("ui.practice.restart")}
			</Button>
		</div>
	);
}
