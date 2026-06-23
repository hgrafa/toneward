import {
	ChevronDown,
	ChevronUp,
	Pause,
	Pin,
	Play,
	RotateCcw,
	RotateCw,
	Trash2,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayerLoader } from "@/components/PlayerLoader";
import { SpeedControl } from "@/components/SpeedControl";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersistentPlayer() {
	const { t } = useTranslation();
	const { source, setSource, api, audioRef, ytContainerRef } =
		useMediaPlayerCtx();

	const [expanded, setExpanded] = useState(false);
	const [pinned, setPinned] = useState(false);
	const [seeking, setSeeking] = useState<number | null>(null);
	const prevVolume = useRef(1);

	const hasTrack = source !== null;
	const muted = api.volume === 0;

	// Auto-open the card when a track is loaded so the user can confirm.
	useEffect(() => {
		if (source) setExpanded(true);
	}, [source]);

	function toggleMute() {
		if (muted) api.setVolume(prevVolume.current || 1);
		else {
			prevVolume.current = api.volume;
			api.setVolume(0);
		}
	}

	function onLeave() {
		if (!pinned) setExpanded(false);
	}

	// Commit a buffered scrub on release (pointer, touch, or keyboard).
	function commitSeek() {
		if (seeking !== null) {
			api.seek(seeking);
			setSeeking(null);
		}
	}

	return (
		<div
			onMouseLeave={onLeave}
			className="fixed right-4 bottom-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/90 shadow-xl backdrop-blur-lg"
		>
			{/* Hidden media backends — mounted once, never unmounted. */}
			{/* biome-ignore lint/a11y/useMediaCaption: user-supplied practice audio */}
			<audio ref={audioRef} className="sr-only" />
			<div ref={ytContainerRef} className="sr-only" aria-hidden="true" />

			{!expanded ? (
				/* ---- mini pill ---- */
				<div className="flex items-center gap-2 px-2.5 py-2">
					<button
						type="button"
						aria-label={
							api.isPlaying ? t("ui.showroom.pause") : t("ui.showroom.play")
						}
						onClick={api.toggle}
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
					>
						{api.isPlaying ? (
							<Pause className="size-4" />
						) : (
							<Play className="size-4" />
						)}
					</button>
					<SpeedControl
						value={api.playbackRate}
						onChange={api.setPlaybackRate}
					/>
					<button
						type="button"
						aria-label={t("ui.showroom.volume")}
						onClick={toggleMute}
						className="text-muted-foreground hover:text-foreground"
					>
						{muted ? (
							<VolumeX className="size-4" />
						) : (
							<Volume2 className="size-4" />
						)}
					</button>
					<input
						type="range"
						aria-label={t("ui.showroom.volume")}
						min={0}
						max={1}
						step={0.01}
						value={api.volume}
						onChange={(e) => api.setVolume(Number(e.target.value))}
						className="w-16 accent-foreground"
					/>
					{hasTrack && (
						<span className="min-w-0 flex-1 truncate text-secondary-foreground text-xs">
							{source.title}
						</span>
					)}
					<button
						type="button"
						aria-label={t("ui.player.open")}
						onClick={() => setExpanded(true)}
						className="ml-auto text-muted-foreground hover:text-foreground"
					>
						<ChevronUp className="size-4" />
					</button>
				</div>
			) : (
				/* ---- expanded card ---- */
				<div className="flex flex-col gap-3 p-3.5">
					<div className="flex items-center justify-between">
						<span className="font-display font-bold text-sm">
							{t("ui.player.title")}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								aria-label={t("ui.player.pin")}
								onClick={() => setPinned((p) => !p)}
								className={`flex size-7 items-center justify-center rounded-md transition-colors ${
									pinned
										? "bg-foreground text-background"
										: "text-muted-foreground hover:bg-muted"
								}`}
							>
								<Pin className="size-4" />
							</button>
							<button
								type="button"
								aria-label={t("ui.player.minimize")}
								onClick={() => setExpanded(false)}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
							>
								<ChevronDown className="size-4" />
							</button>
						</div>
					</div>

					{!hasTrack ? (
						<PlayerLoader />
					) : (
						<>
							<div className="flex items-center gap-2">
								<span className="min-w-0 flex-1 truncate font-semibold text-sm">
									{source.title}
								</span>
								<button
									type="button"
									aria-label={t("ui.player.remove")}
									onClick={() => setSource(null)}
									className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
								>
									<Trash2 className="size-4" />
								</button>
							</div>

							{/* seek */}
							<div className="flex items-center gap-2">
								<span className="w-9 text-right font-mono text-muted-foreground text-[11px] tabular-nums">
									{formatTime(seeking ?? api.currentTime)}
								</span>
								<input
									type="range"
									aria-label={t("ui.showroom.seek")}
									min={0}
									max={api.duration || 0}
									step={1}
									value={
										seeking ?? Math.min(api.currentTime, api.duration || 0)
									}
									onChange={(e) => setSeeking(Number(e.target.value))}
									onPointerUp={commitSeek}
									onKeyUp={commitSeek}
									className="flex-1 accent-foreground"
								/>
								<span className="w-9 font-mono text-muted-foreground text-[11px] tabular-nums">
									{formatTime(api.duration)}
								</span>
							</div>

							{/* transport */}
							<div className="flex items-center justify-center gap-4">
								<button
									type="button"
									aria-label={t("ui.showroom.seekBack")}
									onClick={() => api.skip(-10)}
									className="text-secondary-foreground hover:text-foreground"
								>
									<RotateCcw className="size-5" />
								</button>
								<button
									type="button"
									aria-label={
										api.isPlaying
											? t("ui.showroom.pause")
											: t("ui.showroom.play")
									}
									onClick={api.toggle}
									className="flex size-11 items-center justify-center rounded-full bg-foreground text-background"
								>
									{api.isPlaying ? (
										<Pause className="size-5" />
									) : (
										<Play className="size-5" />
									)}
								</button>
								<button
									type="button"
									aria-label={t("ui.showroom.seekForward")}
									onClick={() => api.skip(10)}
									className="text-secondary-foreground hover:text-foreground"
								>
									<RotateCw className="size-5" />
								</button>
								<SpeedControl
									value={api.playbackRate}
									onChange={api.setPlaybackRate}
								/>
							</div>

							{/* volume */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									aria-label={t("ui.showroom.volume")}
									onClick={toggleMute}
									className="text-muted-foreground hover:text-foreground"
								>
									{muted ? (
										<VolumeX className="size-4" />
									) : (
										<Volume2 className="size-4" />
									)}
								</button>
								<input
									type="range"
									aria-label={t("ui.showroom.volume")}
									min={0}
									max={1}
									step={0.01}
									value={api.volume}
									onChange={(e) => api.setVolume(Number(e.target.value))}
									className="flex-1 accent-foreground"
								/>
							</div>
						</>
					)}
					{api.error && <p className="text-destructive text-xs">{api.error}</p>}
				</div>
			)}
		</div>
	);
}
