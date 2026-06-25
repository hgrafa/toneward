import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { loadStoredDocument, saveStoredDocument } from "@/lib/documentStorage";
import { addRecentDocument } from "@/lib/recentDocuments";
import { ShowroomProvider, useShowroom } from "./ShowroomContext";

beforeEach(() => {
	globalThis.indexedDB = new IDBFactory();
	localStorage.clear();
});

function Probe() {
	const {
		currentDocument,
		unavailableDocumentName,
		openDocument,
		closeDocument,
	} = useShowroom();
	return (
		<div>
			<span data-testid="doc">{currentDocument?.name ?? "none"}</span>
			<span data-testid="unavailable">{unavailableDocumentName ?? "none"}</span>
			<button
				type="button"
				onClick={() =>
					openDocument(
						new File(["%PDF body"], "score.pdf", { type: "application/pdf" }),
					)
				}
			>
				open
			</button>
			<button type="button" onClick={closeDocument}>
				close
			</button>
		</div>
	);
}

function renderProvider() {
	return render(
		<ShowroomProvider>
			<Probe />
		</ShowroomProvider>,
	);
}

describe("ShowroomContext persistence", () => {
	it("restores a previously saved document on mount", async () => {
		await saveStoredDocument(
			"saved.pdf",
			new File(["%PDF"], "saved.pdf", { type: "application/pdf" }),
		);

		renderProvider();

		await waitFor(() =>
			expect(screen.getByTestId("doc")).toHaveTextContent("saved.pdf"),
		);
		expect(screen.getByTestId("unavailable")).toHaveTextContent("none");
	});

	it("surfaces a tombstone when only the name marker survives", async () => {
		localStorage.setItem("fretboard.showroom.document", "moved.pdf");

		renderProvider();

		await waitFor(() =>
			expect(screen.getByTestId("unavailable")).toHaveTextContent("moved.pdf"),
		);
		expect(screen.getByTestId("doc")).toHaveTextContent("none");
	});

	it("persists on open and forgets on close", async () => {
		renderProvider();

		fireEvent.click(screen.getByText("open"));
		expect(screen.getByTestId("doc")).toHaveTextContent("score.pdf");
		await waitFor(async () =>
			expect((await loadStoredDocument())?.name).toBe("score.pdf"),
		);

		fireEvent.click(screen.getByText("close"));
		expect(screen.getByTestId("doc")).toHaveTextContent("none");
		await waitFor(async () => expect(await loadStoredDocument()).toBeNull());
	});
});

function RecentProbe() {
	const { currentDocument, recentDocuments, openDocument, openRecentDocument } =
		useShowroom();
	return (
		<div>
			<span data-testid="doc">{currentDocument?.name ?? "none"}</span>
			<span data-testid="recent">
				{recentDocuments.map((d) => d.name).join(",") || "none"}
			</span>
			<button
				type="button"
				onClick={() =>
					openDocument(
						new File(["%PDF body"], "score.pdf", { type: "application/pdf" }),
					)
				}
			>
				open
			</button>
			{recentDocuments.map((d) => (
				<button
					key={d.id}
					type="button"
					data-testid={`reopen-${d.name}`}
					onClick={() => openRecentDocument(d.id)}
				>
					reopen {d.name}
				</button>
			))}
		</div>
	);
}

describe("ShowroomContext recent files", () => {
	function renderRecent() {
		return render(
			<ShowroomProvider>
				<RecentProbe />
			</ShowroomProvider>,
		);
	}

	it("remembers an opened document and re-opens it from history", async () => {
		renderRecent();

		fireEvent.click(screen.getByText("open"));
		await waitFor(() =>
			expect(screen.getByTestId("recent")).toHaveTextContent("score.pdf"),
		);

		// Re-opening from history shows the document again.
		fireEvent.click(screen.getByTestId("reopen-score.pdf"));
		await waitFor(() =>
			expect(screen.getByTestId("doc")).toHaveTextContent("score.pdf"),
		);
	});

	it("drops a history entry whose bytes can no longer be read", async () => {
		// Seed a history entry, then wipe IndexedDB so its bytes are gone.
		await addRecentDocument(
			"ghost.pdf",
			new File(["%PDF"], "ghost.pdf", { type: "application/pdf" }),
		);
		const bytesGone = new IDBFactory();

		renderRecent();
		await waitFor(() =>
			expect(screen.getByTestId("recent")).toHaveTextContent("ghost.pdf"),
		);

		globalThis.indexedDB = bytesGone;
		fireEvent.click(screen.getByTestId("reopen-ghost.pdf"));

		// The unreadable entry is removed and no document opens.
		await waitFor(() =>
			expect(screen.getByTestId("recent")).toHaveTextContent("none"),
		);
		expect(screen.getByTestId("doc")).toHaveTextContent("none");
	});
});
