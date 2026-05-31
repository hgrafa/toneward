import { DOUBLE_DOT_FRETS, SINGLE_DOT_FRETS } from "@/core/fretboard";
import { useFretboard } from "@/hooks/useFretboardContext";
import type { BoxPattern, FretPosition } from "@/types/music";

const FRET_WIDTH = 60;
const STRING_SPACING = 26;
const TOP_PADDING = 32;
const BOTTOM_PADDING = 40;
const LEFT_PADDING = 40;
const NUT_WIDTH = 5;
const DOT_RADIUS = 10;
const MARKER_RADIUS = 4;
const FRET_NUMBER_Y_OFFSET = 24;
const MIN_DISPLAY_FRETS = 7;

function BoxFretboard({
	pattern,
	displayMode,
	highlightRoot,
	root,
	stringCount,
}: {
	pattern: BoxPattern;
	displayMode: string;
	highlightRoot: boolean;
	root?: string;
	stringCount: number;
}) {
	const STRING_COUNT = stringCount;
	const { minFret, maxFret, positions } = pattern;

	// Show extra frets for context, ensuring a minimum display width
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
	const fretCount = displayMaxFret - displayMinFret;
	const showNut = displayMinFret === 0;

	const totalWidth = LEFT_PADDING + fretCount * FRET_WIDTH + 20;
	const totalHeight =
		TOP_PADDING + (STRING_COUNT - 1) * STRING_SPACING + BOTTOM_PADDING;

	function fretX(fret: number): number {
		return LEFT_PADDING + (fret - displayMinFret) * FRET_WIDTH;
	}

	function stringY(stringNum: number): number {
		return TOP_PADDING + (stringNum - 1) * STRING_SPACING;
	}

	function dotX(fret: number): number {
		if (fret === 0) return LEFT_PADDING - 14;
		return fretX(fret) - FRET_WIDTH / 2;
	}

	function isRoot(pos: FretPosition): boolean {
		return highlightRoot && root === pos.note;
	}

	function dotLabel(pos: FretPosition): string {
		if (displayMode === "none") return "";
		if (displayMode === "interval") return pos.interval ?? "";
		return pos.note;
	}

	return (
		<svg
			viewBox={`0 0 ${totalWidth} ${totalHeight}`}
			className="w-full max-w-full"
			style={{ minWidth: 400 }}
		>
			{/* Nut */}
			{showNut && (
				<rect
					x={LEFT_PADDING - NUT_WIDTH / 2}
					y={TOP_PADDING - 2}
					width={NUT_WIDTH}
					height={(STRING_COUNT - 1) * STRING_SPACING + 4}
					className="fill-foreground"
					rx={1}
				/>
			)}

			{/* Fret lines */}
			{Array.from({ length: fretCount + 1 }, (_, i) => {
				const fret = displayMinFret + i;
				if (fret === 0 && showNut) return null;
				return (
					<line
						key={`fret-${fret}`}
						x1={fretX(fret)}
						y1={TOP_PADDING - 2}
						x2={fretX(fret)}
						y2={TOP_PADDING + (STRING_COUNT - 1) * STRING_SPACING + 2}
						className="stroke-muted-foreground"
						strokeOpacity={0.4}
						strokeWidth={1.5}
					/>
				);
			})}

			{/* Strings */}
			{Array.from({ length: STRING_COUNT }, (_, i) => {
				const stringNum = i + 1;
				const y = stringY(stringNum);
				const strokeWidth = 0.8 + i * 0.25;
				return (
					<line
						key={`string-${stringNum}`}
						x1={LEFT_PADDING - (showNut ? NUT_WIDTH : 0)}
						y1={y}
						x2={LEFT_PADDING + fretCount * FRET_WIDTH}
						y2={y}
						className="stroke-foreground"
						strokeOpacity={0.6}
						strokeWidth={strokeWidth}
					/>
				);
			})}

			{/* Fret markers */}
			{SINGLE_DOT_FRETS.filter(
				(f) => f > displayMinFret && f <= displayMaxFret,
			).map((fret) => (
				<circle
					key={`marker-${fret}`}
					cx={fretX(fret) - FRET_WIDTH / 2}
					cy={TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2}
					r={MARKER_RADIUS}
					className="fill-muted-foreground"
					fillOpacity={0.3}
				/>
			))}
			{DOUBLE_DOT_FRETS.filter(
				(f) => f > displayMinFret && f <= displayMaxFret,
			).map((fret) => {
				const mid = TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2;
				const offset = STRING_COUNT >= 4 ? STRING_SPACING : STRING_SPACING / 2;
				return (
					<g key={`double-marker-${fret}`}>
						<circle
							cx={fretX(fret) - FRET_WIDTH / 2}
							cy={mid - offset}
							r={MARKER_RADIUS}
							className="fill-muted-foreground"
							fillOpacity={0.3}
						/>
						<circle
							cx={fretX(fret) - FRET_WIDTH / 2}
							cy={mid + offset}
							r={MARKER_RADIUS}
							className="fill-muted-foreground"
							fillOpacity={0.3}
						/>
					</g>
				);
			})}

			{/* Fret numbers */}
			{Array.from({ length: fretCount }, (_, i) => {
				const fret = displayMinFret + i + 1;
				return (
					<text
						key={`fretnum-${fret}`}
						x={fretX(fret) - FRET_WIDTH / 2}
						y={
							TOP_PADDING +
							(STRING_COUNT - 1) * STRING_SPACING +
							FRET_NUMBER_Y_OFFSET
						}
						textAnchor="middle"
						className="fill-muted-foreground text-xs select-none"
						fontSize={10}
					>
						{fret}
					</text>
				);
			})}

			{/* Note dots */}
			{positions.map((pos) => {
				const cx = dotX(pos.fret);
				const cy = stringY(pos.string);
				const root = isRoot(pos);
				const label = dotLabel(pos);

				return (
					<g key={`dot-${pos.string}-${pos.fret}`}>
						<circle
							cx={cx}
							cy={cy}
							r={DOT_RADIUS}
							className={
								root
									? "fill-rose-500 stroke-rose-300"
									: "fill-foreground stroke-background"
							}
							strokeWidth={root ? 2 : 1}
						/>
						{label && (
							<text
								x={cx}
								y={cy}
								dy="0.35em"
								textAnchor="middle"
								fontSize={9}
								fontWeight={root ? 700 : 500}
								className={
									root
										? "fill-white select-none"
										: "fill-background select-none"
								}
							>
								{label}
							</text>
						)}
					</g>
				);
			})}
		</svg>
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
							displayMode={displayMode}
							highlightRoot={highlightRoot}
							root={noteSet.root}
							stringCount={tuning.length}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
