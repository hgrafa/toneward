import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { type MediaPlayerApi, useMediaPlayer } from "@/hooks/useMediaPlayer";
import type { AudioSource } from "@/types/showroom";

interface MediaPlayerState {
	source: AudioSource | null;
	setSource: (source: AudioSource | null) => void;
	api: MediaPlayerApi;
	audioRef: RefObject<HTMLAudioElement | null>;
	ytContainerRef: RefObject<HTMLDivElement | null>;
}

const MediaPlayerContext = createContext<MediaPlayerState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
	const [source, setSourceState] = useState<AudioSource | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const ytContainerRef = useRef<HTMLDivElement | null>(null);

	// Keep the latest source in a ref so unmount cleanup can revoke a live blob.
	const sourceRef = useRef<AudioSource | null>(null);
	sourceRef.current = source;

	const setSource = useCallback((next: AudioSource | null) => {
		setSourceState((prev) => {
			if (prev?.kind === "mp3") revokeIfBlob(prev.objectUrl);
			return next;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (sourceRef.current?.kind === "mp3")
				revokeIfBlob(sourceRef.current.objectUrl);
		};
	}, []);

	const api = useMediaPlayer(source, audioRef, ytContainerRef);

	const value = useMemo<MediaPlayerState>(
		() => ({ source, setSource, api, audioRef, ytContainerRef }),
		[source, setSource, api],
	);

	return (
		<MediaPlayerContext.Provider value={value}>
			{children}
		</MediaPlayerContext.Provider>
	);
}

export function useMediaPlayerCtx(): MediaPlayerState {
	const ctx = useContext(MediaPlayerContext);
	if (!ctx)
		throw new Error(
			"useMediaPlayerCtx must be used within a MediaPlayerProvider",
		);
	return ctx;
}
