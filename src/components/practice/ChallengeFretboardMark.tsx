import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	FretboardDiagram,
	MAIN_DIMENSIONS,
} from "@/components/FretboardDiagram";
import { Button } from "@/components/ui/button";
import type { FretboardMarkChallenge } from "@/core/practice";
import { allFretboardPositions } from "@/core/practice";
import type { FretPosition, Tuning } from "@/types/music";

interface Props {
	challenge: FretboardMarkChallenge;
	tuning: Tuning;
	markedPositions: Set<string>;
	onToggle: (pos: FretPosition) => void;
	onSubmit: () => void;
}

export function ChallengeFretboardMark({
	challenge,
	tuning,
	markedPositions,
	onToggle,
	onSubmit,
}: Props) {
	const { t } = useTranslation();

	const allPositions = useMemo(() => allFretboardPositions(tuning), [tuning]);

	return (
		<div className="flex flex-col items-center gap-4 p-4 w-full">
			<p className="text-sm font-medium text-muted-foreground text-center">
				{t("ui.practice.markInterval", {
					interval: t(`ui.intervals.${challenge.interval}`),
					root: challenge.root,
				})}
			</p>
			<div className="w-full overflow-x-auto">
				<FretboardDiagram
					positions={allPositions}
					stringCount={tuning.length}
					minFret={0}
					maxFret={12}
					dimensions={MAIN_DIMENSIONS}
					displayMode="none"
					highlightRoot
					rootPitchClass={challenge.root}
					markedPositions={markedPositions}
					onClickPosition={onToggle}
				/>
			</div>
			<Button onClick={onSubmit} className="w-32">
				{t("ui.practice.check")}
			</Button>
		</div>
	);
}
