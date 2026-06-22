import { AppSidebar } from "@/components/AppSidebar";
import { FretboardView } from "@/components/FretboardView";
import { PracticeView } from "@/components/practice/PracticeView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { ShowroomProvider } from "@/hooks/ShowroomContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { useView, ViewProvider } from "@/hooks/ViewContext";

export default function App() {
	return (
		<ViewProvider>
			<FretboardProvider>
				<AudioDevicesProvider>
					<MetronomeProvider>
						<ShowroomProvider>
							<AppShell />
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
		<div className="flex h-screen bg-background text-foreground">
			<AppSidebar />
			<main className="flex-1 overflow-y-auto">
				{view === "fretboard" && <FretboardView />}
				{view === "showroom" && <ShowroomView />}
				{view === "practice" && <PracticeView />}
			</main>
		</div>
	);
}
