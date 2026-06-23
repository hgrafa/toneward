import { AppHeader } from "@/components/AppHeader";
import { FloatingNav } from "@/components/FloatingNav";
import { FretboardView } from "@/components/FretboardView";
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { PracticeView } from "@/components/practice/PracticeView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { ShowroomProvider } from "@/hooks/ShowroomContext";
import { StudyTimerProvider } from "@/hooks/StudyTimerContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { useView, ViewProvider } from "@/hooks/ViewContext";

export default function App() {
	return (
		<ViewProvider>
			<FretboardProvider>
				<AudioDevicesProvider>
					<MetronomeProvider>
						<ShowroomProvider>
							<MediaPlayerProvider>
								<StudyTimerProvider>
									<AppShell />
								</StudyTimerProvider>
							</MediaPlayerProvider>
						</ShowroomProvider>
					</MetronomeProvider>
				</AudioDevicesProvider>
			</FretboardProvider>
		</ViewProvider>
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
				</main>
				<FloatingNav />
				<PersistentPlayer />
			</div>
		</div>
	);
}
