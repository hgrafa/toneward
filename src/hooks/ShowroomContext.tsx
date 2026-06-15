import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AudioSource, ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	audioSource: AudioSource | null;
	currentDocument: ShowroomDocument | null;
	setAudioSource: (source: AudioSource | null) => void;
	setCurrentDocument: (doc: ShowroomDocument | null) => void;
}

const ShowroomContext = createContext<ShowroomState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function ShowroomProvider({ children }: { children: ReactNode }) {
	const [audioSource, setAudioSourceState] = useState<AudioSource | null>(null);
	const [currentDocument, setCurrentDocumentState] =
		useState<ShowroomDocument | null>(null);

	// Keep latest values in refs so the unmount cleanup can revoke live blob URLs.
	const audioRef = useRef<AudioSource | null>(null);
	const docRef = useRef<ShowroomDocument | null>(null);
	audioRef.current = audioSource;
	docRef.current = currentDocument;

	const setAudioSource = useCallback((source: AudioSource | null) => {
		setAudioSourceState((prev) => {
			if (prev?.kind === "mp3") revokeIfBlob(prev.objectUrl);
			return source;
		});
	}, []);

	const setCurrentDocument = useCallback((doc: ShowroomDocument | null) => {
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return doc;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (audioRef.current?.kind === "mp3")
				revokeIfBlob(audioRef.current.objectUrl);
			if (docRef.current) revokeIfBlob(docRef.current.objectUrl);
		};
	}, []);

	const value = useMemo<ShowroomState>(
		() => ({
			audioSource,
			currentDocument,
			setAudioSource,
			setCurrentDocument,
		}),
		[audioSource, currentDocument, setAudioSource, setCurrentDocument],
	);

	return (
		<ShowroomContext.Provider value={value}>
			{children}
		</ShowroomContext.Provider>
	);
}

export function useShowroom(): ShowroomState {
	const ctx = useContext(ShowroomContext);
	if (!ctx)
		throw new Error("useShowroom must be used within a ShowroomProvider");
	return ctx;
}
