import { type CSSProperties, type ReactNode, useState } from "react";
import type { BackdropProps } from "./WavesBackdrop";

type GlyphName =
	| "treble"
	| "bass"
	| "quarter"
	| "half"
	| "eighth"
	| "beamed"
	| "sharp"
	| "flat"
	| "rest";

const GLYPHS: Record<GlyphName, { viewBox: string; body: ReactNode }> = {
	treble: {
		viewBox: "0 0 40 100",
		body: (
			<>
				<path d="M16 86C12 92 22 98 27 90C30 84 22 30 20 18C18 6 30 4 30 14C30 26 8 40 8 58C8 72 30 76 34 64C38 52 22 44 16 54C12 62 20 68 24 64" />
				<circle cx="15" cy="86" r="3.4" fill="currentColor" stroke="none" />
			</>
		),
	},
	bass: {
		viewBox: "0 0 46 60",
		body: (
			<>
				<circle cx="8" cy="18" r="4.6" fill="currentColor" stroke="none" />
				<path d="M8 14C10 4 32 2 33 20C34 36 20 50 4 56" />
				<circle cx="40" cy="13" r="2.4" fill="currentColor" stroke="none" />
				<circle cx="40" cy="27" r="2.4" fill="currentColor" stroke="none" />
			</>
		),
	},
	quarter: {
		viewBox: "0 0 24 60",
		body: (
			<>
				<ellipse
					cx="10"
					cy="50"
					rx="7.5"
					ry="5.5"
					transform="rotate(-20 10 50)"
					fill="currentColor"
					stroke="none"
				/>
				<path d="M17 48V6" />
			</>
		),
	},
	half: {
		viewBox: "0 0 24 60",
		body: (
			<>
				<ellipse cx="10" cy="50" rx="7" ry="5" transform="rotate(-20 10 50)" />
				<path d="M17 48V6" />
			</>
		),
	},
	eighth: {
		viewBox: "0 0 32 60",
		body: (
			<>
				<ellipse
					cx="10"
					cy="50"
					rx="7.5"
					ry="5.5"
					transform="rotate(-20 10 50)"
					fill="currentColor"
					stroke="none"
				/>
				<path d="M17 48V6C18 18 30 22 26 36" />
			</>
		),
	},
	beamed: {
		viewBox: "0 0 52 60",
		body: (
			<>
				<ellipse
					cx="9"
					cy="50"
					rx="7.5"
					ry="5.5"
					transform="rotate(-20 9 50)"
					fill="currentColor"
					stroke="none"
				/>
				<ellipse
					cx="39"
					cy="44"
					rx="7.5"
					ry="5.5"
					transform="rotate(-20 39 44)"
					fill="currentColor"
					stroke="none"
				/>
				<path d="M16 48V12M46 42V6" />
				<path d="M16 10L46 4V11L16 17Z" fill="currentColor" stroke="none" />
			</>
		),
	},
	sharp: {
		viewBox: "0 0 30 46",
		body: (
			<>
				<path d="M11 4L9 42M21 2L19 40" />
				<path d="M3 18L27 12M3 32L27 26" strokeWidth={4.5} />
			</>
		),
	},
	flat: {
		viewBox: "0 0 24 50",
		body: <path d="M6 2V46C14 40 22 34 18 28C14 22 8 28 6 32" />,
	},
	rest: {
		viewBox: "0 0 24 60",
		body: <path d="M8 4L18 18L9 30L18 42C10 38 6 46 14 56" />,
	},
};

const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];
const COLORS = ["#ffffff", "#ffffff", "#ff9cb4", "#FBA63F", "#F2683C"];
const SLOTS = 12;

type Spec = {
	glyph: GlyphName;
	/** Position, as % of the viewport. */
	x: number;
	y: number;
	/** Rendered height in px. */
	size: number;
	color: string;
	/** Peak opacity of the fade cycle. */
	opacity: number;
	rotate: number;
	/** Sideways drift over one cycle, in px. */
	drift: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) =>
	items[Math.floor(Math.random() * items.length)];

function randomSpec(): Spec {
	const glyph = pick(GLYPH_NAMES);
	let x: number;
	let y: number;
	// Keep clear of the card in the middle and the top bar, so every glyph is actually seen.
	do {
		x = rand(2, 93);
		y = rand(9, 88);
	} while (x > 27 && x < 67 && y > 20 && y < 74);
	return {
		glyph,
		x,
		y,
		size:
			glyph === "treble"
				? rand(80, 120)
				: glyph === "bass"
					? rand(50, 72)
					: rand(36, 60),
		color: pick(COLORS),
		opacity: rand(0.07, 0.13),
		rotate: rand(-14, 14),
		drift: rand(-12, 12),
	};
}

// Each cycle: fade in, drift, fade out, then rest invisible while the slot moves elsewhere.
// Under reduced motion there is no animation: glyphs sit still at their peak opacity.
const KEYFRAMES = `
@keyframes toneward-notation-cycle {
	0% { opacity: 0; transform: translate3d(0, 12px, 0) rotate(var(--r)) scale(0.9); }
	18%, 62% { opacity: var(--o); }
	80%, 100% { opacity: 0; transform: translate3d(var(--dx), -16px, 0) rotate(calc(var(--r) + 5deg)) scale(1); }
}
@media (prefers-reduced-motion: no-preference) {
	.toneward-notation-glyph { animation: toneward-notation-cycle ease-in-out infinite; }
}
`;

function GlyphSlot({ index, paused }: { index: number; paused: boolean }) {
	const [duration] = useState(() => rand(9, 15));
	const [spec, setSpec] = useState(randomSpec);
	const glyph = GLYPHS[spec.glyph];
	const [, , w, h] = glyph.viewBox.split(" ").map(Number);

	return (
		<div
			// Odd slots only on `sm`+, where there's room around the card.
			className={`toneward-notation-glyph absolute ${index % 2 ? "hidden sm:block" : ""}`}
			// The cycle ends fully transparent, so jumping to a new spot here is invisible.
			onAnimationIteration={(e) => {
				if (e.target === e.currentTarget) setSpec(randomSpec());
			}}
			style={
				{
					left: `${spec.x}%`,
					top: `${spec.y}%`,
					color: spec.color,
					opacity: spec.opacity,
					transform: `rotate(${spec.rotate}deg)`,
					"--o": spec.opacity,
					"--r": `${spec.rotate}deg`,
					"--dx": `${spec.drift}px`,
					animationDuration: `${duration}s`,
					animationDelay: `-${(index / SLOTS) * duration}s`,
					animationPlayState: paused ? "paused" : "running",
				} as CSSProperties
			}
		>
			<svg
				viewBox={glyph.viewBox}
				width={(spec.size * w) / h}
				height={spec.size}
				fill="none"
				stroke="currentColor"
				strokeWidth={2.6}
				strokeLinecap="round"
				strokeLinejoin="round"
				role="presentation"
			>
				{glyph.body}
			</svg>
		</div>
	);
}

/** Faint clefs, notes and accidentals that fade in and out at random spots. */
export function NotationLayer({ paused = false }: BackdropProps) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<style>{KEYFRAMES}</style>
			{Array.from({ length: SLOTS }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed slots, never reordered
				<GlyphSlot key={i} index={i} paused={paused} />
			))}
		</div>
	);
}
