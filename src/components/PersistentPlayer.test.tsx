import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";

function renderPlayer(ui: ReactNode = <PersistentPlayer />) {
	return render(<MediaPlayerProvider>{ui}</MediaPlayerProvider>);
}

describe("PersistentPlayer", () => {
	it("shows the loader controls when no track is loaded", () => {
		renderPlayer();
		// Expand to reveal the card, then the loader.
		act(() => screen.getByLabelText("Open player").click());
		expect(
			screen.getByPlaceholderText("Paste a YouTube link…"),
		).toBeInTheDocument();
		expect(screen.getByText("Load")).toBeInTheDocument();
	});

	it("mounts a single hidden audio element that persists", () => {
		const { container } = renderPlayer();
		expect(container.querySelectorAll("audio")).toHaveLength(1);
	});
});
