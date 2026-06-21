import {
	ChevronDown,
	ChevronUp,
	Gauge,
	Pause,
	Play,
	RotateCcw,
	RotateCw,
	Volume2,
} from "lucide-react";
import { type RefObject, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { MediaPlayerApi } from "@/hooks/useMediaPlayer";

const SPEED_PRESETS = [0.5, 0.75, 1, 1.5, 2] as const;

const formatSpeed = (r: number) => `${+r.toFixed(2)}×`;
const formatPreset = (r: number) =>
	r < 1 ? `.${r.toString().split(".")[1]}` : `${r}`;

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioDockProps {
	api: MediaPlayerApi;
	title: string;
	kind: "youtube" | "mp3";
	audioRef: RefObject<HTMLAudioElement | null>;
	ytContainerRef: RefObject<HTMLDivElement | null>;
}

export function AudioDock({
	api,
	title,
	kind,
	audioRef,
	ytContainerRef,
}: AudioDockProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [seeking, setSeeking] = useState<number | null>(null);

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-border border-t bg-card/95 backdrop-blur">
			{/* Hidden media backends */}
			{/* biome-ignore lint/a11y/useMediaCaption: user-supplied practice audio */}
			<audio ref={audioRef} className="sr-only" />
			<div ref={ytContainerRef} className="sr-only" aria-hidden="true" />

			<div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
				<button
					type="button"
					aria-label={api.isPlaying ? "Pause" : "Play"}
					onClick={api.toggle}
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
				>
					{api.isPlaying ? (
						<Pause className="size-4" />
					) : (
						<Play className="size-4" />
					)}
				</button>

				{!collapsed && (
					<>
						<button
							type="button"
							aria-label="Back 10 seconds"
							onClick={() => api.skip(-10)}
							className="text-muted-foreground hover:text-foreground"
						>
							<RotateCcw className="size-4" />
						</button>
						<button
							type="button"
							aria-label="Forward 10 seconds"
							onClick={() => api.skip(10)}
							className="text-muted-foreground hover:text-foreground"
						>
							<RotateCw className="size-4" />
						</button>

						<span className="w-10 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
							{formatTime(seeking ?? api.currentTime)}
						</span>
						<Slider
							aria-label="Seek"
							min={0}
							max={api.duration || 0}
							step={1}
							value={[seeking ?? Math.min(api.currentTime, api.duration || 0)]}
							onValueChange={([v]) => setSeeking(v)}
							onValueCommit={([v]) => {
								api.seek(v);
								setSeeking(null);
							}}
							className="min-w-24 flex-1"
						/>
						<span className="w-10 shrink-0 text-muted-foreground text-xs tabular-nums">
							{formatTime(api.duration)}
						</span>

						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									aria-label="Speed"
									className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
								>
									<Gauge className="size-4" />
									{formatSpeed(api.playbackRate)}
								</button>
							</PopoverTrigger>
							<PopoverContent align="end" sideOffset={10} className="w-44 p-4">
								<div className="flex flex-col items-center gap-3">
									<span className="font-semibold text-4xl tabular-nums tracking-tight">
										{formatSpeed(api.playbackRate)}
									</span>
									<Slider
										aria-label="Playback speed"
										min={0.25}
										max={2}
										step={0.05}
										value={[api.playbackRate]}
										onValueChange={([v]) => api.setPlaybackRate(v)}
										className="w-full"
									/>
									<div className="flex w-full items-center justify-between">
										{SPEED_PRESETS.map((rate) => (
											<button
												key={rate}
												type="button"
												onClick={() => api.setPlaybackRate(rate)}
												className={`rounded px-1 py-0.5 text-xs transition-colors ${
													Math.abs(api.playbackRate - rate) < 0.001
														? "font-semibold text-primary"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												{formatPreset(rate)}
											</button>
										))}
									</div>
								</div>
							</PopoverContent>
						</Popover>

						<div className="hidden items-center gap-2 sm:flex">
							<Volume2 className="size-4 text-muted-foreground" />
							<Slider
								aria-label="Volume"
								min={0}
								max={1}
								step={0.01}
								value={[api.volume]}
								onValueChange={([v]) => api.setVolume(v)}
								className="w-20"
							/>
						</div>
					</>
				)}

				<span className="hidden max-w-40 truncate text-muted-foreground text-xs md:block">
					{kind === "youtube" ? "▶ " : "♪ "}
					{title}
				</span>

				<button
					type="button"
					aria-label={collapsed ? "Expand dock" : "Collapse dock"}
					onClick={() => setCollapsed((c) => !c)}
					className="ml-auto text-muted-foreground hover:text-foreground"
				>
					{collapsed ? (
						<ChevronUp className="size-4" />
					) : (
						<ChevronDown className="size-4" />
					)}
				</button>
			</div>

			{api.error && (
				<p className="px-4 pb-2 text-destructive text-xs">{api.error}</p>
			)}
		</div>
	);
}
