import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { IdentifyIntervalChallenge } from "@/core/practice";
import { playCorrect, playWrong } from "@/lib/practiceAudio";
import type { IntervalName } from "@/types/music";
import { PixelBurst } from "./PixelBurst";

interface Props {
	challenge: IdentifyIntervalChallenge;
	onAnswer: (ans: IntervalName) => void;
}

export function ChallengeIdentifyInterval({ challenge, onAnswer }: Props) {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<IntervalName | null>(null);
	const [showBurst, setShowBurst] = useState(false);

	function pick(opt: IntervalName) {
		if (selected) return;
		const isCorrect = opt === challenge.answer;
		if (isCorrect) {
			playCorrect();
			setShowBurst(true);
		} else {
			playWrong();
		}
		setSelected(opt);
		setTimeout(() => {
			setSelected(null);
			setShowBurst(false);
			onAnswer(opt);
		}, 700);
	}

	function buttonClass(opt: IntervalName): string {
		const base =
			"pixel-btn w-full min-h-24 h-auto px-3 py-4 text-base font-semibold leading-tight text-center whitespace-normal transition-all duration-200";
		if (!selected) return base;
		if (opt === challenge.answer) {
			// Picked right → blink green/white; picked wrong → steady green reveal.
			if (selected === challenge.answer)
				return `${base} anim-correct-blink !text-green-900 !border-green-500 scale-[1.04] shadow-lg shadow-green-500/25`;
			return `${base} !bg-green-500 !text-white !border-green-500 scale-[1.04] shadow-lg shadow-green-500/25`;
		}
		if (opt === selected) return base;
		return `${base} opacity-40`;
	}

	function buttonVariant(opt: IntervalName) {
		if (selected && opt === selected && opt !== challenge.answer)
			return "destructive" as const;
		return "outline" as const;
	}

	return (
		<div className="flex flex-col items-center gap-10">
			<div
				className="text-center space-y-4 anim-prompt-in"
				key={`${challenge.root}-${challenge.target}`}
			>
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.whatInterval")}
				</p>
				<div className="flex items-center justify-center gap-4">
					<span className="text-5xl font-black tracking-tight">
						{challenge.root}
					</span>
					<span className="text-2xl text-muted-foreground">→</span>
					<span className="text-5xl font-black tracking-tight">
						{challenge.target}
					</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-4 w-full">
				{challenge.options.map((opt) => (
					<div key={opt} className="relative">
						{showBurst && opt === challenge.answer && <PixelBurst />}
						<Button
							variant={buttonVariant(opt)}
							className={buttonClass(opt)}
							onClick={() => pick(opt)}
							disabled={Boolean(selected)}
						>
							{t(`ui.intervals.${opt}`)}
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
