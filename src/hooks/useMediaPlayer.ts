import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { loadYouTubeApi } from "@/lib/youtube";
import type { AudioSource } from "@/types/showroom";

export interface MediaPlayerApi {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playbackRate: number;
	error: string | null;
	play: () => void;
	pause: () => void;
	toggle: () => void;
	seek: (time: number) => void;
	skip: (delta: number) => void;
	setVolume: (v: number) => void;
	setPlaybackRate: (rate: number) => void;
}

export function useMediaPlayer(
	source: AudioSource | null,
	audioRef: RefObject<HTMLAudioElement | null>,
	ytContainerRef: RefObject<HTMLElement | null>,
): MediaPlayerApi {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(1);
	const [playbackRate, setRateState] = useState(1);
	const [error, setError] = useState<string | null>(null);

	const ytPlayerRef = useRef<YTPlayer | null>(null);
	const pollRef = useRef<number | null>(null);

	const stopPolling = useCallback(() => {
		if (pollRef.current !== null) {
			window.clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	// Reset transport state whenever the source changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on source identity
	useEffect(() => {
		setIsPlaying(false);
		setCurrentTime(0);
		setDuration(0);
		setError(null);
	}, [source]);

	// MP3 backend: bind to the <audio> element.
	useEffect(() => {
		if (source?.kind !== "mp3") return;
		const el = audioRef.current;
		if (!el) return;

		el.src = source.objectUrl;
		el.volume = volume;
		el.playbackRate = playbackRate;

		const onTime = () => setCurrentTime(el.currentTime);
		const onMeta = () => setDuration(el.duration || 0);
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onEnded = () => setIsPlaying(false);
		const onError = () => setError("Could not play this audio file.");

		el.addEventListener("timeupdate", onTime);
		el.addEventListener("loadedmetadata", onMeta);
		el.addEventListener("play", onPlay);
		el.addEventListener("pause", onPause);
		el.addEventListener("ended", onEnded);
		el.addEventListener("error", onError);

		return () => {
			el.removeEventListener("timeupdate", onTime);
			el.removeEventListener("loadedmetadata", onMeta);
			el.removeEventListener("play", onPlay);
			el.removeEventListener("pause", onPause);
			el.removeEventListener("ended", onEnded);
			el.removeEventListener("error", onError);
			el.pause();
			el.removeAttribute("src");
			el.load();
		};
	}, [source, audioRef, volume, playbackRate]);

	// YouTube backend: create a hidden IFrame player.
	useEffect(() => {
		if (source?.kind !== "youtube") return;
		const container = ytContainerRef.current;
		if (!container) return;

		let cancelled = false;
		loadYouTubeApi()
			.then((YT) => {
				if (cancelled) return;
				const mount = document.createElement("div");
				container.appendChild(mount);
				ytPlayerRef.current = new YT.Player(mount, {
					videoId: source.videoId,
					playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
					events: {
						onReady: (e) => {
							e.target.setVolume(Math.round(volume * 100));
							setDuration(e.target.getDuration());
						},
						onStateChange: (e) => {
							setIsPlaying(e.data === YT.PlayerState.PLAYING);
							if (e.data === YT.PlayerState.PLAYING) {
								stopPolling();
								pollRef.current = window.setInterval(() => {
									const p = ytPlayerRef.current;
									if (p) {
										setCurrentTime(p.getCurrentTime());
										setDuration(p.getDuration());
									}
								}, 250);
							} else {
								stopPolling();
							}
						},
						onError: () => setError("Could not play this YouTube video."),
					},
				});
			})
			.catch(() => setError("Could not load the YouTube player."));

		return () => {
			cancelled = true;
			stopPolling();
			ytPlayerRef.current?.destroy();
			ytPlayerRef.current = null;
			container.replaceChildren();
		};
	}, [source, ytContainerRef, volume, stopPolling]);

	const play = useCallback(() => {
		if (source?.kind === "mp3")
			audioRef.current?.play().catch(() => setError("Playback was blocked."));
		else ytPlayerRef.current?.playVideo();
	}, [source, audioRef]);

	const pause = useCallback(() => {
		if (source?.kind === "mp3") audioRef.current?.pause();
		else ytPlayerRef.current?.pauseVideo();
	}, [source, audioRef]);

	const toggle = useCallback(() => {
		if (isPlaying) pause();
		else play();
	}, [isPlaying, play, pause]);

	const seek = useCallback(
		(time: number) => {
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.currentTime = time;
			} else {
				ytPlayerRef.current?.seekTo(time, true);
			}
			setCurrentTime(time);
		},
		[source, audioRef],
	);

	const skip = useCallback(
		(delta: number) => {
			const next = Math.max(
				0,
				Math.min(duration || Infinity, currentTime + delta),
			);
			seek(next);
		},
		[currentTime, duration, seek],
	);

	const setVolume = useCallback(
		(v: number) => {
			const clamped = Math.max(0, Math.min(1, v));
			setVolumeState(clamped);
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.volume = clamped;
			} else {
				ytPlayerRef.current?.setVolume(Math.round(clamped * 100));
			}
		},
		[source, audioRef],
	);

	const setPlaybackRate = useCallback(
		(rate: number) => {
			setRateState(rate);
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.playbackRate = rate;
			} else {
				ytPlayerRef.current?.setPlaybackRate(rate);
			}
		},
		[source, audioRef],
	);

	useEffect(() => stopPolling, [stopPolling]);

	return {
		isPlaying,
		currentTime,
		duration,
		volume,
		playbackRate,
		error,
		play,
		pause,
		toggle,
		seek,
		skip,
		setVolume,
		setPlaybackRate,
	};
}
