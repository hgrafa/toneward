import { Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PixelHeart } from "./PixelHeart";

interface GameHeaderProps {
	score: number;
	streak: number;
	lives: number;
	timerMs: number;
	timerStartedAt: number;
	muted: boolean;
	onToggleMute: () => void;
	onExit: () => void;
}

export function GameHeader({
	score,
	streak,
	lives,
	timerMs,
	timerStartedAt,
	muted,
	onToggleMute,
	onExit,
}: GameHeaderProps) {
	const { t } = useTranslation();

	// Pop the score whenever it changes.
	const [scoreKey, setScoreKey] = useState(0);
	const prevScore = useRef(score);
	useEffect(() => {
		if (score !== prevScore.current) {
			prevScore.current = score;
			setScoreKey((k) => k + 1);
		}
	}, [score]);

	// Flash the combo badge at every multiple of 5.
	const [comboKey, setComboKey] = useState(0);
	const prevStreak = useRef(streak);
	useEffect(() => {
		if (streak > prevStreak.current && streak % 5 === 0) {
			setComboKey((k) => k + 1);
		}
		prevStreak.current = streak;
	}, [streak]);

	// Mark the heart that was just emptied so it can animate.
	const [lostIdx, setLostIdx] = useState<number | null>(null);
	const prevLives = useRef(lives);
	useEffect(() => {
		if (lives < prevLives.current) {
			setLostIdx(lives);
			const id = setTimeout(() => setLostIdx(null), 400);
			prevLives.current = lives;
			return () => clearTimeout(id);
		}
		prevLives.current = lives;
	}, [lives]);

	return (
		<div className="flex flex-col gap-3 px-8 py-5 border-b border-border bg-card">
			<div className="grid grid-cols-3 items-center">
				{/* Left: lives */}
				<div className="flex gap-2 items-center justify-self-start">
					{[0, 1, 2].map((i) => (
						<PixelHeart
							key={i}
							filled={i < lives}
							pixelSize={5}
							losing={lostIdx === i}
						/>
					))}
				</div>
				{/* Middle: score (streak sequence pinned to its right) */}
				<div className="justify-self-center relative">
					<div className="flex flex-col items-center justify-center gap-0.5 rounded-md border-2 border-border bg-muted/40 px-5 py-1.5">
						<span className="font-pixel text-[9px] uppercase text-muted-foreground">
							{t("ui.practice.score")}
						</span>
						<span
							key={scoreKey}
							className="font-pixel text-3xl leading-none tabular-nums anim-score-pop inline-block"
						>
							{score}
						</span>
					</div>
					{streak >= 2 && (
						<span
							key={comboKey}
							className="absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap font-pixel text-sm text-amber-500 anim-combo-flash"
							title={t("ui.practice.streak")}
						>
							×{streak}
						</span>
					)}
				</div>
				{/* Right: sound + close */}
				<div className="flex items-center gap-1 justify-self-end">
					<button
						type="button"
						onClick={onToggleMute}
						title={t(muted ? "ui.practice.unmute" : "ui.practice.mute")}
						className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
					>
						{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
					</button>
					<button
						type="button"
						onClick={onExit}
						title={t("ui.practice.quit")}
						className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
					>
						<X size={18} />
					</button>
				</div>
			</div>
			<div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
				<div
					key={timerStartedAt}
					className="h-full rounded-full timer-bar"
					style={{ animation: `timerShrink ${timerMs}ms linear forwards` }}
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
