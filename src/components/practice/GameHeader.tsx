import { useTranslation } from "react-i18next";
import { PixelHeart } from "./PixelHeart";

interface GameHeaderProps {
	score: number;
	lives: number;
	timerMs: number;
	timerStartedAt: number;
}

export function GameHeader({
	score,
	lives,
	timerMs,
	timerStartedAt,
}: GameHeaderProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-3 px-6 py-4 border-b border-border bg-card">
			<div className="flex items-center justify-between">
				<div className="flex gap-2 items-center">
					{[0, 1, 2].map((i) => (
						<PixelHeart key={i} filled={i < lives} pixelSize={5} />
					))}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						{t("ui.practice.score")}
					</span>
					<span className="text-2xl font-black tabular-nums">{score}</span>
				</div>
			</div>
			<div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
				<div
					key={timerStartedAt}
					className="h-full rounded-full timer-bar"
					style={{
						animation: `timerShrink ${timerMs}ms linear forwards`,
					}}
				/>
			</div>
			<style>{`
				@keyframes timerShrink {
					0%   { width: 100%; background-color: oklch(0.6 0.17 145); }
					50%  { width: 50%;  background-color: oklch(0.72 0.18 75); }
					80%  { width: 20%;  background-color: oklch(0.65 0.22 30); }
					100% { width: 0%;   background-color: oklch(0.55 0.24 20); }
				}
				.timer-bar { background-color: oklch(0.6 0.17 145); }
			`}</style>
		</div>
	);
}
