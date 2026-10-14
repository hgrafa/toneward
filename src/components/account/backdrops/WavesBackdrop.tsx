import { type CSSProperties, useId, useSyncExternalStore } from "react";

export interface BackdropProps {
	/** User-requested pause (WCAG 2.2.2): hold the current frame. */
	paused?: boolean;
}

type WaveLayer = {
	/** Whole sine periods per tile; must be an integer so the loop is seamless. */
	periods: number;
	/** Vertical center of the wave band, as % of the viewport height. */
	center: number;
	/** CSS height of the band (peak-to-trough at full amplitude). */
	height: string;
	stroke: number;
	opacity: number;
	blur: number;
	/** Seconds to scroll one full tile (= `periods` wave cycles). */
	flow: number;
	reverse: boolean;
	/** Starting offset as a fraction of one tile, also used for the static frame. */
	phase: number;
	/** Seconds for one amplitude swell (half a breath). */
	breathe: number;
	/** Smallest vertical scale reached while breathing. */
	minScale: number;
};

// Back to front: wider, blurrier and fainter at the back; crisp with a glow at the front.
const LAYERS: WaveLayer[] = [
	{
		periods: 1,
		center: 52,
		height: "clamp(160px, 42vh, 480px)",
		stroke: 26,
		opacity: 0.18,
		blur: 16,
		flow: 20,
		reverse: false,
		phase: 0.1,
		breathe: 13,
		minScale: 0.55,
	},
	{
		periods: 2,
		center: 57,
		height: "clamp(130px, 32vh, 380px)",
		stroke: 16,
		opacity: 0.26,
		blur: 9,
		flow: 34,
		reverse: true,
		phase: 0.35,
		breathe: 11,
		minScale: 0.5,
	},
	{
		periods: 2,
		center: 63,
		height: "clamp(100px, 24vh, 300px)",
		stroke: 9,
		opacity: 0.32,
		blur: 4,
		flow: 26,
		reverse: false,
		phase: 0.62,
		breathe: 9,
		minScale: 0.6,
	},
	{
		periods: 3,
		center: 60,
		height: "clamp(80px, 18vh, 230px)",
		stroke: 4,
		opacity: 0.4,
		blur: 1.5,
		flow: 36,
		reverse: true,
		phase: 0.18,
		breathe: 7.5,
		minScale: 0.62,
	},
	{
		periods: 3,
		center: 67,
		height: "clamp(60px, 13vh, 170px)",
		stroke: 2.5,
		opacity: 0.45,
		blur: 0,
		flow: 27,
		reverse: false,
		phase: 0.8,
		breathe: 12,
		minScale: 0.5,
	},
	{
		periods: 2,
		center: 61,
		height: "clamp(110px, 26vh, 320px)",
		stroke: 2.5,
		opacity: 0.95,
		blur: 0,
		flow: 19,
		reverse: false,
		phase: 0.45,
		breathe: 8.5,
		minScale: 0.72,
	},
];

const FRONT = LAYERS.length - 1;

// One tile is 1000 user units wide; the path spans two tiles and scrolls by
// exactly one, so every wave needs an integer number of periods per tile.
const TILE = 1000;
const VIEW_H = 100;
const SAMPLES_PER_PERIOD = 40;

function sinePath(periods: number): string {
	const total = periods * 2 * SAMPLES_PER_PERIOD;
	const mid = VIEW_H / 2;
	const amp = VIEW_H / 2 - 2;
	const points: string[] = [];
	for (let i = 0; i <= total; i++) {
		const x = (i / total) * TILE * 2;
		const y = mid - amp * Math.sin((x / TILE) * periods * Math.PI * 2);
		points.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
	}
	return `M${points.join("L")}`;
}

const PATHS = LAYERS.map((layer) => sinePath(layer.periods));

// Per-layer keyframes (no CSS variables) so the compositor can run them.
const KEYFRAMES = [
	"@keyframes toneward-waves-flow{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}",
	"@keyframes toneward-waves-glow{from{opacity:.7}to{opacity:1}}",
	...LAYERS.map(
		(layer, i) =>
			`@keyframes toneward-waves-breathe-${i}{from{transform:scaleY(1)}to{transform:scaleY(${layer.minScale})}}`,
	),
].join("");

