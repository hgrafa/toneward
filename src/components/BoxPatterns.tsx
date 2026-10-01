import { useTranslation } from "react-i18next";
import { BoxFretboard } from "@/components/BoxFretboard";
import { BoxPatternDialog } from "@/components/BoxPatternDialog";
import { BoxPlayControls } from "@/components/BoxPlayControls";
import { spelledToPitchClass } from "@/core/notes";
import { useNotePlayback } from "@/hooks/NotePlaybackContext";
import {
	useDerived,
	useDisplay,
	useInput,
	useInstrument,
} from "@/hooks/useFretboardContext";

export function BoxPatterns() {
	const { t } = useTranslation();
	const { boxPatterns } = useDerived();
	const { displayMode, highlightRoot } = useDisplay();
	const { noteSet } = useInput();
	const { tuning } = useInstrument();
	const { playing, activePitch } = useNotePlayback();

	if (!noteSet || boxPatterns.length === 0) return null;

	const rootPitchClass = noteSet.root
		? spelledToPitchClass(noteSet.root)
		: undefined;

	return (
		<div className="space-y-3.5">
			<h2 className="font-display font-semibold text-lg tracking-[-0.02em]">
				{t("ui.boxPatterns.heading")}
			</h2>
			<div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))]">
				{boxPatterns.map((pattern) => (
					<div
						key={pattern.index}
						className="overflow-hidden rounded-xl border border-border bg-card"
					>
						<div className="flex items-center justify-between px-4 pb-2 pt-3">
							<p className="font-display font-semibold text-sm tracking-[-0.02em]">
								{t("ui.boxPatterns.pattern", { n: pattern.index + 1 })}
							</p>
							<BoxPatternDialog
								pattern={pattern}
								stringCount={tuning.length}
								displayMode={displayMode}
								highlightRoot={highlightRoot}
								rootPitchClass={rootPitchClass}
								tuning={tuning}
								activePitch={
									playing?.id === `box-${pattern.index}` ? activePitch : null
								}
							/>
						</div>
						<div className="mx-3 overflow-x-auto rounded-lg bg-muted/45 px-1 py-2">
							<BoxFretboard
								pattern={pattern}
								stringCount={tuning.length}
								displayMode={displayMode}
								highlightRoot={highlightRoot}
								rootPitchClass={rootPitchClass}
								tuning={tuning}
								activePitch={
									playing?.id === `box-${pattern.index}` ? activePitch : null
								}
							/>
						</div>
						<div className="mt-3 border-t border-border px-3 py-2.5">
							<BoxPlayControls
								id={`box-${pattern.index}`}
								pattern={pattern}
								tuning={tuning}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
