// Persists the Showroom's current document across reloads.
//
// A browser app has no real filesystem "path" to store, so we keep the file
// *bytes* in IndexedDB (blobs can be large) and a lightweight name marker in
// localStorage. On reload we recreate an object URL from the blob. If the bytes
// are gone but the marker survives, callers can show a "couldn't reopen" notice.

const DB_NAME = "toneward";
const DB_VERSION = 1;
const STORE_NAME = "showroom";
const BLOB_KEY = "currentDocument";
const NAME_KEY = "fretboard.showroom.document";

export interface StoredDocument {
	name: string;
	/** The file bytes, or `null` when we know a document existed but can't reopen it. */
	blob: Blob | null;
}

// Stored as raw bytes + MIME type rather than a Blob: ArrayBuffers structured-clone
// reliably across environments, whereas Blob cloning is patchy outside real browsers.
interface StoredBytes {
	buffer: ArrayBuffer;
	type: string;
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

function putBytes(bytes: StoredBytes): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				tx.objectStore(STORE_NAME).put(bytes, BLOB_KEY);
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

function getBytes(): Promise<StoredBytes | null> {
	return openDb().then(
		(db) =>
			new Promise<StoredBytes | null>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readonly");
				const request = tx.objectStore(STORE_NAME).get(BLOB_KEY);
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

function deleteBytes(): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				tx.objectStore(STORE_NAME).delete(BLOB_KEY);
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

export async function saveStoredDocument(
	name: string,
	blob: Blob,
): Promise<void> {
	// Record the name first: it's the cheap, durable marker that lets us show a
	// "couldn't reopen" notice even if persisting the bytes fails.
	try {
		localStorage.setItem(NAME_KEY, name);
	} catch {
		// storage unavailable (private mode / quota) — ignore
	}
	try {
		const buffer = await blob.arrayBuffer();
		await putBytes({ buffer, type: blob.type });
	} catch {
		// IndexedDB unavailable / quota — the doc won't survive reload, but the
		// name marker means the user still gets a notice next time.
	}
}

export async function loadStoredDocument(): Promise<StoredDocument | null> {
	let name: string | null = null;
	try {
		name = localStorage.getItem(NAME_KEY);
	} catch {
		// storage unavailable — nothing to restore
	}
	if (!name) return null;

	try {
		const bytes = await getBytes();
		const blob = bytes ? new Blob([bytes.buffer], { type: bytes.type }) : null;
		return { name, blob };
	} catch {
		// bytes unreadable but we know a document existed → tombstone
		return { name, blob: null };
	}
}

export async function clearStoredDocument(): Promise<void> {
	try {
		localStorage.removeItem(NAME_KEY);
	} catch {
		// storage unavailable — ignore
	}
	try {
		await deleteBytes();
	} catch {
		// IndexedDB unavailable — ignore
	}
}
