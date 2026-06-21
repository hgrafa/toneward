import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface GameOverScreenProps {
	score: number;
	onRestart: () => void;
}

export function GameOverScreen({ score, onRestart }: GameOverScreenProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-center justify-center h-full gap-8 px-6">
			<div className="text-center space-y-3">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.timeUp")}
				</p>
				<p className="text-8xl font-black tabular-nums">{score}</p>
				<p className="text-sm text-muted-foreground">
					{t("ui.practice.finalScore")}
				</p>
			</div>
			<Button size="lg" onClick={onRestart}>
				{t("ui.practice.restart")}
			</Button>
		</div>
	);
}
