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
		<div className="mx-auto max-w-5xl space-y-6 p-6">
			<h1 className="font-bold text-2xl tracking-tight">{t("ui.appName")}</h1>

			<Editor />

			<TuningControls />

			<Toolbar fretboardRef={fretboardRef} />

			<div
				ref={fretboardRef}
				className="overflow-x-auto rounded-lg border border-border bg-card p-4"
			>
				<Fretboard />
			</div>

			<BoxPatterns />
		</div>
	);
}
