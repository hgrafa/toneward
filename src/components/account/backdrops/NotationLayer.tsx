import type { CSSProperties, ReactNode } from "react";
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

type Placement = {
	glyph: GlyphName;
	/** Position, as % of the viewport. */
	x: number;
	y: number;
	/** Rendered height in px. */
	size: number;
	color: string;
	opacity: number;
	rotate: number;
	/** Float cycle in seconds; the negative delay staggers the phase. */
	duration: number;
	delay: number;
	/** Hidden below `sm`, where the card covers most of the screen. */
	wide?: boolean;
};

const PINK = "#ff9cb4";
const AMBER = "#FBA63F";
const ORANGE = "#F2683C";
const WHITE = "#ffffff";

const PLACEMENTS: Placement[] = [
	{
		glyph: "treble",
		x: 6,
		y: 12,
		size: 120,
		color: WHITE,
		opacity: 0.08,
		rotate: -8,
		duration: 22,
		delay: 0,
	},
	{
		glyph: "bass",
		x: 85,
		y: 9,
		size: 70,
		color: PINK,
		opacity: 0.1,
		rotate: 6,
		duration: 19,
		delay: 4,
	},
	{
		glyph: "quarter",
		x: 36,
		y: 7,
		size: 50,
		color: WHITE,
		opacity: 0.07,
		rotate: 10,
		duration: 17,
		delay: 9,
		wide: true,
	},
	{
		glyph: "rest",
		x: 61,
		y: 15,
		size: 52,
		color: ORANGE,
		opacity: 0.09,
		rotate: -4,
		duration: 21,
		delay: 2,
		wide: true,
	},
	{
		glyph: "bass",
		x: 13,
		y: 36,
		size: 50,
		color: WHITE,
		opacity: 0.06,
		rotate: -10,
		duration: 24,
		delay: 11,
		wide: true,
	},
	{
		glyph: "flat",
		x: 3,
		y: 55,
		size: 50,
		color: AMBER,
		opacity: 0.09,
		rotate: 8,
		duration: 18,
		delay: 6,
	},
	{
		glyph: "beamed",
		x: 29,
		y: 40,
		size: 50,
		color: ORANGE,
		opacity: 0.07,
		rotate: -6,
		duration: 20,
		delay: 13,
		wide: true,
	},
	{
		glyph: "sharp",
		x: 90,
		y: 45,
		size: 44,
		color: PINK,
		opacity: 0.1,
		rotate: 12,
		duration: 16,
		delay: 3,
	},
	{
		glyph: "eighth",
		x: 21,
		y: 70,
		size: 56,
		color: AMBER,
		opacity: 0.1,
		rotate: -12,
		duration: 19,
		delay: 8,
	},
	{
		glyph: "beamed",
		x: 69,
		y: 73,
		size: 60,
		color: WHITE,
		opacity: 0.08,
		rotate: 8,
		duration: 23,
		delay: 1,
	},
	{
		glyph: "treble",
		x: 80,
		y: 80,
		size: 96,
		color: AMBER,
		opacity: 0.07,
		rotate: 10,
		duration: 26,
		delay: 15,
		wide: true,
	},
	{
		glyph: "eighth",
		x: 94,
		y: 68,
		size: 46,
		color: WHITE,
		opacity: 0.07,
		rotate: 14,
		duration: 18,
		delay: 10,
		wide: true,
	},
	{
		glyph: "half",
		x: 12,
		y: 87,
		size: 54,
		color: PINK,
		opacity: 0.08,
		rotate: -6,
		duration: 21,
		delay: 5,
	},
	{
		glyph: "sharp",
		x: 49,
		y: 89,
		size: 36,
		color: WHITE,
		opacity: 0.07,
		rotate: -14,
		duration: 17,
		delay: 12,
		wide: true,
	},
];

// Only animate when the user hasn't asked for reduced motion; otherwise glyphs sit still.
const KEYFRAMES = `
@keyframes toneward-notation-float {
	0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--r)); }
	50% { transform: translate3d(var(--dx), -14px, 0) rotate(calc(var(--r) + 4deg)); }
}
@media (prefers-reduced-motion: no-preference) {
	.toneward-notation-glyph { animation: toneward-notation-float ease-in-out infinite; }
}
`;

/** Faint clefs, notes and accidentals drifting over a backdrop. */
export function NotationLayer({ paused = false }: BackdropProps) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<style>{KEYFRAMES}</style>
			{PLACEMENTS.map((p, i) => {
				const glyph = GLYPHS[p.glyph];
				const aspect =
					Number(glyph.viewBox.split(" ")[2]) /
					Number(glyph.viewBox.split(" ")[3]);
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
						key={i}
						className={`toneward-notation-glyph absolute ${p.wide ? "hidden sm:block" : ""}`}
						style={
							{
								left: `${p.x}%`,
								top: `${p.y}%`,
								color: p.color,
								opacity: p.opacity,
								transform: `rotate(${p.rotate}deg)`,
								"--r": `${p.rotate}deg`,
								"--dx": `${i % 2 ? 8 : -8}px`,
								animationDuration: `${p.duration}s`,
								animationDelay: `-${p.delay}s`,
								animationPlayState: paused ? "paused" : "running",
							} as CSSProperties
						}
					>
						<svg
							viewBox={glyph.viewBox}
							width={p.size * aspect}
							height={p.size}
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
			})}
		</div>
	);
}
