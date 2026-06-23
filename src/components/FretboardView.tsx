import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { BoxPatterns } from "@/components/BoxPatterns";
import { Editor } from "@/components/Editor";
import { Fretboard } from "@/components/Fretboard";
import { Toolbar } from "@/components/Toolbar";
import { TuningControls } from "@/components/TuningControls";

export function FretboardView() {
	const { t } = useTranslation();
	const fretboardRef = useRef<HTMLDivElement>(null);

	return (
		<div className="mx-auto max-w-[1180px] space-y-[18px] px-10 py-8 pl-24">
			<h1 className="font-bold font-display text-[30px] tracking-[-0.025em]">
				{t("ui.sidebar.fretboard")}
			</h1>

			<div className="grid gap-4 md:grid-cols-2">
				<Editor />
				<TuningControls />
			</div>

			<Toolbar fretboardRef={fretboardRef} />

			<div
				ref={fretboardRef}
				className="overflow-x-auto rounded-[18px] border border-border bg-card px-5 py-[22px]"
			>
				<Fretboard />
			</div>

			<BoxPatterns />
		</div>
	);
}
