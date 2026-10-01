import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioControlPanel } from "@/components/AudioControlPanel";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { NotePlaybackProvider } from "@/hooks/NotePlaybackContext";

// Force per-device routing "supported" so the panel renders its source rows
// (jsdom has no AudioContext, so the real detection would report unsupported).
vi.mock("@/audio/devices", async (importActual) => {
	const actual = await importActual<typeof import("@/audio/devices")>();
	return {
		...actual,
		isOutputRoutingSupported: () => true,
		listOutputDevices: async () => [
			actual.DEFAULT_OUTPUT,
			{ deviceId: "headphones", label: "Headphones" },
		],
		revealDeviceLabels: async () => true,
	};
});

async function renderPanel() {
	await act(async () => {
		render(
			<AudioDevicesProvider>
				<MetronomeProvider>
					<MediaPlayerProvider>
						<NotePlaybackProvider>
							<AudioControlPanel />
						</NotePlaybackProvider>
					</MediaPlayerProvider>
				</MetronomeProvider>
			</AudioDevicesProvider>,
		);
	});
}

describe("AudioControlPanel", () => {
	it("renders a routing row for track, metronome, and notes", async () => {
		await renderPanel();
		fireEvent.click(screen.getByText("Audio"));

		expect(screen.getByText("Track")).toBeInTheDocument();
		expect(screen.getByText("Metronome")).toBeInTheDocument();
		expect(screen.getByText("Notes")).toBeInTheDocument();
	});

	it("offers one piano volume control without the old oscillator tones", async () => {
		await renderPanel();
		fireEvent.click(screen.getByText("Audio"));

		expect(screen.getByText("Piano notes")).toBeInTheDocument();
		expect(screen.getByText("80%")).toBeInTheDocument();
		expect(screen.getByRole("slider", { name: "Volume" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Plucked" })).toBeNull();
	});
});
