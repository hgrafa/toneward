import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShowroomProvider, useShowroom } from "@/hooks/ShowroomContext";
import { PdfViewer } from "./PdfViewer";

function setup() {
	return render(
		<ShowroomProvider>
			<PdfViewer />
		</ShowroomProvider>,
	);
}

describe("PdfViewer", () => {
	it("shows the empty-state drop zone when no document is loaded", () => {
		setup();
		expect(screen.getByText(/upload a pdf/i)).toBeInTheDocument();
	});

	it("rejects a non-PDF file with an error message", () => {
		setup();
		const input = screen.getByLabelText(/upload a pdf/i) as HTMLInputElement;
		const file = new File(["x"], "notes.txt", { type: "text/plain" });
		fireEvent.change(input, { target: { files: [file] } });
		expect(screen.getByText(/only pdf files/i)).toBeInTheDocument();
	});

	it("renders a viewer once a PDF document is set", () => {
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");

		function Loader() {
			const { setCurrentDocument } = useShowroom();
			return (
				<button
					type="button"
					onClick={() =>
						setCurrentDocument({ name: "score.pdf", objectUrl: "blob:fake" })
					}
				>
					load
				</button>
			);
		}

		render(
			<ShowroomProvider>
				<Loader />
				<PdfViewer />
			</ShowroomProvider>,
		);
		fireEvent.click(screen.getByText("load"));
		expect(screen.getByTitle("score.pdf")).toBeInTheDocument();
	});
});
