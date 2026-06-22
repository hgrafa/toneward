// One-shot pixel star-burst: a handful of small squares fly outward and fade.
// Purely decorative; disabled under prefers-reduced-motion via the .anim-burst
// CSS class (neutralised to `animation: none` in the reduced-motion media block).
const PARTICLES = [
	{ tx: "-22px", ty: "-18px", color: "#fbbf24" },
	{ tx: "20px", ty: "-20px", color: "#34d399" },
	{ tx: "26px", ty: "10px", color: "#60a5fa" },
	{ tx: "-24px", ty: "12px", color: "#f472b6" },
	{ tx: "0px", ty: "-28px", color: "#fde68a" },
	{ tx: "2px", ty: "26px", color: "#a78bfa" },
];

export function PixelBurst() {
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
		>
			{PARTICLES.map((p, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static particle list
					key={i}
					className="anim-burst"
					style={{
						position: "absolute",
						width: 6,
						height: 6,
						backgroundColor: p.color,
						// custom props consumed by the burstOut keyframe
						["--tx" as string]: p.tx,
						["--ty" as string]: p.ty,
					}}
				/>
			))}
		</span>
	);
}
