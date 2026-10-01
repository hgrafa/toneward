import { Minus, Pause, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	beatInterval,
	MAX_BPM,
	MIN_BPM,
	tempoMarking,
} from "@/audio/metronomeMath";
import { NumericInput } from "@/components/NumericInput";
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
	const { t } = useTranslation();
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
					className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background"
				>
					<Play className="size-3.5" />
					{t("ui.metronome.trigger")}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={10} className="w-72 p-5">
				{/* Pendulum */}
				<div className="relative mx-auto flex h-24 w-full items-end justify-center">
					{/* Wooden cabinet of a mechanical metronome, behind the moving arm. */}
					<svg
						aria-hidden="true"
						viewBox="0 0 112 96"
						className="absolute bottom-0 h-24 w-28"
						fill="none"
					>
						<path
							d="M40 14h34l28 72H10l30-72Z"
							fill="#b9a17f"
							stroke="#7d674e"
							strokeLinejoin="round"
						/>
						<path d="M40 16h31l23 68H19l21-68Z" fill="#e5d5b9" />
						<path d="M72 16h2l28 70h-8L72 16Z" fill="#9b8261" />
						<path d="M43 19h25" stroke="#f5e9d5" strokeLinecap="round" />
						<path d="M56 29v45" stroke="#b9a486" strokeWidth="1.5" />
						<path
							d="M46 37h5m10 0h5M45 47h6m10 0h6M44 57h7m10 0h7M43 67h8m10 0h8"
							stroke="#a38c6c"
							strokeLinecap="round"
						/>
						<rect x="8" y="84" width="96" height="8" rx="2" fill="#514231" />
					</svg>
					{/* arm + weight, pivoting at the base */}
					<div
						className="absolute bottom-2 h-20 w-[3px] origin-bottom rounded-full bg-foreground/80 ease-in-out"
						style={{
							transform: `rotate(${angle}deg)`,
							transitionProperty: "transform",
							transitionDuration: swingDuration,
						}}
					>
						<div className="-translate-x-1/2 absolute top-5 left-1/2 size-3.5 rounded-full bg-foreground" />
					</div>
					{/* pivot */}
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
						variant="ghost"
						size="icon-lg"
						onClick={() => setBpm(bpm - 1)}
						aria-label="Decrease tempo"
						className="h-auto w-12 rounded-none bg-transparent hover:bg-transparent dark:hover:bg-transparent"
					>
						<Minus className="size-5" />
					</Button>
					<NumericInput
						value={bpm}
						onChange={setBpm}
						min={MIN_BPM}
						max={MAX_BPM}
						label={t("ui.metronome.tempoInput")}
						className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent py-3 text-center font-bold text-5xl text-foreground leading-none tabular-nums tracking-tight shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-5xl dark:bg-transparent"
					/>
					<Button
						variant="ghost"
						size="icon-lg"
						onClick={() => setBpm(bpm + 1)}
						aria-label="Increase tempo"
						className="h-auto w-12 rounded-none bg-transparent hover:bg-transparent dark:hover:bg-transparent"
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
							<Pause className="size-4" /> {t("ui.metronome.stop")}
						</>
					) : (
						<>
							<Play className="size-4" /> {t("ui.metronome.start")}
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
					{t("ui.metronome.reset")}
				</button>
			</PopoverContent>
		</Popover>
	);
}
