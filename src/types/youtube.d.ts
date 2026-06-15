// Minimal typings for the YouTube IFrame Player API surface we use.
export {};

declare global {
	interface YTPlayer {
		playVideo(): void;
		pauseVideo(): void;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		getCurrentTime(): number;
		getDuration(): number;
		setVolume(volume: number): void; // 0..100
		setPlaybackRate(rate: number): void;
		getAvailablePlaybackRates(): number[];
		loadVideoById(videoId: string): void;
		destroy(): void;
	}

	interface YTPlayerEvent {
		target: YTPlayer;
		data: number;
	}

	interface YTNamespace {
		Player: new (
			el: HTMLElement | string,
			options: {
				videoId?: string;
				playerVars?: Record<string, number | string>;
				events?: {
					onReady?: (event: YTPlayerEvent) => void;
					onStateChange?: (event: YTPlayerEvent) => void;
					onError?: (event: YTPlayerEvent) => void;
				};
			},
		) => YTPlayer;
		PlayerState: {
			PLAYING: number;
			PAUSED: number;
			ENDED: number;
			BUFFERING: number;
			CUED: number;
			UNSTARTED: number;
		};
	}

	interface Window {
		YT: YTNamespace;
		onYouTubeIframeAPIReady?: () => void;
	}
}
