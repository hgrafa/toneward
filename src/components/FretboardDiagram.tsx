import { DOUBLE_DOT_FRETS, SINGLE_DOT_FRETS } from "@/core/fretboard";
import { formatSpelled } from "@/core/notes";
import type { DisplayMode, FretPosition, NoteName } from "@/types/music";

export interface FretboardDimensions {
	fretWidth: number;
	stringSpacing: number;
	topPadding: number;
	bottomPadding: number;
	leftPadding: number;
	nutWidth: number;
	dotRadius: number;
	markerRadius: number;
	fretNumberYOffset: number;
	openDotXOffset: number;
	fretStrokeWidth: number;
	dotFontSize: number;
	fretNumberFontSize: number;
	stringStrokeWidth: (indexFromTop: number) => number;
}

export const MAIN_DIMENSIONS: FretboardDimensions = {
	fretWidth: 80,
	stringSpacing: 30,
	topPadding: 40,
	bottomPadding: 50,
	leftPadding: 50,
	nutWidth: 6,
	dotRadius: 11,
	markerRadius: 5,
	fretNumberYOffset: 30,
	openDotXOffset: 16,
	fretStrokeWidth: 2,
	dotFontSize: 10,
	fretNumberFontSize: 11,
	stringStrokeWidth: (i) => 1 + i * 0.3,
};

export const BOX_DIMENSIONS: FretboardDimensions = {
	fretWidth: 60,
	stringSpacing: 26,
	topPadding: 32,
	bottomPadding: 40,
	leftPadding: 40,
	nutWidth: 5,
	dotRadius: 10,
	markerRadius: 4,
	fretNumberYOffset: 24,
	openDotXOffset: 14,
	fretStrokeWidth: 1.5,
	dotFontSize: 9,
	fretNumberFontSize: 10,
	stringStrokeWidth: (i) => 0.8 + i * 0.25,
};

export function computeViewBox(
	d: FretboardDimensions,
	stringCount: number,
	minFret: number,
	maxFret: number,
): { width: number; height: number } {
	const fretCount = maxFret - minFret;
	return {
		width: d.leftPadding + fretCount * d.fretWidth + 20,
		height:
			d.topPadding + (stringCount - 1) * d.stringSpacing + d.bottomPadding,
	};
}

export interface FretboardDiagramProps {
	positions: FretPosition[];
	stringCount: number;
	minFret: number;
	maxFret: number;
	dimensions: FretboardDimensions;
	displayMode: DisplayMode;
	highlightRoot: boolean;
	rootPitchClass?: NoteName;
	onHoverPosition?: (
		data: { x: number; y: number; pos: FretPosition } | null,
	) => void;
	onClickPosition?: (pos: FretPosition) => void;
	markedPositions?: Set<string>; // keys: `${string}-${fret}`
}

