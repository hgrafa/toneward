import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { loadStoredDocument, saveStoredDocument } from "@/lib/documentStorage";
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
