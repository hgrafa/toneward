import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { StudyTimerProvider } from "@/hooks/StudyTimerContext";
import { ViewProvider } from "@/hooks/ViewContext";

function renderHeader() {
	return render(
		<ViewProvider>
			<AudioDevicesProvider>
				<MetronomeProvider>
					<StudyTimerProvider>
						<AppHeader />
					</StudyTimerProvider>
				</MetronomeProvider>
			</AudioDevicesProvider>
		</ViewProvider>,
	);
}

describe("AppHeader", () => {
	it("shows the brand lockup and the current section name", () => {
		renderHeader();
		expect(screen.getByText("Toneward")).toBeInTheDocument();
		// Default view is "fretboard" → section label "Fretboard" (en).
		expect(screen.getByText("Fretboard")).toBeInTheDocument();
	});

	it("renders the global Metronome and Audio controls", () => {
		renderHeader();
		expect(screen.getByText("Metronome")).toBeInTheDocument();
		expect(screen.getByText("Audio")).toBeInTheDocument();
	});
});
