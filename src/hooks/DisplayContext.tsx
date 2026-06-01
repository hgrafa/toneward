import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import type { DisplayMode } from "@/types/music";

interface DisplayState {
	displayMode: DisplayMode;
	highlightRoot: boolean;
	fretRange: [number, number];
	notesPerString: 2 | 3;
	setDisplayMode: (mode: DisplayMode) => void;
	setHighlightRoot: (highlight: boolean) => void;
	setFretRange: (range: [number, number]) => void;
	setNotesPerString: (n: 2 | 3) => void;
}

const DisplayContext = createContext<DisplayState | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
	const [displayMode, setDisplayMode] = useState<DisplayMode>("note");
	const [highlightRoot, setHighlightRoot] = useState(true);
	const [fretRange, setFretRange] = useState<[number, number]>([0, 12]);
	const [notesPerString, setNotesPerString] = useState<2 | 3>(2);

	const value = useMemo<DisplayState>(
		() => ({
			displayMode,
			highlightRoot,
			fretRange,
			notesPerString,
			setDisplayMode,
			setHighlightRoot,
			setFretRange,
			setNotesPerString,
		}),
		[displayMode, highlightRoot, fretRange, notesPerString],
	);

	return (
		<DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
	);
}

export function useDisplay(): DisplayState {
	const ctx = useContext(DisplayContext);
	if (!ctx) {
		throw new Error("useDisplay must be used within a FretboardProvider");
	}
	return ctx;
}
