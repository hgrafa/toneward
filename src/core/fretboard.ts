import type {
	BoxPattern,
	FretPosition,
	NoteName,
	NoteSet,
} from "@/types/music";
import { CHROMATIC, intervalBetween, noteIndex } from "./notes";

// Standard tuning: string 6 (low E) to string 1 (high E)
// Array index 0 = string 6 (low E), index 5 = string 1 (high E)
const STANDARD_TUNING: NoteName[] = ["E", "A", "D", "G", "B", "E"];

const MAX_FRETS = 22;

export function getNoteAtPosition(stringIndex: number, fret: number): NoteName {
	const openNote = STANDARD_TUNING[stringIndex];
	const semitones = noteIndex(openNote) + fret;
	return CHROMATIC[((semitones % 12) + 12) % 12];
}

export function mapNotesToFretboard(
	noteSet: NoteSet,
	fretRange: [number, number] = [0, 12],
): FretPosition[] {
	const [minFret, maxFret] = fretRange;
	const positions: FretPosition[] = [];
	const noteSetLookup = new Set(noteSet.notes);

	for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
		for (let fret = minFret; fret <= Math.min(maxFret, MAX_FRETS); fret++) {
			const note = getNoteAtPosition(stringIdx, fret);
			if (noteSetLookup.has(note)) {
				const position: FretPosition = {
					string: 6 - stringIdx, // Convert to 1-indexed (1=high E, 6=low E)
					fret,
					note,
				};

				if (noteSet.root) {
					position.interval = intervalBetween(noteSet.root, note);
				}

				positions.push(position);
			}
		}
	}

	return positions;
}

// Fret markers: single dot at these frets, double dot at 12
export const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_DOT_FRETS = [12];

/**
 * Generates box patterns (positional regions) from a note set.
 *
 * Algorithm: uses string 6 (low E) as reference. Each box starts at the
 * next scale degree on string 6. For other strings, picks the N closest
 * notes to the reference fret position.
 */
export function generateBoxPatterns(
	noteSet: NoteSet,
	notesPerString: number = 2,
): BoxPattern[] {
	// Generate positions across a wide range to cover all 5 boxes
	const allPositions = mapNotesToFretboard(noteSet, [0, 17]);

	// Group by string, sort by fret
	const byString = new Map<number, FretPosition[]>();
	for (const pos of allPositions) {
		const list = byString.get(pos.string) ?? [];
		list.push(pos);
		byString.set(pos.string, list);
	}
	for (const list of byString.values()) {
		list.sort((a, b) => a.fret - b.fret);
	}

	const refString = byString.get(6) ?? [];
	const numBoxes = Math.min(
		5,
		Math.max(0, refString.length - notesPerString + 1),
	);
	const boxes: BoxPattern[] = [];

	for (let boxIdx = 0; boxIdx < numBoxes; boxIdx++) {
		const boxPositions: FretPosition[] = [];
		const refStartFret = refString[boxIdx].fret;

		for (let str = 6; str >= 1; str--) {
			const notes = byString.get(str) ?? [];
			// Find first note at or near the reference start fret
			let startIdx = notes.findIndex((n) => n.fret >= refStartFret - 1);
			if (startIdx === -1)
				startIdx = Math.max(0, notes.length - notesPerString);

			const end = Math.min(startIdx + notesPerString, notes.length);
			for (let i = startIdx; i < end; i++) {
				boxPositions.push(notes[i]);
			}
		}

		if (boxPositions.length === 0) continue;

		const frets = boxPositions.map((p) => p.fret);
		boxes.push({
			index: boxIdx,
			positions: boxPositions,
			minFret: Math.min(...frets),
			maxFret: Math.max(...frets),
		});
	}

	return boxes;
}
