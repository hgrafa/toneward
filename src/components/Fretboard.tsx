import { useState } from "react";
import { DOUBLE_DOT_FRETS, SINGLE_DOT_FRETS } from "@/core/fretboard";
import { useFretboard } from "@/hooks/useFretboardContext";
import type { FretPosition } from "@/types/music";

const FRET_WIDTH = 80;
const STRING_SPACING = 30;
const TOP_PADDING = 40;
const BOTTOM_PADDING = 50;
const LEFT_PADDING = 50;
const NUT_WIDTH = 6;
const DOT_RADIUS = 11;
const MARKER_RADIUS = 5;
const FRET_NUMBER_Y_OFFSET = 30;

interface TooltipData {
	x: number;
	y: number;
	note: string;
	interval?: string;
}

export function Fretboard() {
	const { positions, displayMode, highlightRoot, fretRange, noteSet, tuning } =
		useFretboard();
	const STRING_COUNT = tuning.length;
	const [tooltip, setTooltip] = useState<TooltipData | null>(null);

	const [minFret, maxFret] = fretRange;
	const fretCount = maxFret - minFret;
	const showNut = minFret === 0;

	const totalWidth = LEFT_PADDING + fretCount * FRET_WIDTH + 20;
	const totalHeight =
		TOP_PADDING + (STRING_COUNT - 1) * STRING_SPACING + BOTTOM_PADDING;

	function fretX(fret: number): number {
		const relativeFret = fret - minFret;
		return LEFT_PADDING + relativeFret * FRET_WIDTH;
	}

	function stringY(stringNum: number): number {
		// stringNum: 1=high E (top), 6=low E (bottom)
		return TOP_PADDING + (stringNum - 1) * STRING_SPACING;
	}

	function dotX(fret: number): number {
		if (fret === 0) return LEFT_PADDING - 16;
		return fretX(fret) - FRET_WIDTH / 2;
	}

	function isRoot(pos: FretPosition): boolean {
		return highlightRoot && noteSet?.root === pos.note;
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
				const fret = minFret + i;
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
						strokeWidth={2}
					/>
				);
			})}

			{/* Strings */}
			{Array.from({ length: STRING_COUNT }, (_, i) => {
				const stringNum = i + 1; // 1=high E (top), 6=low E (bottom)
				const y = stringY(stringNum);
				// Thicker strings for lower notes (higher stringNum = lower pitch)
				const strokeWidth = 1 + i * 0.3;
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
			{SINGLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map(
				(fret) => (
					<circle
						key={`marker-${fret}`}
						cx={fretX(fret) - FRET_WIDTH / 2}
						cy={TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2}
						r={MARKER_RADIUS}
						className="fill-muted-foreground"
						fillOpacity={0.3}
					/>
				),
			)}
			{DOUBLE_DOT_FRETS.filter((f) => f > minFret && f <= maxFret).map(
				(fret) => {
					const mid = TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2;
					const offset =
						STRING_COUNT >= 4 ? STRING_SPACING : STRING_SPACING / 2;
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
				},
			)}

			{/* Fret numbers */}
			{Array.from({ length: fretCount }, (_, i) => {
				const fret = minFret + i + 1;
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
						fontSize={11}
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
					<g
						key={`dot-${pos.string}-${pos.fret}`}
						onMouseEnter={() =>
							setTooltip({
								x: cx,
								y: cy,
								note: pos.note,
								interval: pos.interval,
							})
						}
						onMouseLeave={() => setTooltip(null)}
						className="cursor-pointer"
					>
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
								fontSize={10}
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

			{/* Tooltip */}
			{tooltip && (
				<g>
					<rect
						x={tooltip.x - 35}
						y={tooltip.y - DOT_RADIUS - 30}
						width={70}
						height={22}
						rx={4}
						className="fill-popover stroke-border"
						strokeWidth={1}
					/>
					<text
						x={tooltip.x}
						y={tooltip.y - DOT_RADIUS - 15}
						textAnchor="middle"
						fontSize={11}
						className="fill-popover-foreground select-none"
					>
						{tooltip.note}
						{tooltip.interval ? ` (${tooltip.interval})` : ""}
					</text>
				</g>
			)}
		</svg>
	);
}
