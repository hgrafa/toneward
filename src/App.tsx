import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AccountScreen } from "@/components/account/AccountScreen";
import { FloatingNav } from "@/components/FloatingNav";
import { FretboardView } from "@/components/FretboardView";
import { HomeView } from "@/components/home/HomeView";
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { PracticeView } from "@/components/practice/PracticeView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { AuthProvider, useAuth } from "@/hooks/AuthContext";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { NotePlaybackProvider } from "@/hooks/NotePlaybackContext";
import { ShowroomProvider } from "@/hooks/ShowroomContext";
import { StudyTimerProvider } from "@/hooks/StudyTimerContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { useView, ViewProvider } from "@/hooks/ViewContext";

export default function App() {
	return (
		<AuthProvider>
			<ViewProvider>
				<FretboardProvider>
					<AudioDevicesProvider>
						<MetronomeProvider>
							<NotePlaybackProvider>
								<ShowroomProvider>
									<MediaPlayerProvider>
										<StudyTimerProvider>
											<AppShell />
										</StudyTimerProvider>
									</MediaPlayerProvider>
								</ShowroomProvider>
							</NotePlaybackProvider>
						</MetronomeProvider>
					</AudioDevicesProvider>
				</FretboardProvider>
			</ViewProvider>
		</AuthProvider>
	);
}

function AppShell() {
	const { view, setAccountOpen } = useView();
	const { error, recovering, user } = useAuth();
	const signedOut = user === null;

	// A failed auth redirect or a password-reset link lands back here; continue on the account screen.
	// Errors while signed in (e.g. a failed sign-out) show in the header's account menu instead.
	useEffect(() => {
		if ((error && signedOut) || recovering) setAccountOpen(true);
	}, [error, signedOut, recovering, setAccountOpen]);

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<AppHeader />
			<div className="relative flex-1 overflow-hidden">
				<main className="h-full overflow-y-auto">
					{view === "home" && <HomeView />}
					{view === "fretboard" && <FretboardView />}
					{view === "showroom" && <ShowroomView />}
					{view === "practice" && <PracticeView />}
				</main>
				<FloatingNav />
				<PersistentPlayer />
			</div>
			<AccountScreen />
		</div>
	);
}
