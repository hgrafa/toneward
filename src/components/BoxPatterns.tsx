import {
	BOX_DIMENSIONS,
	FretboardDiagram,
} from "@/components/FretboardDiagram";
import { useFretboard } from "@/hooks/useFretboardContext";
import type { BoxPattern } from "@/types/music";

const MIN_DISPLAY_FRETS = 7;

function BoxFretboard({
	pattern,
	stringCount,
	displayMode,
	highlightRoot,
	rootPitchClass,
}: {
	pattern: BoxPattern;
	stringCount: number;
	displayMode: "note" | "interval" | "none";
	highlightRoot: boolean;
	rootPitchClass?: string;
}) {
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

	return (
		<FretboardDiagram
			positions={positions}
			stringCount={stringCount}
			minFret={displayMinFret}
			maxFret={displayMaxFret}
			dimensions={BOX_DIMENSIONS}
			displayMode={displayMode}
			highlightRoot={highlightRoot}
			rootPitchClass={rootPitchClass as never}
		/>
	);
}

export function BoxPatterns() {
	const { boxPatterns, displayMode, highlightRoot, noteSet, tuning } =
		useFretboard();

	if (!noteSet || boxPatterns.length === 0) return null;

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-medium text-muted-foreground">
				Box Patterns
			</h2>
			<div className="space-y-3">
				{boxPatterns.map((pattern) => (
					<div
						key={pattern.index}
						className="overflow-x-auto rounded-lg border border-border bg-card p-4"
					>
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							Pattern {pattern.index + 1}
						</p>
						<BoxFretboard
							pattern={pattern}
							stringCount={tuning.length}
							displayMode={displayMode}
							highlightRoot={highlightRoot}
							rootPitchClass={noteSet.root}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
