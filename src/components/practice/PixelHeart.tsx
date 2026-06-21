const HEART_PIXELS = [
	[0, 1, 1, 0, 0, 1, 1, 0],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[0, 1, 1, 1, 1, 1, 1, 0],
	[0, 0, 1, 1, 1, 1, 0, 0],
	[0, 0, 0, 1, 1, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
];

interface PixelHeartProps {
	filled: boolean;
	pixelSize?: number;
}

export function PixelHeart({ filled, pixelSize = 4 }: PixelHeartProps) {
	const cols = HEART_PIXELS[0].length;
	const rows = HEART_PIXELS.length;
	const color = filled ? "#ef4444" : "currentColor";
	const opacity = filled ? 1 : 0.2;

	return (
		<svg
			width={cols * pixelSize}
			height={rows * pixelSize}
			viewBox={`0 0 ${cols * pixelSize} ${rows * pixelSize}`}
			aria-hidden="true"
		>
			{HEART_PIXELS.map((row, y) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static pixel grid, order never changes
				<g key={y}>
					{row.map((cell, x) =>
						cell ? (
							<rect
								// biome-ignore lint/suspicious/noArrayIndexKey: static pixel grid
								key={x}
								x={x * pixelSize}
								y={y * pixelSize}
								width={pixelSize}
								height={pixelSize}
								fill={color}
								fillOpacity={opacity}
							/>
						) : null,
					)}
				</g>
			))}
		</svg>
	);
}
