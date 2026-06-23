import {
	ChevronUp,
	Music,
	Pause,
	Pin,
	Play,
	Replace,
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

// Animated "now playing" bars (brand gradient), hidden under reduced motion.
function Equalizer() {
	return (
		<span aria-hidden="true" className="flex h-3.5 items-end gap-[2px]">
			{[0, 0.15, 0.3, 0.45].map((delay) => (
				<span
					key={delay}
					className="anim-eq-bar w-[3px] origin-bottom rounded-full bg-brand-gradient"
					style={{ height: "100%", animationDelay: `${delay}s` }}
				/>
			))}
		</span>
	);
}

export function PersistentPlayer() {
	const { t } = useTranslation();
	const { source, setSource, api, audioRef, ytContainerRef } =
		useMediaPlayerCtx();

	const [expanded, setExpanded] = useState(false);
	const [pinned, setPinned] = useState(false);
	const [swapping, setSwapping] = useState(false);
	const prevVolume = useRef(1);

	const hasTrack = source !== null;
	const muted = api.volume === 0;
	const progressPct =
		api.duration > 0 ? (api.currentTime / api.duration) * 100 : 0;

	// Auto-open the card when a track is loaded so the user can confirm, and
	// leave the "switch track" loader once a new source lands.
	useEffect(() => {
		if (source) setExpanded(true);
		setSwapping(false);
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

	function seekFromClick(e: React.MouseEvent<HTMLButtonElement>) {
		const rect = e.currentTarget.getBoundingClientRect();
		const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		api.seek(pct * (api.duration || 0));
	}

	return (
		<div
			onMouseLeave={onLeave}
			className={`fixed right-4 bottom-4 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#23201c] text-white shadow-2xl transition-shadow ${
				api.isPlaying ? "ring-1 ring-brand/50" : ""
			}`}
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
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#23201c]"
					>
						{api.isPlaying ? (
							<Pause className="size-4" />
						) : (
							<Play className="size-4" />
						)}
					</button>
					{api.isPlaying && <Equalizer />}
					{hasTrack && (
						<span className="min-w-0 flex-1 truncate text-white/80 text-xs">
							{source.title}
						</span>
					)}
					<SpeedControl
						value={api.playbackRate}
						onChange={api.setPlaybackRate}
					/>
					<button
						type="button"
						aria-label={t("ui.showroom.volume")}
						onClick={toggleMute}
						className="text-white/60 hover:text-white"
					>
						{muted ? (
							<VolumeX className="size-4" />
						) : (
							<Volume2 className="size-4" />
						)}
					</button>
					<button
						type="button"
						aria-label={t("ui.player.open")}
						onClick={() => setExpanded(true)}
						className="ml-auto text-white/60 hover:text-white"
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
										? "bg-white text-[#23201c]"
										: "text-white/60 hover:bg-white/10"
								}`}
							>
								<Pin className="size-4" />
							</button>
							{hasTrack && (
								<button
									type="button"
									onClick={() => setSwapping((s) => !s)}
									aria-pressed={swapping}
									className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 font-semibold text-xs transition-colors ${
										swapping
											? "bg-white text-[#23201c]"
											: "bg-white/10 text-white/80 hover:bg-white/20"
									}`}
								>
									<Replace className="size-3.5" />
									{t("ui.player.switch")}
								</button>
							)}
						</div>
					</div>

					{!hasTrack || swapping ? (
						<PlayerLoader />
					) : (
						<>
							<div className="flex items-center gap-3">
								<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient">
									<Music className="size-5 text-white" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate font-semibold text-sm">
										{source.title}
									</div>
									<div className="truncate text-white/50 text-xs">
										{t("ui.player.subtitle")}
									</div>
								</div>
								{api.isPlaying && <Equalizer />}
								<button
									type="button"
									aria-label={t("ui.player.remove")}
									onClick={() => setSource(null)}
									className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
								>
									<Trash2 className="size-4" />
								</button>
							</div>

							{/* seek (gradient progress, click to scrub) */}
							<div className="flex items-center gap-2">
								<span className="w-9 text-right font-mono text-[11px] text-white/50 tabular-nums">
									{formatTime(api.currentTime)}
								</span>
								<button
									type="button"
									aria-label={t("ui.showroom.seek")}
									onClick={seekFromClick}
									className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"
								>
									<div
										className="h-full rounded-full bg-brand-gradient"
										style={{ width: `${progressPct}%` }}
									/>
								</button>
								<span className="w-9 font-mono text-[11px] text-white/50 tabular-nums">
									{formatTime(api.duration)}
								</span>
							</div>

							{/* transport */}
							<div className="flex items-center justify-center gap-4">
								<button
									type="button"
									aria-label={t("ui.showroom.seekBack")}
									onClick={() => api.skip(-10)}
									className="text-white/70 hover:text-white"
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
									className="flex size-11 items-center justify-center rounded-full bg-white text-[#23201c]"
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
									className="text-white/70 hover:text-white"
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
									className="text-white/60 hover:text-white"
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
									className="flex-1 accent-white"
								/>
							</div>
						</>
					)}
					{api.error && <p className="text-red-300 text-xs">{api.error}</p>}
				</div>
			)}
		</div>
	);
}
