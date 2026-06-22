import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { IdentifyNoteChallenge } from "@/core/practice";
import { playCorrect, playWrong } from "@/lib/practiceAudio";
import type { NoteName } from "@/types/music";
import { PixelBurst } from "./PixelBurst";

interface Props {
	challenge: IdentifyNoteChallenge;
	onAnswer: (ans: NoteName) => void;
}

export function ChallengeIdentifyNote({ challenge, onAnswer }: Props) {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<NoteName | null>(null);
	const [showBurst, setShowBurst] = useState(false);

	function pick(opt: NoteName) {
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

	function buttonClass(opt: NoteName): string {
		const base =
			"pixel-btn w-full min-h-24 h-auto px-3 py-4 text-2xl font-black transition-all duration-200";
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

	function buttonVariant(opt: NoteName) {
		if (selected && opt === selected && opt !== challenge.answer)
			return "destructive" as const;
		return "outline" as const;
	}

	return (
		<div className="flex flex-col items-center gap-10">
			<div
				className="text-center space-y-4 anim-prompt-in"
				key={`${challenge.root}-${challenge.interval}`}
			>
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.whatNote")}
				</p>
				<div className="flex items-center justify-center gap-4">
					<span className="text-6xl font-black tracking-tight">
						{challenge.root}
					</span>
					<div className="flex flex-col items-center gap-1">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
							{t(`ui.intervals.${challenge.interval}`)}
						</span>
						<span className="text-2xl leading-none text-muted-foreground">
							→
						</span>
					</div>
					<span className="text-6xl font-black tracking-tight text-muted-foreground">
						?
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
							{opt}
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
