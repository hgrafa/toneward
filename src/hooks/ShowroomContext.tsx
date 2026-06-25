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
import {
	addRecentDocument,
	listRecentDocuments,
	type RecentDocumentMeta,
	readRecentDocument,
	removeRecentDocument,
} from "@/lib/recentDocuments";
import type { ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	currentDocument: ShowroomDocument | null;
	/** Name of a document we saved previously but can no longer reopen, if any. */
	unavailableDocumentName: string | null;
	/** Recently opened documents, most-recent first (for quick re-open). */
	recentDocuments: RecentDocumentMeta[];
	/** Open a document from a file and persist it across reloads. */
	openDocument: (file: File) => void;
	/**
	 * Re-open a previously opened document from history. Resolves `false` when its
	 * bytes can no longer be recovered (the entry is dropped from history).
	 */
	openRecentDocument: (id: string) => Promise<boolean>;
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
	const [recentDocuments, setRecentDocuments] = useState<RecentDocumentMeta[]>(
		() => listRecentDocuments(),
	);

	// Keep the latest document in a ref so the unmount cleanup can revoke its blob URL.
	const docRef = useRef<ShowroomDocument | null>(null);
	docRef.current = currentDocument;

	// Swap in a freshly created object URL, revoking any prior blob URL.
	const showDocument = useCallback((name: string, blob: Blob) => {
		const objectUrl = URL.createObjectURL(blob);
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return { name, objectUrl };
		});
		setUnavailableDocumentName(null);
	}, []);

	const openDocument = useCallback(
		(file: File) => {
			showDocument(file.name, file);
			void saveStoredDocument(file.name, file);
			void addRecentDocument(file.name, file).then(() => {
				setRecentDocuments(listRecentDocuments());
			});
		},
		[showDocument],
	);

	const openRecentDocument = useCallback(
		async (id: string): Promise<boolean> => {
			const meta = listRecentDocuments().find((e) => e.id === id);
			const blob = await readRecentDocument(id);
			if (!meta || !blob) {
				await removeRecentDocument(id);
				setRecentDocuments(listRecentDocuments());
				return false;
			}
			showDocument(meta.name, blob);
			void saveStoredDocument(meta.name, blob);
			// Re-opening bumps it to the front of the history.
			await addRecentDocument(meta.name, blob);
			setRecentDocuments(listRecentDocuments());
			return true;
		},
		[showDocument],
	);

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
			recentDocuments,
			openDocument,
			openRecentDocument,
			closeDocument,
			dismissUnavailable,
		}),
		[
			currentDocument,
			unavailableDocumentName,
			recentDocuments,
			openDocument,
			openRecentDocument,
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
