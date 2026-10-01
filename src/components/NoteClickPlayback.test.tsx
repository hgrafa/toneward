import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { NotePlaybackProvider } from "@/hooks/NotePlaybackContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import type { BoxPattern } from "@/types/music";
import { BoxFretboard } from "./BoxFretboard";
import { Fretboard } from "./Fretboard";

const audio = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));

vi.mock("@/audio/notePlayer", () => ({
	NotePlayer: class {
		onNote = null;
		onEnd = null;
		configure() {}
		play(pitches: unknown) {
			audio.play(pitches);
			return Promise.resolve();
		}
		stop() {
			audio.stop();
		}
		dispose() {
			return Promise.resolve();
		}
		setOutputDevice() {
			return Promise.resolve();
		}
	},
}));

function withPlayback(ui: React.ReactNode) {
	return render(
		<AudioDevicesProvider>
			<NotePlaybackProvider>{ui}</NotePlaybackProvider>
		</AudioDevicesProvider>,
	);
}

describe("note click playback", () => {
	beforeEach(() => {
		localStorage.clear();
		audio.play.mockClear();
		audio.stop.mockClear();
	});

	it("plays the sounding pitch from the main fretboard", () => {
		withPlayback(
			<FretboardProvider>
				<Fretboard />
			</FretboardProvider>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /A.*string 1.*fret 5/i }),
		);
		expect(audio.play).toHaveBeenCalledWith([{ note: "A", octave: 4 }]);
	});

	it("plays the sounding pitch from a box diagram", () => {
		const pattern: BoxPattern = {
			index: 0,
			minFret: 5,
			maxFret: 5,
			positions: [
				{
					string: 1,
					fret: 5,
					note: "A",
					spelled: { letter: "A", accidental: 0 },
				},
			],
		};
		withPlayback(
			<BoxFretboard
				pattern={pattern}
				stringCount={6}
				displayMode="note"
				highlightRoot={false}
				tuning={["E", "A", "D", "G", "B", "E"]}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /A.*string 1.*fret 5/i }),
		);
		expect(audio.play).toHaveBeenCalledWith([{ note: "A", octave: 4 }]);
	});
});
