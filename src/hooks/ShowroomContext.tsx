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
import {
	clearStoredDocument,
	loadStoredDocument,
	saveStoredDocument,
} from "@/lib/documentStorage";
import type { ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	currentDocument: ShowroomDocument | null;
	/** Name of a document we saved previously but can no longer reopen, if any. */
	unavailableDocumentName: string | null;
	/** Open a document from a file and persist it across reloads. */
	openDocument: (file: File) => void;
	/** Close the current document and forget the persisted copy. */
	closeDocument: () => void;
	/** Dismiss the "couldn't reopen" notice and clear the stale marker. */
	dismissUnavailable: () => void;
}

const ShowroomContext = createContext<ShowroomState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function ShowroomProvider({ children }: { children: ReactNode }) {
	const [currentDocument, setCurrentDocumentState] =
		useState<ShowroomDocument | null>(null);
	const [unavailableDocumentName, setUnavailableDocumentName] = useState<
		string | null
	>(null);

	// Keep the latest document in a ref so the unmount cleanup can revoke its blob URL.
	const docRef = useRef<ShowroomDocument | null>(null);
	docRef.current = currentDocument;

	const openDocument = useCallback((file: File) => {
		const objectUrl = URL.createObjectURL(file);
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return { name: file.name, objectUrl };
		});
		setUnavailableDocumentName(null);
		void saveStoredDocument(file.name, file);
	}, []);

	const closeDocument = useCallback(() => {
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return null;
		});
		setUnavailableDocumentName(null);
		void clearStoredDocument();
	}, []);

	const dismissUnavailable = useCallback(() => {
		setUnavailableDocumentName(null);
		void clearStoredDocument();
	}, []);

	// Restore the persisted document on mount. If only the name marker survives,
	// surface it as "unavailable" so the user knows it existed.
	useEffect(() => {
		let cancelled = false;
		void loadStoredDocument().then((stored) => {
			if (cancelled || !stored) return;
			if (stored.blob) {
				const objectUrl = URL.createObjectURL(stored.blob);
				setCurrentDocumentState({ name: stored.name, objectUrl });
			} else {
				setUnavailableDocumentName(stored.name);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		return () => {
			if (docRef.current) revokeIfBlob(docRef.current.objectUrl);
		};
	}, []);

	const value = useMemo<ShowroomState>(
		() => ({
			currentDocument,
			unavailableDocumentName,
			openDocument,
			closeDocument,
			dismissUnavailable,
		}),
		[
			currentDocument,
			unavailableDocumentName,
			openDocument,
			closeDocument,
			dismissUnavailable,
		],
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
