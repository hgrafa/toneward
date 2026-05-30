import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { generateBoxPatterns, mapNotesToFretboard } from "@/core/fretboard";
import { INSTRUMENTS, matchInstrument } from "@/core/instruments";
import { parseInput } from "@/core/parser";
import { loadTuningState, saveTuningState } from "@/lib/tuningStorage";
import type {
	BoxPattern,
	DisplayMode,
	FretPosition,
	NoteName,
	NoteSet,
	ParseError,
	Tuning,
} from "@/types/music";

interface FretboardState {
	inputText: string;
	displayMode: DisplayMode;
	highlightRoot: boolean;
	fretRange: [number, number];
	notesPerString: 2 | 3;
	noteSet: NoteSet | null;
	positions: FretPosition[];
	boxPatterns: BoxPattern[];
	parseError: string | null;
	setInputText: (text: string) => void;
	setDisplayMode: (mode: DisplayMode) => void;
	setHighlightRoot: (highlight: boolean) => void;
	setFretRange: (range: [number, number]) => void;
	setNotesPerString: (n: 2 | 3) => void;
	tuning: Tuning;
	instrumentId: string;
	setInstrument: (id: string) => void;
	setStringTuning: (stringIndex: number, note: NoteName) => void;
	setStringCount: (n: number) => void;
}

const FretboardContext = createContext<FretboardState | null>(null);

const DEFAULT_INPUT = "root: A\n1 b3 4 5 b7";

export function FretboardProvider({ children }: { children: ReactNode }) {
	const [inputText, setInputText] = useState(DEFAULT_INPUT);
	const [displayMode, setDisplayMode] = useState<DisplayMode>("note");
	const [highlightRoot, setHighlightRoot] = useState(true);
	const [fretRange, setFretRange] = useState<[number, number]>([0, 12]);
	const [notesPerString, setNotesPerString] = useState<2 | 3>(2);
	const [tuning, setTuning] = useState<Tuning>(() => loadTuningState().tuning);
	const instrumentId = useMemo(() => matchInstrument(tuning), [tuning]);

	useEffect(() => {
		saveTuningState({ instrumentId, tuning });
	}, [instrumentId, tuning]);

	const setInstrument = useCallback((id: string) => {
		const inst = INSTRUMENTS.find((i) => i.id === id);
		if (!inst) return;
		setTuning([...inst.tuning]);
	}, []);

	const setStringTuning = useCallback((stringIndex: number, note: NoteName) => {
		setTuning((prev) => {
			const next = [...prev];
			next[stringIndex] = note;
			return next;
		});
	}, []);

	const setStringCount = useCallback((n: number) => {
		const count = Math.max(1, Math.min(12, n));
		setTuning((prev) => {
			if (count === prev.length) return prev;
			if (count < prev.length) {
				// drop lowest strings (start of the low→high array)
				return prev.slice(prev.length - count);
			}
			const toAdd = count - prev.length;
			return [...(Array(toAdd).fill("E") as NoteName[]), ...prev];
		});
	}, []);

	const parsed = useMemo(() => parseInput(inputText), [inputText]);

	const noteSet = parsed.success ? parsed.noteSet : null;
	const parseError = parsed.success ? null : (parsed as ParseError).error;

	const positions = useMemo(() => {
		if (!noteSet) return [];
		return mapNotesToFretboard(noteSet, tuning, fretRange);
	}, [noteSet, tuning, fretRange]);

	const boxPatterns = useMemo(() => {
		if (!noteSet) return [];
		return generateBoxPatterns(noteSet, tuning, notesPerString);
	}, [noteSet, tuning, notesPerString]);

	const handleSetInputText = useCallback((text: string) => {
		setInputText(text);
	}, []);

	const handleSetDisplayMode = useCallback((mode: DisplayMode) => {
		setDisplayMode(mode);
	}, []);

	const handleSetHighlightRoot = useCallback((highlight: boolean) => {
		setHighlightRoot(highlight);
	}, []);

	const handleSetFretRange = useCallback((range: [number, number]) => {
		setFretRange(range);
	}, []);

	const handleSetNotesPerString = useCallback((n: 2 | 3) => {
		setNotesPerString(n);
	}, []);

	const value = useMemo<FretboardState>(
		() => ({
			inputText,
			displayMode,
			highlightRoot,
			fretRange,
			notesPerString,
			noteSet,
			positions,
			boxPatterns,
			parseError,
			setInputText: handleSetInputText,
			setDisplayMode: handleSetDisplayMode,
			setHighlightRoot: handleSetHighlightRoot,
			setFretRange: handleSetFretRange,
			setNotesPerString: handleSetNotesPerString,
			tuning,
			instrumentId,
			setInstrument,
			setStringTuning,
			setStringCount,
		}),
		[
			inputText,
			displayMode,
			highlightRoot,
			fretRange,
			notesPerString,
			noteSet,
			positions,
			boxPatterns,
			parseError,
			handleSetInputText,
			handleSetDisplayMode,
			handleSetHighlightRoot,
			handleSetFretRange,
			handleSetNotesPerString,
			tuning,
			instrumentId,
			setInstrument,
			setStringTuning,
			setStringCount,
		],
	);

	return (
		<FretboardContext.Provider value={value}>
			{children}
		</FretboardContext.Provider>
	);
}

export function useFretboard(): FretboardState {
	const context = useContext(FretboardContext);
	if (!context) {
		throw new Error("useFretboard must be used within a FretboardProvider");
	}
	return context;
}
