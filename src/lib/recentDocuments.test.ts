import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	addRecentDocument,
	clearRecentDocuments,
	listRecentDocuments,
	MAX_RECENT_DOCUMENTS,
	readRecentDocument,
	removeRecentDocument,
} from "./recentDocuments";

beforeEach(() => {
	// Fresh IndexedDB + localStorage for every test.
	globalThis.indexedDB = new IDBFactory();
	localStorage.clear();
});

function pdf(body = "%PDF-1.4 fake") {
	return new Blob([body], { type: "application/pdf" });
}

describe("recentDocuments", () => {
	it("starts empty", () => {
		expect(listRecentDocuments()).toEqual([]);
	});

	it("records a document and reads its bytes back", async () => {
		const meta = await addRecentDocument("score.pdf", pdf("hello"));

		const list = listRecentDocuments();
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ id: meta.id, name: "score.pdf" });

		const blob = await readRecentDocument(meta.id);
		expect(blob).toBeInstanceOf(Blob);
		expect(await blob?.text()).toBe("hello");
	});

	it("lists most-recent first", async () => {
		await addRecentDocument("a.pdf", pdf("a"));
		await addRecentDocument("b.pdf", pdf("b"));
		await addRecentDocument("c.pdf", pdf("c"));

		expect(listRecentDocuments().map((m) => m.name)).toEqual([
			"c.pdf",
			"b.pdf",
			"a.pdf",
		]);
	});

	it("dedupes by name: re-adding moves to front and refreshes bytes", async () => {
		const first = await addRecentDocument("dup.pdf", pdf("old"));
		await addRecentDocument("other.pdf", pdf("other"));
		const second = await addRecentDocument("dup.pdf", pdf("new"));

		// Same logical entry → same id, no duplicate.
		expect(second.id).toBe(first.id);
		expect(listRecentDocuments().map((m) => m.name)).toEqual([
			"dup.pdf",
			"other.pdf",
		]);
		expect(await (await readRecentDocument(first.id))?.text()).toBe("new");
	});

	it("caps the history and evicts the oldest, deleting its bytes", async () => {
		const metas = [];
		for (let i = 0; i < MAX_RECENT_DOCUMENTS + 2; i++) {
			metas.push(await addRecentDocument(`doc-${i}.pdf`, pdf(`body-${i}`)));
		}

		const list = listRecentDocuments();
		expect(list).toHaveLength(MAX_RECENT_DOCUMENTS);
		// The two oldest were evicted.
		expect(list.some((m) => m.name === "doc-0.pdf")).toBe(false);
		expect(list.some((m) => m.name === "doc-1.pdf")).toBe(false);
		// Evicted bytes are gone too.
		expect(await readRecentDocument(metas[0].id)).toBeNull();
	});

	it("returns null when reading an unknown id", async () => {
		expect(await readRecentDocument("nope")).toBeNull();
	});

	it("returns null when the meta survives but bytes are missing", async () => {
		const meta = await addRecentDocument("ghost.pdf", pdf("boo"));
		// Simulate bytes evicted while the localStorage index marker survives.
		globalThis.indexedDB = new IDBFactory();
		expect(listRecentDocuments().map((m) => m.name)).toEqual(["ghost.pdf"]);
		expect(await readRecentDocument(meta.id)).toBeNull();
	});

	it("removes a single entry and its bytes", async () => {
		const a = await addRecentDocument("a.pdf", pdf("a"));
		const b = await addRecentDocument("b.pdf", pdf("b"));

		await removeRecentDocument(a.id);

		expect(listRecentDocuments().map((m) => m.name)).toEqual(["b.pdf"]);
		expect(await readRecentDocument(a.id)).toBeNull();
		expect(await (await readRecentDocument(b.id))?.text()).toBe("b");
	});

	it("clears everything", async () => {
		await addRecentDocument("a.pdf", pdf("a"));
		await addRecentDocument("b.pdf", pdf("b"));

		await clearRecentDocuments();

		expect(listRecentDocuments()).toEqual([]);
	});
});
