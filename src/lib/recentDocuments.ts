// Remembers recently opened Showroom documents so the empty state can offer
// quick re-open shortcuts.
//
// A browser app has no real filesystem "path" to reopen a file from, so the
// only way a click can actually re-open a document is to keep its *bytes*. We
// store a small, capped ring of recent PDFs' bytes in IndexedDB and a
// lightweight metadata index (id + name + timestamp) in localStorage, so the
// list renders synchronously without reading large blobs. When the metadata
// survives but the bytes don't, `readRecentDocument` returns `null` and callers
// can show a "couldn't reopen" notice.
//
// This is intentionally a separate concern from `documentStorage.ts` (which
// persists the single *currently open* document for #29). Each persisted
// concern stays a focused module rather than one shared framework.

const DB_NAME = "toneward-recent";
const DB_VERSION = 1;
const STORE_NAME = "recentDocuments";
const INDEX_KEY = "fretboard.showroom.recent";

/** How many recent documents we keep. Bounds IndexedDB growth. */
export const MAX_RECENT_DOCUMENTS = 5;

export interface RecentDocumentMeta {
	id: string;
	name: string;
	/** Epoch ms of the most recent open. */
	addedAt: number;
}

// Stored as raw bytes + MIME type rather than a Blob: ArrayBuffers structured-clone
// reliably across environments, whereas Blob cloning is patchy outside real browsers.
interface StoredBytes {
	buffer: ArrayBuffer;
	type: string;
}

function newId(): string {
	try {
		if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
	} catch {
		// fall through
	}
	return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(new Error("IndexedDB unavailable"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE_NAME)) {
				request.result.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function putBytes(id: string, bytes: StoredBytes): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				tx.objectStore(STORE_NAME).put(bytes, id);
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => {
					db.close();
					reject(tx.error);
				};
			}),
	);
}

function getBytes(id: string): Promise<StoredBytes | null> {
	return openDb().then(
		(db) =>
			new Promise<StoredBytes | null>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readonly");
				const request = tx.objectStore(STORE_NAME).get(id);
				request.onsuccess = () => {
					db.close();
					const result = request.result as StoredBytes | undefined;
					// Duck-type rather than `instanceof ArrayBuffer`: the value may come
					// from a different realm (e.g. structured-clone in tests).
					const valid =
						typeof result?.buffer?.byteLength === "number" &&
						typeof result.type === "string";
					resolve(valid ? result : null);
				};
				request.onerror = () => {
					db.close();
					reject(request.error);
				};
			}),
	);
}

function deleteBytes(id: string): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				tx.objectStore(STORE_NAME).delete(id);
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => {
					db.close();
					reject(tx.error);
				};
			}),
	);
}

function readIndex(): RecentDocumentMeta[] {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(INDEX_KEY);
	} catch {
		return [];
	}
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(e): e is RecentDocumentMeta =>
				typeof e === "object" &&
				e !== null &&
				typeof (e as RecentDocumentMeta).id === "string" &&
				typeof (e as RecentDocumentMeta).name === "string" &&
				typeof (e as RecentDocumentMeta).addedAt === "number",
		);
	} catch {
		return [];
	}
}

function writeIndex(entries: RecentDocumentMeta[]): void {
	try {
		localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
	} catch {
		// storage unavailable (private mode / quota) — ignore
	}
}

/** Recent documents, most-recent first. Synchronous: reads the lightweight index only. */
export function listRecentDocuments(): RecentDocumentMeta[] {
	return readIndex();
}

/**
 * Record a freshly opened document at the front of the history, persisting its
 * bytes. Re-opening a document with the same name refreshes the existing entry
 * instead of duplicating it. The oldest entries beyond {@link MAX_RECENT_DOCUMENTS}
 * are evicted (their bytes deleted too).
 */
export async function addRecentDocument(
	name: string,
	blob: Blob,
): Promise<RecentDocumentMeta> {
	const existing = readIndex();
	const prior = existing.find((e) => e.name === name);
	const meta: RecentDocumentMeta = {
		id: prior?.id ?? newId(),
		name,
		addedAt: Date.now(),
	};

	const next = [meta, ...existing.filter((e) => e.id !== meta.id)];
	const kept = next.slice(0, MAX_RECENT_DOCUMENTS);
	const evicted = next.slice(MAX_RECENT_DOCUMENTS);

	// Write the index first: the cheap, durable marker that the list renders from.
	writeIndex(kept);

	try {
		const buffer = await blob.arrayBuffer();
		await putBytes(meta.id, { buffer, type: blob.type });
	} catch {
		// IndexedDB unavailable / quota — the entry still shows, but a click will
		// fall through to the "couldn't reopen" notice.
	}

	for (const e of evicted) {
		try {
			await deleteBytes(e.id);
		} catch {
			// best effort
		}
	}

	return meta;
}

/** Read a recent document's bytes as a Blob, or `null` when they can't be recovered. */
export async function readRecentDocument(id: string): Promise<Blob | null> {
	try {
		const bytes = await getBytes(id);
		return bytes ? new Blob([bytes.buffer], { type: bytes.type }) : null;
	} catch {
		return null;
	}
}

/** Forget a single recent document (index entry + bytes). */
export async function removeRecentDocument(id: string): Promise<void> {
	writeIndex(readIndex().filter((e) => e.id !== id));
	try {
		await deleteBytes(id);
	} catch {
		// best effort
	}
}

/** Forget every recent document. */
export async function clearRecentDocuments(): Promise<void> {
	const ids = readIndex().map((e) => e.id);
	try {
		localStorage.removeItem(INDEX_KEY);
	} catch {
		// storage unavailable — ignore
	}
	for (const id of ids) {
		try {
			await deleteBytes(id);
		} catch {
			// best effort
		}
	}
}
