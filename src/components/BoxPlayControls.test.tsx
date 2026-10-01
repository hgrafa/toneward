import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { NotePlaybackProvider } from "@/hooks/NotePlaybackContext";
import type { BoxPattern } from "@/types/music";
import { BoxPlayControls } from "./BoxPlayControls";

describe("BoxPlayControls", () => {
	it("keeps the main play action accessible without visible text", () => {
		const pattern: BoxPattern = {
			index: 0,
			minFret: 0,
			maxFret: 0,
			positions: [],
		};
		render(
			<AudioDevicesProvider>
				<NotePlaybackProvider>
					<BoxPlayControls id="box-0" pattern={pattern} tuning={["E"]} />
				</NotePlaybackProvider>
			</AudioDevicesProvider>,
		);
		const play = screen.getByRole("button", { name: "Play up and down" });
		expect(play.textContent).toBe("");
		expect(play.querySelector("svg")).not.toBeNull();
	});
});
