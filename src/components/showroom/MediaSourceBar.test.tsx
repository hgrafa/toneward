import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShowroomProvider, useShowroom } from "@/hooks/ShowroomContext";
import { MediaSourceBar } from "./MediaSourceBar";

vi.mock("@/lib/youtube", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/youtube")>();
	return { ...actual, fetchYouTubeTitle: vi.fn(async () => null) };
});

function Probe() {
	const { audioSource } = useShowroom();
	return <span data-testid="source">{audioSource?.kind ?? "none"}</span>;
}

function setup() {
	return render(
		<ShowroomProvider>
			<MediaSourceBar />
			<Probe />
		</ShowroomProvider>,
	);
}

describe("MediaSourceBar", () => {
	it("loads a valid YouTube URL as the audio source", async () => {
		setup();
		fireEvent.change(screen.getByPlaceholderText(/youtube/i), {
			target: { value: "https://youtu.be/dQw4w9WgXcQ" },
		});
		fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByTestId("source")).toHaveTextContent("youtube"),
		);
	});

	it("shows an error for an invalid YouTube URL", () => {
		setup();
		fireEvent.change(screen.getByPlaceholderText(/youtube/i), {
			target: { value: "https://vimeo.com/1" },
		});
		fireEvent.click(screen.getByRole("button", { name: /load/i }));
		expect(screen.getByText(/valid youtube/i)).toBeInTheDocument();
		expect(screen.getByTestId("source")).toHaveTextContent("none");
	});
});
