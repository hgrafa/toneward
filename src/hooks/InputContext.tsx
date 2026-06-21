import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { parseInput } from "@/core/parser";
import type { ErrorCode, NoteSet, ParseError } from "@/types/music";

export type ParseErrorValue = { code: ErrorCode; token?: string };

interface InputState {
	inputText: string;
	noteSet: NoteSet | null;
	parseError: ParseErrorValue | null;
	setInputText: (text: string) => void;
}

const InputContext = createContext<InputState | null>(null);

const DEFAULT_INPUT = "root: A\n1 b3 4 5 b7";

export function InputProvider({ children }: { children: ReactNode }) {
	const [inputText, setInputText] = useState(DEFAULT_INPUT);

	const parsed = useMemo(() => parseInput(inputText), [inputText]);
	const noteSet = parsed.success ? parsed.noteSet : null;
	const parseError = parsed.success ? null : (parsed as ParseError).error;

	const value = useMemo<InputState>(
		() => ({ inputText, noteSet, parseError, setInputText }),
		[inputText, noteSet, parseError],
	);

	return (
		<InputContext.Provider value={value}>{children}</InputContext.Provider>
	);
}

export function useInput(): InputState {
	const ctx = useContext(InputContext);
	if (!ctx) {
		throw new Error("useInput must be used within a FretboardProvider");
	}
	return ctx;
}
