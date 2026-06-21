import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { IdentifyIntervalChallenge } from "@/core/practice";
import type { IntervalName } from "@/types/music";

interface Props {
	challenge: IdentifyIntervalChallenge;
	onAnswer: (ans: IntervalName) => void;
}

export function ChallengeIdentifyInterval({ challenge, onAnswer }: Props) {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<IntervalName | null>(null);

	function pick(opt: IntervalName) {
		if (selected) return;
		setSelected(opt);
		setTimeout(() => {
			setSelected(null);
			onAnswer(opt);
		}, 700);
	}

	function buttonVariant(opt: IntervalName) {
		if (!selected) return "outline" as const;
		if (opt === challenge.answer) return "default" as const;
		if (opt === selected) return "destructive" as const;
		return "outline" as const;
	}

	return (
		<div className="flex flex-col items-center gap-10 p-8 max-w-sm mx-auto w-full">
			<div className="text-center space-y-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.whatInterval")}
				</p>
				<div className="flex items-center justify-center gap-5 mt-4">
					<span className="text-6xl font-black tracking-tight">
						{challenge.root}
					</span>
					<span className="text-3xl text-muted-foreground">→</span>
					<span className="text-6xl font-black tracking-tight">
						{challenge.target}
					</span>
				</div>
			</div>
			<div className="flex flex-col md:flex-row gap-3 w-full">
				{challenge.options.map((opt) => (
					<Button
						key={opt}
						variant={buttonVariant(opt)}
						className="h-14 text-base w-full"
						onClick={() => pick(opt)}
						disabled={Boolean(selected)}
					>
						{t(`ui.intervals.${opt}`)}
					</Button>
				))}
			</div>
		</div>
	);
}