function subscribeReducedMotion(onChange: () => void) {
	const query = window.matchMedia("(prefers-reduced-motion: reduce)");
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeVisibility(onChange: () => void) {
	document.addEventListener("visibilitychange", onChange);
	return () => document.removeEventListener("visibilitychange", onChange);
}

function getHidden() {
	return document.hidden;
}

function getServerFalse() {
	return false;
}

export function WavesBackdrop({ paused = false }: BackdropProps) {
	const id = useId();
	const reduced = useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotion,
		() => true,
	);
	const hidden = useSyncExternalStore(
		subscribeVisibility,
		getHidden,
		getServerFalse,
	);
	const playState = hidden || paused ? "paused" : "running";

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#23201c_0%,#2a2520_55%,#3A332C_100%)]"
		>
			{!reduced && <style>{KEYFRAMES}</style>}

			<div
				className="absolute top-[56%] left-1/2 portrait:top-[66%] size-[120vmax] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(200,52,95,0.4),rgba(242,104,60,0.14)_45%,rgba(251,166,63,0.04)_65%,transparent_80%)]"
				style={
					reduced
						? undefined
						: {
								animation:
									"toneward-waves-glow 9s ease-in-out infinite alternate",
								animationPlayState: playState,
								willChange: "opacity",
							}
				}
			/>

			{/* Faint oscilloscope graticule, faded toward the edges. */}
			<div className="absolute inset-0 bg-[linear-gradient(rgba(255,156,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,156,180,0.05)_1px,transparent_1px)] bg-size-[64px_64px] bg-center [mask-image:radial-gradient(ellipse_at_50%_58%,black_10%,transparent_70%)]" />

			{/* On tall portrait screens the card covers the middle, so the band drops below it. */}
			<div className="absolute inset-0 [--waves-shift:0%] [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] portrait:[--waves-shift:18%]">
				{LAYERS.map((layer, i) => {
					const gradientId = `${id}-wave-${i}`;
					const isFront = i === FRONT;
					const breatheStyle: CSSProperties = reduced
						? { transform: `scaleY(${(1 + layer.minScale) / 2})` }
						: {
								animation: `toneward-waves-breathe-${i} ${layer.breathe}s ease-in-out ${-layer.phase * layer.breathe}s infinite alternate`,
								animationPlayState: playState,
								willChange: "transform",
							};
					const flowStyle: CSSProperties = reduced
						? { transform: `translate3d(${-layer.phase * 50}%,0,0)` }
						: {
								animation: `toneward-waves-flow ${layer.flow}s linear ${-layer.phase * layer.flow}s infinite ${layer.reverse ? "reverse" : "normal"}`,
								animationPlayState: playState,
								willChange: "transform",
							};
					return (
						<div
							key={gradientId}
							className="absolute inset-x-0"
							style={{
								top: `calc(${layer.center}% + var(--waves-shift) - ${layer.height} / 2)`,
								height: layer.height,
								opacity: layer.opacity,
								filter: isFront
									? "drop-shadow(0 0 6px rgba(242,61,120,0.65)) drop-shadow(0 0 18px rgba(242,104,60,0.35))"
									: layer.blur > 0
										? `blur(${layer.blur}px)`
										: undefined,
							}}
						>
							<div className="size-full" style={breatheStyle}>
								<div className="h-full w-[max(200%,1800px)]" style={flowStyle}>
									<svg
										className="size-full overflow-visible"
										viewBox={`0 0 ${TILE * 2} ${VIEW_H}`}
										preserveAspectRatio="none"
									>
										<defs>
											{/* Reflected over half a tile so the colors repeat every tile and loop seamlessly. */}
											<linearGradient
												id={gradientId}
												gradientUnits="userSpaceOnUse"
												x1={0}
												y1={0}
												x2={TILE / 2}
												y2={0}
												spreadMethod="reflect"
											>
												<stop offset="0%" stopColor="#C8345F" />
												<stop offset="35%" stopColor="#f23d78" />
												<stop offset="70%" stopColor="#F2683C" />
												<stop offset="100%" stopColor="#FBA63F" />
											</linearGradient>
										</defs>
										<path
											d={PATHS[i]}
											fill="none"
											stroke={`url(#${gradientId})`}
											strokeWidth={layer.stroke}
											strokeLinecap="round"
											strokeLinejoin="round"
											vectorEffect="non-scaling-stroke"
										/>
										{isFront && (
											<path
												d={PATHS[i]}
												fill="none"
												stroke="#ff9cb4"
												strokeOpacity={0.85}
												strokeWidth={1}
												vectorEffect="non-scaling-stroke"
											/>
										)}
									</svg>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_45%,rgba(18,15,13,0.55)_100%)]" />
		</div>
	);
}
