import {
	ArrowLeftRight,
	ChevronUp,
	Pause,
	Pin,
	Play,
	RotateCcw,
	RotateCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayerLoader } from "@/components/PlayerLoader";
import { SpeedControl } from "@/components/SpeedControl";
import { VolumeControl } from "@/components/VolumeControl";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersistentPlayer() {
	const { t } = useTranslation();
	const { source, api, audioRef, ytContainerRef } = useMediaPlayerCtx();

	const [expanded, setExpanded] = useState(false);
	const [pinned, setPinned] = useState(false);
	const [swapping, setSwapping] = useState(false);
	const [speedOpen, setSpeedOpen] = useState(false);
	const [volumeOpen, setVolumeOpen] = useState(false);
	const [closing, setClosing] = useState(false);

	const hasTrack = source !== null;
	const progressPct =
		api.duration > 0 ? (api.currentTime / api.duration) * 100 : 0;

	// Pending auto-minimize timer + a live mirror of whether the card must stay
	// open (pinned, or a control popover whose panel is portaled outside).
	const closeTimer = useRef<number | null>(null);
	const keepOpenRef = useRef(false);
	keepOpenRef.current = pinned || speedOpen || volumeOpen;

	// Auto-open the card when a track is loaded; cancel any pending close, and
	// leave the "switch track" loader once a new source lands.
	useEffect(() => {
		if (source) {
			setExpanded(true);
			setClosing(false);
		}
		setSwapping(false);
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, [source]);

	useEffect(() => {
		return () => {
			if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
		};
	}, []);

	// Minimize after a short grace delay on mouse-leave, with a fade-out — unless
	// pinned or a control popover is open. Re-entering cancels it.
	function scheduleClose() {
		if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
		closeTimer.current = window.setTimeout(() => {
			if (keepOpenRef.current) {
				closeTimer.current = null;
				return;
			}
			setClosing(true);
			closeTimer.current = window.setTimeout(() => {
				closeTimer.current = null;
				setClosing(false);
				setExpanded(false);
				setSwapping(false);
			}, 180);
		}, 650);
	}

	function cancelClose() {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
		setClosing(false);
	}

	function seekFromClick(e: React.MouseEvent<HTMLButtonElement>) {
		const rect = e.currentTarget.getBoundingClientRect();
		const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		api.seek(pct * (api.duration || 0));
	}

	return (
		<div
			onMouseEnter={cancelClose}
			onMouseLeave={() => {
				if (expanded) scheduleClose();
			}}
			className="fixed right-4 bottom-4 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#23201c] text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
		>
			{/* Hidden media backends — mounted once, never unmounted. */}
			{/* biome-ignore lint/a11y/useMediaCaption: user-supplied practice audio */}
			<audio ref={audioRef} className="sr-only" />
			<div ref={ytContainerRef} className="sr-only" aria-hidden="true" />

			{!expanded ? (
				/* ---- mini pill ---- */
				<div className="player-pop flex items-center gap-2 px-2.5 py-2">
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
					{hasTrack && (
						<span className="min-w-0 flex-1 truncate text-white/80 text-xs">
							{source.title}
						</span>
					)}
					<div className="ml-auto flex items-center gap-2">
						<SpeedControl
							value={api.playbackRate}
							onChange={api.setPlaybackRate}
							onOpenChange={setSpeedOpen}
						/>
						<VolumeControl
							value={api.volume}
							onChange={api.setVolume}
							onOpenChange={setVolumeOpen}
						/>
						<button
							type="button"
							aria-label={t("ui.player.open")}
							onClick={() => setExpanded(true)}
							className="text-white/60 hover:text-white"
						>
							<ChevronUp className="size-4" />
						</button>
					</div>
				</div>
			) : (
				/* ---- expanded card ---- */
				<div
					className={`${closing ? "player-pop-out" : "player-pop"} flex flex-col gap-3 p-3.5`}
				>
					<div className="flex items-center justify-between">
						<span className="font-display font-bold text-sm">
							{t("ui.player.title")}
						</span>
						<div className="flex items-center gap-1">
							{hasTrack && !swapping && (
								<button
									type="button"
									onClick={() => setSwapping(true)}
									className="flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2.5 font-semibold text-white/80 text-xs transition-colors hover:bg-white/20"
								>
									<ArrowLeftRight className="size-3.5" />
									{t("ui.player.switch")}
								</button>
							)}
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
						</div>
					</div>

					{!hasTrack || swapping ? (
						<PlayerLoader />
					) : (
						<>
							<div className="truncate font-semibold text-sm">
								{source.title}
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
							<div className="flex items-center justify-center gap-5">
								<button
									type="button"
									aria-label={t("ui.showroom.seekBack")}
									onClick={() => api.skip(-10)}
									className="relative flex size-9 items-center justify-center text-white/70 hover:text-white"
								>
									<RotateCcw className="size-8" strokeWidth={1.5} />
									<span className="absolute font-bold text-[8px] tabular-nums">
										10
									</span>
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
									className="relative flex size-9 items-center justify-center text-white/70 hover:text-white"
								>
									<RotateCw className="size-8" strokeWidth={1.5} />
									<span className="absolute font-bold text-[8px] tabular-nums">
										10
									</span>
								</button>
							</div>

							{/* speed + volume, same level */}
							<div className="flex items-center justify-center gap-3">
								<SpeedControl
									value={api.playbackRate}
									onChange={api.setPlaybackRate}
									onOpenChange={setSpeedOpen}
								/>
								<VolumeControl
									value={api.volume}
									onChange={api.setVolume}
									onOpenChange={setVolumeOpen}
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
