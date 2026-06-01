import { createContext, type ReactNode, useContext, useMemo } from "react";
import { generateBoxPatterns, mapNotesToFretboard } from "@/core/fretboard";
import type { BoxPattern, FretPosition } from "@/types/music";
import { useDisplay } from "./DisplayContext";
import { useInput } from "./InputContext";
import { useInstrument } from "./InstrumentContext";

interface DerivedState {
	positions: FretPosition[];
	boxPatterns: BoxPattern[];
}

const DerivedContext = createContext<DerivedState | null>(null);

export function DerivedProvider({ children }: { children: ReactNode }) {
	const { noteSet } = useInput();
	const { tuning } = useInstrument();
	const { fretRange, notesPerString } = useDisplay();

	const positions = useMemo(() => {
		if (!noteSet) return [];
		return mapNotesToFretboard(noteSet, tuning, fretRange);
	}, [noteSet, tuning, fretRange]);

	const boxPatterns = useMemo(() => {
		if (!noteSet) return [];
		return generateBoxPatterns(noteSet, tuning, notesPerString);
	}, [noteSet, tuning, notesPerString]);

	const value = useMemo<DerivedState>(
		() => ({ positions, boxPatterns }),
		[positions, boxPatterns],
	);

	return (
		<DerivedContext.Provider value={value}>{children}</DerivedContext.Provider>
	);
}

export function useDerived(): DerivedState {
	const ctx = useContext(DerivedContext);
	if (!ctx) {
		throw new Error("useDerived must be used within a FretboardProvider");
	}
	return ctx;
}
