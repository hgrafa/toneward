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
import type { ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	currentDocument: ShowroomDocument | null;
	setCurrentDocument: (doc: ShowroomDocument | null) => void;
}

const ShowroomContext = createContext<ShowroomState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function ShowroomProvider({ children }: { children: ReactNode }) {
	const [currentDocument, setCurrentDocumentState] =
		useState<ShowroomDocument | null>(null);

	const docRef = useRef<ShowroomDocument | null>(null);
	docRef.current = currentDocument;

	const setCurrentDocument = useCallback((doc: ShowroomDocument | null) => {
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return doc;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (docRef.current) revokeIfBlob(docRef.current.objectUrl);
		};
	}, []);

	const value = useMemo<ShowroomState>(
		() => ({ currentDocument, setCurrentDocument }),
		[currentDocument, setCurrentDocument],
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
