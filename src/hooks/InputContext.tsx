import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { parseInput } from "@/core/parser";
import type { ErrorCode, NoteSet } from "@/types/music";

interface InputState {
	inputText: string;
	noteSet: NoteSet | null;
	parseError: string | null;
	setInputText: (text: string) => void;
}

const InputContext = createContext<InputState | null>(null);

const DEFAULT_INPUT = "root: A\n1 b3 4 5 b7";

const ERROR_KEY: Record<ErrorCode, string> = {
	EMPTY_INPUT: "errors.emptyInput",
	NO_VALID_NOTES: "errors.noValidNotes",
	INVALID_NOTE: "errors.invalidNote",
	MISSING_ROOT: "errors.missingRoot",
	INVALID_ROOT_NOTE: "errors.invalidRootNote",
	NO_INTERVALS: "errors.noIntervals",
	INVALID_INTERVAL: "errors.invalidInterval",
};

export function InputProvider({ children }: { children: ReactNode }) {
	const [inputText, setInputText] = useState(DEFAULT_INPUT);
	const { t } = useTranslation();

	const parsed = useMemo(() => parseInput(inputText), [inputText]);
	const noteSet = parsed.success ? parsed.noteSet : null;
	const parseError = parsed.success
		? null
		: t(ERROR_KEY[parsed.error.code], { token: parsed.error.token });

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
