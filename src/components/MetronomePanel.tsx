import { Minus, Pause, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { beatInterval, tempoMarking } from "@/audio/metronomeMath";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useMetronome } from "@/hooks/MetronomeContext";

const BEATS_PER_BAR = [2, 3, 4, 5, 6] as const;
const SWING_ANGLE = 16; // degrees the pendulum leans to each side

export function MetronomePanel() {
	const {
		isPlaying,
		bpm,
		beatsPerBar,
		accent,
		activeBeat,
		toggle,
		setBpm,
		setBeatsPerBar,
		reset,
	} = useMetronome();

	// Monotonic swing counter: flips the pendulum to the opposite side on every
	// beat (independent of the beat index, so odd meters don't stutter at the
	// bar wrap). Phase-locked to the audio because it's driven by onBeat.
	const [swing, setSwing] = useState(0);
	useEffect(() => {
		if (activeBeat >= 0) setSwing((s) => s + 1);
	}, [activeBeat]);

	const angle = isPlaying ? (swing % 2 === 0 ? -SWING_ANGLE : SWING_ANGLE) : 0;
	// One swing spans one beat; ease so it lingers at each extreme like a real
	// metronome (which ticks at the extremes).
	const swingDuration = isPlaying ? `${beatInterval(bpm).toFixed(3)}s` : "0.4s";

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted data-[state=open]:border-foreground/30 data-[state=open]:text-foreground"
				>
					<Play className="size-3.5" />
					Metronome
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={10} className="w-72 p-5">
				{/* Pendulum */}
				<div className="relative mx-auto flex h-24 w-full items-end justify-center">
					{/* faint arc the weight travels along */}
					<div
						className={`absolute bottom-2 h-16 w-28 rounded-[50%] border border-dashed transition-colors ${
							isPlaying ? "border-border" : "border-transparent"
						}`}
					/>
					{/* arm + weight, pivoting at the base */}
					<div
						className="absolute bottom-2 h-20 w-[3px] origin-bottom rounded-full bg-foreground/80 ease-in-out"
						style={{
							transform: `rotate(${angle}deg)`,
							transitionProperty: "transform",
							transitionDuration: swingDuration,
						}}
					>
						<div
							className={`-translate-x-1/2 absolute top-5 left-1/2 size-3.5 rounded-full transition-colors ${
								isPlaying ? "bg-primary" : "bg-muted-foreground/60"
							}`}
						/>
					</div>
					{/* base + pivot */}
					<div className="absolute bottom-1 h-2 w-20 rounded-full bg-muted" />
					<div className="absolute bottom-[5px] size-2.5 rounded-full bg-foreground" />
				</div>

				{/* Beat indicator */}
				<div className="mt-1 mb-4 flex items-center justify-center gap-2">
					{Array.from({ length: beatsPerBar }, (_, i) => {
						const on = activeBeat === i;
						const downbeat = i === 0 && accent;
						return (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: beats are a fixed positional sequence; index is their identity
								key={i}
								className={`h-1.5 rounded-full transition-all duration-150 ${
									on
										? `w-6 ${downbeat ? "bg-foreground" : "bg-primary"}`
										: "w-3 bg-border"
								}`}
							/>
						);
					})}
				</div>

				{/* Title + tempo marking + live indicator */}
				<div className="mb-4 flex flex-col items-center">
					<p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
						BPM
					</p>
					<div className="mt-0.5 flex items-center gap-1.5">
						{isPlaying && (
							<span className="size-1.5 animate-pulse rounded-full bg-primary" />
						)}
						<p className="text-sm font-medium text-foreground">
							{tempoMarking(bpm)}
						</p>
					</div>
				</div>

				{/* Stepper */}
				<div className="flex items-stretch gap-2">
					<Button
						variant="outline"
						size="icon-lg"
						onClick={() => setBpm(bpm - 1)}
						aria-label="Decrease tempo"
						className="h-auto w-12 rounded-xl"
					>
						<Minus className="size-5" />
					</Button>
					<div className="flex flex-1 items-center justify-center rounded-xl border bg-muted/40 py-3">
						<span className="font-bold text-5xl text-foreground leading-none tabular-nums tracking-tight">
							{bpm}
						</span>
					</div>
					<Button
						variant="outline"
						size="icon-lg"
						onClick={() => setBpm(bpm + 1)}
						aria-label="Increase tempo"
						className="h-auto w-12 rounded-xl"
					>
						<Plus className="size-5" />
					</Button>
				</div>

				{/* Transport */}
				<Button
					onClick={toggle}
					size="lg"
					variant={isPlaying ? "secondary" : "default"}
					className="mt-4 w-full rounded-xl"
				>
					{isPlaying ? (
						<>
							<Pause className="size-4" /> Stop
						</>
					) : (
						<>
							<Play className="size-4" /> Start
						</>
					)}
				</Button>

				{/* Beats per bar */}
				<div className="mt-5 flex items-center justify-center gap-1.5">
					{BEATS_PER_BAR.map((n) => (
						<button
							key={n}
							type="button"
							onClick={() => setBeatsPerBar(n)}
							className={`size-8 rounded-lg font-medium text-xs tabular-nums transition-colors ${
								beatsPerBar === n
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted"
							}`}
						>
							{n}
						</button>
					))}
				</div>

				{/* Reset */}
				<button
					type="button"
					onClick={reset}
					className="mt-3 w-full text-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					Reset
				</button>
			</PopoverContent>
		</Popover>
	);
}
