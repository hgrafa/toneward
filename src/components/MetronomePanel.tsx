import { Minus, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { MAX_BPM, MIN_BPM } from "@/audio/metronomeMath";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMetronome } from "@/hooks/MetronomeContext";

const BEATS_PER_BAR = [1, 2, 3, 4, 5, 6, 7] as const;

export function MetronomePanel() {
	const {
		isPlaying,
		bpm,
		beatsPerBar,
		volume,
		accent,
		activeBeat,
		routingSupported,
		devices,
		deviceId,
		toggle,
		setBpm,
		setBeatsPerBar,
		setVolume,
		setAccent,
		setDeviceId,
		refreshDevices,
	} = useMetronome();

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
				>
					<Play className="size-3.5" />
					Metronome
				</button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Metronome</DialogTitle>
					<DialogDescription>
						A steady click for practice. Choose where it plays below.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-2">
					{/* Beat indicator */}
					<div className="flex items-center justify-center gap-2">
						{Array.from({ length: beatsPerBar }, (_, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: beats are a fixed positional sequence; index is their identity
								key={i}
								className={`size-3 rounded-full transition-colors ${
									activeBeat === i
										? i === 0 && accent
											? "bg-primary"
											: "bg-foreground"
										: "bg-muted"
								}`}
							/>
						))}
					</div>

					{/* BPM */}
					<div className="space-y-2">
						<div className="flex items-baseline justify-between">
							<Label>Tempo</Label>
							<span className="text-2xl font-bold tabular-nums">
								{bpm}
								<span className="ml-1 text-xs font-normal text-muted-foreground">
									BPM
								</span>
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								size="icon"
								onClick={() => setBpm(bpm - 1)}
								aria-label="Decrease tempo"
							>
								<Minus className="size-4" />
							</Button>
							<Slider
								value={[bpm]}
								min={MIN_BPM}
								max={MAX_BPM}
								step={1}
								onValueChange={([v]) => setBpm(v)}
								aria-label="Tempo in beats per minute"
							/>
							<Button
								variant="outline"
								size="icon"
								onClick={() => setBpm(bpm + 1)}
								aria-label="Increase tempo"
							>
								<Plus className="size-4" />
							</Button>
						</div>
					</div>

					{/* Beats per bar */}
					<div className="space-y-2">
						<Label>Beats per bar</Label>
						<div className="flex rounded-md border border-input">
							{BEATS_PER_BAR.map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setBeatsPerBar(n)}
									className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
										beatsPerBar === n
											? "bg-primary text-primary-foreground"
											: "bg-background text-muted-foreground hover:bg-muted"
									}`}
								>
									{n}
								</button>
							))}
						</div>
					</div>

					{/* Accent toggle + volume */}
					<div className="flex items-center justify-between gap-4">
						<button
							type="button"
							onClick={() => setAccent(!accent)}
							className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
								accent
									? "border-primary bg-primary text-primary-foreground"
									: "border-input bg-background text-muted-foreground hover:bg-muted"
							}`}
						>
							Accent downbeat
						</button>
						<div className="flex flex-1 items-center gap-2">
							<Label className="text-xs text-muted-foreground">Volume</Label>
							<Slider
								value={[volume]}
								min={0}
								max={1}
								step={0.01}
								onValueChange={([v]) => setVolume(v)}
								aria-label="Volume"
							/>
						</div>
					</div>

					{/* Output device */}
					<div className="space-y-2">
						<Label>Output device</Label>
						{routingSupported ? (
							<div className="flex items-center gap-2">
								<Select value={deviceId} onValueChange={setDeviceId}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="System default" />
									</SelectTrigger>
									<SelectContent>
										{devices.map((d) => (
											<SelectItem key={d.deviceId} value={d.deviceId}>
												{d.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="icon"
									onClick={() => void refreshDevices()}
									aria-label="Refresh devices and show names"
								>
									<RefreshCw className="size-4" />
								</Button>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								This browser plays through the system default output. Per-device
								routing needs Chrome or Edge.
							</p>
						)}
					</div>

					{/* Transport */}
					<Button onClick={toggle} className="w-full" size="lg">
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
				</div>
			</DialogContent>
		</Dialog>
	);
}