export function FretboardDiagram({
	positions,
	stringCount,
	minFret,
	maxFret,
	dimensions: d,
	displayMode,
	highlightRoot,
	rootPitchClass,
	onHoverPosition,
	onClickPosition,
	markedPositions,
}: FretboardDiagramProps) {
	const fretCount = maxFret - minFret;
	const showNut = minFret === 0;

	const { width: totalWidth, height: totalHeight } = computeViewBox(
		d,
		stringCount,
		minFret,
		maxFret,
	);

	function fretX(fret: number): number {
		return d.leftPadding + (fret - minFret) * d.fretWidth;
	}

	function stringY(stringNum: number): number {
		return d.topPadding + (stringNum - 1) * d.stringSpacing;
	}

	function dotX(fret: number): number {
		if (fret === 0) return d.leftPadding - d.openDotXOffset;
		return fretX(fret) - d.fretWidth / 2;
	}

	function isRoot(pos: FretPosition): boolean {
		return highlightRoot && rootPitchClass === pos.note;
	}

	function dotLabel(pos: FretPosition): string {
		if (displayMode === "none") return "";
		if (displayMode === "interval") return pos.interval ?? "";
		return formatSpelled(pos.spelled);
	}

	const markerCy = d.topPadding + ((stringCount - 1) * d.stringSpacing) / 2;

	return (
		<svg
			viewBox={`0 0 ${totalWidth} ${totalHeight}`}
			className="w-full max-w-full"
			style={{ minWidth: 400 }}
		>
			{showNut && (
				<rect
					x={d.leftPadding - d.nutWidth / 2}
					y={d.topPadding - 2}
					width={d.nutWidth}
					height={(stringCount - 1) * d.stringSpacing + 4}
					className="fill-foreground"
					rx={1}
				/>
			)}

			{Array.from({ length: fretCount + 1 }, (_, i) => {
				const fret = minFret + i;
				if (fret === 0 && showNut) return null;
				return (
					<line
						key={`fret-${fret}`}
						x1={fretX(fret)}
						y1={d.topPadding - 2}
						x2={fretX(fret)}
						y2={d.topPadding + (stringCount - 1) * d.stringSpacing + 2}
						className="stroke-muted-foreground"
						strokeOpacity={0.4}
						strokeWidth={d.fretStrokeWidth}
					/>
				);
			})}

			{Array.from({ length: stringCount }, (_, i) => {
				const stringNum = i + 1;
				const y = stringY(stringNum);
				return (
					<line
						key={`string-${stringNum}`}
						x1={d.leftPadding - (showNut ? d.nutWidth : 0)}
						y1={y}
						x2={d.leftPadding + fretCount * d.fretWidth}
						y2={y}
						className="stroke-foreground"
						strokeOpacity={0.6}
						strokeWidth={d.stringStrokeWidth(i)}
					/>
				);
			})}

			{SINGLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map(
				(fret) => (
					<circle
						key={`marker-${fret}`}
						cx={fretX(fret) - d.fretWidth / 2}
						cy={markerCy}
						r={d.markerRadius}
						className="fill-muted-foreground"
						fillOpacity={0.3}
					/>
				),
			)}
			{DOUBLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map(
				(fret) => {
					const offset =
						stringCount >= 4 ? d.stringSpacing : d.stringSpacing / 2;
					return (
						<g key={`double-marker-${fret}`}>
							<circle
								cx={fretX(fret) - d.fretWidth / 2}
								cy={markerCy - offset}
								r={d.markerRadius}
								className="fill-muted-foreground"
								fillOpacity={0.3}
							/>
							<circle
								cx={fretX(fret) - d.fretWidth / 2}
								cy={markerCy + offset}
								r={d.markerRadius}
								className="fill-muted-foreground"
								fillOpacity={0.3}
							/>
						</g>
					);
				},
			)}

			{Array.from({ length: fretCount }, (_, i) => {
				const fret = minFret + i + 1;
				return (
					<text
						key={`fretnum-${fret}`}
						x={fretX(fret) - d.fretWidth / 2}
						y={
							d.topPadding +
							(stringCount - 1) * d.stringSpacing +
							d.fretNumberYOffset
						}
						textAnchor="middle"
						className="fill-muted-foreground text-xs select-none"
						fontSize={d.fretNumberFontSize}
					>
						{fret}
					</text>
				);
			})}

			{positions.map((pos) => {
				const cx = dotX(pos.fret);
				const cy = stringY(pos.string);
				const root = isRoot(pos);
				const label = dotLabel(pos);
				const posKey = `${pos.string}-${pos.fret}`;
				const isMarked = markedPositions?.has(posKey) ?? false;
				const isGhost = markedPositions !== undefined && !root && !isMarked;
				const interactive =
					Boolean(onHoverPosition) || Boolean(onClickPosition);

				return (
					<g
						key={`dot-${pos.string}-${pos.fret}`}
						className={interactive ? "cursor-pointer" : undefined}
						onMouseEnter={
							onHoverPosition
								? () => onHoverPosition({ x: cx, y: cy, pos })
								: undefined
						}
						onMouseLeave={
							onHoverPosition ? () => onHoverPosition(null) : undefined
						}
						onClick={onClickPosition ? () => onClickPosition(pos) : undefined}
					>
						<circle
							cx={cx}
							cy={cy}
							r={d.dotRadius}
							className={
								root
									? "fill-brand stroke-brand/40"
									: isMarked
										? "fill-primary stroke-primary/50"
										: isGhost
											? "fill-muted-foreground/25 stroke-transparent"
											: "fill-foreground stroke-background"
							}
							strokeWidth={root ? 2 : 1}
						/>
						{label && !isGhost && (
							<text
								x={cx}
								y={cy}
								dy="0.35em"
								textAnchor="middle"
								fontSize={d.dotFontSize}
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
