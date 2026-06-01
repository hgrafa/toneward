import { useState } from "react";
import {
	computeViewBox,
	FretboardDiagram,
	MAIN_DIMENSIONS,
} from "@/components/FretboardDiagram";
import { useFretboard } from "@/hooks/useFretboardContext";

interface TooltipData {
	x: number;
	y: number;
	note: string;
	interval?: string;
}

export function Fretboard() {
	const { positions, displayMode, highlightRoot, fretRange, noteSet, tuning } =
		useFretboard();
	const [tooltip, setTooltip] = useState<TooltipData | null>(null);

	const [minFret, maxFret] = fretRange;
	const d = MAIN_DIMENSIONS;
	const { width: totalWidth, height: totalHeight } = computeViewBox(
		d,
		tuning.length,
		minFret,
		maxFret,
	);

	return (
		<div className="relative">
			<FretboardDiagram
				positions={positions}
				stringCount={tuning.length}
				minFret={minFret}
				maxFret={maxFret}
				dimensions={d}
				displayMode={displayMode}
				highlightRoot={highlightRoot}
				rootPitchClass={noteSet?.root}
				onHoverPosition={(data) =>
					setTooltip(
						data
							? {
									x: data.x,
									y: data.y,
									note: data.pos.note,
									interval: data.pos.interval,
								}
							: null,
					)
				}
			/>
			{tooltip && (
				<svg
					viewBox={`0 0 ${totalWidth} ${totalHeight}`}
					className="pointer-events-none absolute inset-0 w-full max-w-full"
					style={{ minWidth: 400 }}
				>
					<rect
						x={tooltip.x - 35}
						y={tooltip.y - d.dotRadius - 30}
						width={70}
						height={22}
						rx={4}
						className="fill-popover stroke-border"
						strokeWidth={1}
					/>
					<text
						x={tooltip.x}
						y={tooltip.y - d.dotRadius - 15}
						textAnchor="middle"
						fontSize={11}
						className="fill-popover-foreground select-none"
					>
						{tooltip.note}
						{tooltip.interval ? ` (${tooltip.interval})` : ""}
					</text>
				</svg>
			)}
		</div>
	);
}
