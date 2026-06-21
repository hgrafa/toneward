import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { IdentifyNoteChallenge } from "@/core/practice";
import { playCorrect, playWrong } from "@/lib/practiceAudio";
import type { NoteName } from "@/types/music";

interface Props {
	challenge: IdentifyNoteChallenge;
	onAnswer: (ans: NoteName) => void;
}

export function ChallengeIdentifyNote({ challenge, onAnswer }: Props) {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<NoteName | null>(null);

	function pick(opt: NoteName) {
		if (selected) return;
		const isCorrect = opt === challenge.answer;
		if (isCorrect) playCorrect();
		else playWrong();
		setSelected(opt);
		setTimeout(() => {
			setSelected(null);
			onAnswer(opt);
		}, 700);
	}

	function buttonClass(opt: NoteName): string {
		const base =
			"aspect-square h-auto text-2xl font-black transition-all duration-200";
		if (!selected) return base;
		if (opt === challenge.answer)
			return `${base} !bg-green-500 !text-white !border-green-500 scale-[1.04] shadow-lg shadow-green-500/25`;
		if (opt === selected) return base;
		return `${base} opacity-40`;
	}

	function buttonVariant(opt: NoteName) {
		if (selected && opt === selected && opt !== challenge.answer)
			return "destructive" as const;
		return "outline" as const;
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="text-center space-y-3">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.whatNote", {
						interval: t(`ui.intervals.${challenge.interval}`),
						root: challenge.root,
					})}
				</p>
				<span className="block text-6xl font-black tracking-tight mt-2">
					{challenge.root}
				</span>
			</div>
			<div className="grid grid-cols-3 gap-3 w-full">
				{challenge.options.map((opt) => (
					<Button
						key={opt}
						variant={buttonVariant(opt)}
						className={buttonClass(opt)}
						onClick={() => pick(opt)}
						disabled={Boolean(selected)}
					>
						{opt}
					</Button>
				))}
			</div>
		</div>
	);
}
