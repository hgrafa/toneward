import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioControlPanel } from "@/components/AudioControlPanel";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";

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

function renderPanel() {
	return render(
		<AudioDevicesProvider>
			<MetronomeProvider>
				<MediaPlayerProvider>
					<AudioControlPanel />
				</MediaPlayerProvider>
			</MetronomeProvider>
		</AudioDevicesProvider>,
	);
}

describe("AudioControlPanel", () => {
	it("renders a routing row for both the track and the metronome", () => {
		renderPanel();
		fireEvent.click(screen.getByText("Audio"));

		expect(screen.getByText("Track")).toBeInTheDocument();
		expect(screen.getByText("Metronome")).toBeInTheDocument();
	});
});
