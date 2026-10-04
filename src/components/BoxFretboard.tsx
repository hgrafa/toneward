import { useTranslation } from "react-i18next";
import {
	BOX_DIMENSIONS,
	FretboardDiagram,
	type FretboardDimensions,
} from "@/components/FretboardDiagram";
import { formatSpelled } from "@/core/notes";
import type { Pitch } from "@/core/pitch";
import { positionKeysForPitch } from "@/core/playback";
import { useNoteAudition } from "@/hooks/useNoteAudition";
import type { BoxPattern, DisplayMode, NoteName, Tuning } from "@/types/music";

const MIN_DISPLAY_FRETS = 7;

// Renders a single box pattern on the shared fretboard primitive, padding the
// pattern's fret span out to a readable window. The `dimensions` preset lets the
// same pattern render compact in a card or larger in the expand modal.
export function BoxFretboard({
	pattern,
	stringCount,
	displayMode,
	highlightRoot,
	rootPitchClass,
	tuning,
	activePitch,
	dimensions = BOX_DIMENSIONS,
}: {
	pattern: BoxPattern;
	stringCount: number;
	displayMode: DisplayMode;
	highlightRoot: boolean;
	rootPitchClass?: NoteName;
	tuning: Tuning;
	activePitch?: Pitch | null;
	dimensions?: FretboardDimensions;
}) {
	const { t } = useTranslation();
	const { audition, activePitch: auditionPitch } = useNoteAudition(
		`box-${pattern.index}`,
		tuning,
	);
	const { minFret, maxFret, positions } = pattern;

	const patternSpan = maxFret - minFret;
	const extraFrets = Math.max(
		2,
		Math.ceil((MIN_DISPLAY_FRETS - patternSpan) / 2),
	);
	const displayMinFret = Math.max(0, minFret - extraFrets);
	const displayMaxFret = Math.max(
		displayMinFret + MIN_DISPLAY_FRETS,
		maxFret + extraFrets,
	);
	const soundingPitch = auditionPitch ?? activePitch;
	const activePositions = soundingPitch
		? positionKeysForPitch(positions, tuning, soundingPitch)
		: undefined;

	return (
		<FretboardDiagram
			positions={positions}
			stringCount={stringCount}
			minFret={displayMinFret}
			maxFret={displayMaxFret}
			dimensions={dimensions}
			displayMode={displayMode}
			highlightRoot={highlightRoot}
			rootPitchClass={rootPitchClass}
			activePositions={activePositions}
			onClickPosition={audition}
			positionAriaLabel={(pos) =>
				t("ui.fretboard.playNote", {
					note: formatSpelled(pos.spelled),
					string: pos.string,
					fret: pos.fret,
				})
			}
		/>
	);
}
