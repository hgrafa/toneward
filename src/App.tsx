import { useRef } from "react";
import { BoxPatterns } from "@/components/BoxPatterns";
import { Editor } from "@/components/Editor";
import { Fretboard } from "@/components/Fretboard";
import { MetronomePanel } from "@/components/MetronomePanel";
import { Toolbar } from "@/components/Toolbar";
import { TuningControls } from "@/components/TuningControls";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { FretboardProvider } from "@/hooks/useFretboardContext";

export default function App() {
	return (
		<FretboardProvider>
			<MetronomeProvider>
				<AppContent />
			</MetronomeProvider>
		</FretboardProvider>
	);
}

function AppContent() {
	const fretboardRef = useRef<HTMLDivElement>(null);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto max-w-5xl space-y-6 p-6">
				<h1 className="text-2xl font-bold tracking-tight">Scale Training</h1>

				<Editor />

				<TuningControls />

				<div className="flex flex-wrap items-center gap-4">
					<Toolbar fretboardRef={fretboardRef} />
					<MetronomePanel />
				</div>

				<div
					ref={fretboardRef}
					className="overflow-x-auto rounded-lg border border-border bg-card p-4"
				>
					<Fretboard />
				</div>

				<BoxPatterns />
			</div>
		</div>
	);
}
