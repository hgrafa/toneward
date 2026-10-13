import { AppHeader } from "@/components/AppHeader";
import { AccountView } from "@/components/account/AccountView";
import { FloatingNav } from "@/components/FloatingNav";
import { FretboardView } from "@/components/FretboardView";
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { PracticeView } from "@/components/practice/PracticeView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { AuthProvider } from "@/hooks/AuthContext";
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
	const { view } = useView();

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<AppHeader />
			<div className="relative flex-1 overflow-hidden">
				<main className="h-full overflow-y-auto">
					{view === "fretboard" && <FretboardView />}
					{view === "showroom" && <ShowroomView />}
					{view === "practice" && <PracticeView />}
					{view === "account" && <AccountView />}
				</main>
				<FloatingNav />
				<PersistentPlayer />
			</div>
		</div>
	);
}
