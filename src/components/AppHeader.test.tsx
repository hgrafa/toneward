import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/AppHeader";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { AuthProvider } from "@/hooks/AuthContext";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { NotePlaybackProvider } from "@/hooks/NotePlaybackContext";
import { StudyTimerProvider } from "@/hooks/StudyTimerContext";
import { ViewProvider } from "@/hooks/ViewContext";

vi.mock("@/lib/supabase", () => ({ supabase: null }));

function renderHeader() {
	return render(
		<AuthProvider>
			<ViewProvider>
				<AudioDevicesProvider>
					<MetronomeProvider>
						<MediaPlayerProvider>
							<NotePlaybackProvider>
								<StudyTimerProvider>
									<AppHeader />
								</StudyTimerProvider>
							</NotePlaybackProvider>
						</MediaPlayerProvider>
					</MetronomeProvider>
				</AudioDevicesProvider>
			</ViewProvider>
		</AuthProvider>,
	);
}

describe("AppHeader", () => {
	it("shows the brand lockup and the current section name", () => {
		renderHeader();
		expect(screen.getByText("Toneward")).toBeInTheDocument();
		// Default view is "home" → section label "Home" (en).
		expect(screen.getByText("Home")).toBeInTheDocument();
	});

	it("renders the global Metronome and Audio controls", () => {
		renderHeader();
		expect(screen.getByText("Metronome")).toBeInTheDocument();
		expect(screen.getByText("Audio")).toBeInTheDocument();
	});

	it("hides the sign-in button when Supabase isn't configured", () => {
		renderHeader();
		expect(
			screen.queryByRole("button", { name: "Sign in" }),
		).not.toBeInTheDocument();
	});
});
