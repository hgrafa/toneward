import { useRef } from "react";

// Thumb diameter in px. The thumb centre and every preset label are positioned
// with the SAME mapping, so a preset's label sits exactly under the thumb when
// that value is selected (e.g. 1× lines up with the "1" stop).
const THUMB = 14;

export interface SliderStop {
	value: number;
	label: string;
}

interface PlayerSliderProps {
	value: number;
	min: number;
	max: number;
	step: number;
	ariaLabel: string;
	stops: SliderStop[];
	onChange: (value: number) => void;
}

export function PlayerSlider({
	value,
	min,
	max,
	step,
	ariaLabel,
	stops,
	onChange,
}: PlayerSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);

	const clamp = (v: number) => Math.min(max, Math.max(min, v));
	const fraction = (clamp(value) - min) / (max - min);
	// Thumb centre travels from THUMB/2 to (width - THUMB/2); labels share it.
	const pos = (f: number) =>
		`calc(${THUMB / 2}px + ${f} * (100% - ${THUMB}px))`;

	function setFromClientX(clientX: number) {
		const el = trackRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const inner = rect.width - THUMB;
		const x = Math.min(inner, Math.max(0, clientX - rect.left - THUMB / 2));
		const f = inner > 0 ? x / inner : 0;
		const stepped = Math.round((min + f * (max - min)) / step) * step;
		onChange(clamp(Number(stepped.toFixed(4))));
	}

	function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
		e.currentTarget.setPointerCapture(e.pointerId);
		setFromClientX(e.clientX);
	}

	function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
		if (e.buttons === 1) setFromClientX(e.clientX);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		if (e.key === "ArrowRight" || e.key === "ArrowUp") {
			onChange(clamp(Number((value + step).toFixed(4))));
			e.preventDefault();
		} else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
			onChange(clamp(Number((value - step).toFixed(4))));
			e.preventDefault();
		}
	}

	return (
		<div className="w-full">
			{/* biome-ignore lint/a11y/useSemanticElements: a div with role=slider is the standard custom-slider pattern */}
			<div
				ref={trackRef}
				role="slider"
				tabIndex={0}
				aria-label={ariaLabel}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onKeyDown={onKeyDown}
				className="relative h-5 cursor-pointer touch-none select-none outline-none"
			>
				<div className="absolute top-1/2 right-[7px] left-[7px] h-1.5 -translate-y-1/2 rounded-full bg-white/15">
					<div
						className="h-full rounded-full bg-brand-gradient"
						style={{ width: `${fraction * 100}%` }}
					/>
				</div>
				<div
					className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 size-3.5 rounded-full bg-white shadow"
					style={{ left: pos(fraction) }}
				/>
			</div>
			<div className="relative mt-1 h-4">
				{stops.map((stop) => {
					const f = (stop.value - min) / (max - min);
					const active = Math.abs(value - stop.value) < 0.001;
					return (
						<button
							key={stop.value}
							type="button"
							onClick={() => onChange(stop.value)}
							style={{ left: pos(f) }}
							className={`-translate-x-1/2 absolute top-0 rounded px-1 font-mono text-xs transition-colors ${
								active
									? "font-semibold text-white"
									: "text-white/50 hover:text-white"
							}`}
						>
							{stop.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
