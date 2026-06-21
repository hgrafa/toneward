import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { IdentifyNoteChallenge } from "@/core/practice";
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
		setSelected(opt);
		setTimeout(() => {
			setSelected(null);
			onAnswer(opt);
		}, 700);
	}

	function buttonVariant(opt: NoteName) {
		if (!selected) return "outline" as const;
		if (opt === challenge.answer) return "default" as const;
		if (opt === selected) return "destructive" as const;
		return "outline" as const;
	}

	return (
		<div className="flex flex-col items-center gap-10 p-8 max-w-sm mx-auto w-full">
			<div className="text-center space-y-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					{t("ui.practice.whatNote", {
						interval: t(`ui.intervals.${challenge.interval}`),
						root: challenge.root,
					})}
				</p>
				<span className="block text-7xl font-black tracking-tight mt-4">
					{challenge.root}
				</span>
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
						{opt}
					</Button>
				))}
			</div>
		</div>
	);
}
