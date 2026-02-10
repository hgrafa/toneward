import type { NoteName, ParseOutput } from "@/types/music";
import { isValidInterval, normalizeNote, resolveInterval } from "./notes";

/**
 * Parses user input text into a NoteSet.
 *
 * Supported formats:
 *   Notes mode:     "C E G Bb"
 *   Intervals mode: "root: G\n1 b3 4 5 b7"
 */
export function parseInput(text: string): ParseOutput {
	const trimmed = text.trim();
	if (!trimmed) {
		return { success: false, error: "Empty input" };
	}

	const lines = trimmed
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	// Check for root declaration
	const rootLine = lines.find((l) => l.toLowerCase().startsWith("root:"));

	if (rootLine) {
		return parseIntervalsMode(lines, rootLine);
	}

	return parseNotesMode(lines.join(" "));
}

function parseNotesMode(text: string): ParseOutput {
	const tokens = text.split(/[\s,]+/).filter(Boolean);
	const notes: NoteName[] = [];

	for (const token of tokens) {
		const note = normalizeNote(token);
		if (!note) {
			return { success: false, error: `Invalid note: "${token}"` };
		}
		if (!notes.includes(note)) {
			notes.push(note);
		}
	}

	if (notes.length === 0) {
		return { success: false, error: "No valid notes found" };
	}

	return { success: true, noteSet: { notes } };
}

function parseIntervalsMode(lines: string[], rootLine: string): ParseOutput {
	const rootValue = rootLine.split(":")[1]?.trim();
	if (!rootValue) {
		return { success: false, error: "Missing root note after 'root:'" };
	}

	const root = normalizeNote(rootValue);
	if (!root) {
		return { success: false, error: `Invalid root note: "${rootValue}"` };
	}

	const intervalLines = lines.filter(
		(l) => !l.toLowerCase().startsWith("root:"),
	);
	const intervalText = intervalLines.join(" ");
	const tokens = intervalText.split(/[\s,]+/).filter(Boolean);

	if (tokens.length === 0) {
		return { success: false, error: "No intervals provided" };
	}

	const notes: NoteName[] = [];
	for (const token of tokens) {
		if (!isValidInterval(token)) {
			return { success: false, error: `Invalid interval: "${token}"` };
		}
		const note = resolveInterval(root, token);
		if (!notes.includes(note)) {
			notes.push(note);
		}
	}

	return { success: true, noteSet: { notes, root } };
}
