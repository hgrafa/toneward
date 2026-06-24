import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	clearStoredDocument,
	loadStoredDocument,
	saveStoredDocument,
} from "./documentStorage";

beforeEach(() => {
	// Fresh IndexedDB + localStorage for every test.
	globalThis.indexedDB = new IDBFactory();
	localStorage.clear();
});

function pdf(body = "%PDF-1.4 fake") {
	return new Blob([body], { type: "application/pdf" });
}

describe("documentStorage", () => {
	it("returns null when nothing has been stored", async () => {
		expect(await loadStoredDocument()).toBeNull();
	});

	it("round-trips a saved document's name and bytes", async () => {
		await saveStoredDocument("score.pdf", pdf("hello"));

		const stored = await loadStoredDocument();
		expect(stored?.name).toBe("score.pdf");
		expect(stored?.blob).toBeInstanceOf(Blob);
		expect(await stored?.blob?.text()).toBe("hello");
	});

	it("clears a stored document", async () => {
		await saveStoredDocument("score.pdf", pdf());
		await clearStoredDocument();
		expect(await loadStoredDocument()).toBeNull();
	});

	it("returns a tombstone (name without bytes) when only the marker survives", async () => {
		// Simulate the bytes being evicted but the lightweight name marker remaining.
		localStorage.setItem("fretboard.showroom.document", "moved.pdf");

		const stored = await loadStoredDocument();
		expect(stored?.name).toBe("moved.pdf");
		expect(stored?.blob).toBeNull();
	});

	it("replaces a previously stored document", async () => {
		await saveStoredDocument("first.pdf", pdf("one"));
		await saveStoredDocument("second.pdf", pdf("two"));

		const stored = await loadStoredDocument();
		expect(stored?.name).toBe("second.pdf");
		expect(await stored?.blob?.text()).toBe("two");
	});
});
