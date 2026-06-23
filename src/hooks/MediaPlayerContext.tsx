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

// Only link-based (YouTube) sources survive a reload — an uploaded file's blob
// URL is gone once the page is closed, so mp3 sources are never persisted.
const STORAGE_KEY = "tw-player-source";
const RECENTS_KEY = "tw-player-recents";
const MAX_RECENTS = 5;

function loadStoredSource(): AudioSource | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as AudioSource;
		if (parsed?.kind === "youtube" && parsed.videoId && parsed.url) {
			return parsed;
		}
		return null;
	} catch {
		/* storage unavailable or malformed */
		return null;
	}
}

function loadRecents(): AudioSource[] {
	try {
		const raw = localStorage.getItem(RECENTS_KEY);
		const arr = raw ? (JSON.parse(raw) as AudioSource[]) : [];
		return Array.isArray(arr)
			? arr.filter((s) => s?.kind === "youtube" && s.videoId && s.url)
			: [];
	} catch {
		/* storage unavailable or malformed */
		return [];
	}
}

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

interface MediaPlayerState {
	source: AudioSource | null;
	setSource: (source: AudioSource | null) => void;
	recents: AudioSource[];
	api: MediaPlayerApi;
	audioRef: RefObject<HTMLAudioElement | null>;
	ytContainerRef: RefObject<HTMLDivElement | null>;
}

const MediaPlayerContext = createContext<MediaPlayerState | null>(null);

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
	const [source, setSourceState] = useState<AudioSource | null>(
		loadStoredSource,
	);
	const [recents, setRecents] = useState<AudioSource[]>(loadRecents);
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
		// Remember recently-played tracks, but only reloadable (YouTube) ones —
		// an uploaded file's blob URL won't survive a reload (or a swap revoke).
		if (next?.kind === "youtube") {
			setRecents((prev) => {
				const deduped = prev.filter(
					(s) => !(s.kind === "youtube" && s.videoId === next.videoId),
				);
				const updated = [next, ...deduped].slice(0, MAX_RECENTS);
				try {
					localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
				} catch {
					/* storage unavailable */
				}
				return updated;
			});
		}
	}, []);

	// Persist link sources so the last track returns on reload; clear otherwise.
	useEffect(() => {
		try {
			if (source?.kind === "youtube") {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(source));
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		} catch {
			/* storage unavailable */
		}
	}, [source]);

	useEffect(() => {
		return () => {
			if (sourceRef.current?.kind === "mp3")
				revokeIfBlob(sourceRef.current.objectUrl);
		};
	}, []);

	const api = useMediaPlayer(source, audioRef, ytContainerRef);

	const value = useMemo<MediaPlayerState>(
		() => ({ source, setSource, recents, api, audioRef, ytContainerRef }),
		[source, setSource, recents, api],
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
