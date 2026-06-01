import type {
	BoxPattern,
	FretPosition,
	NoteName,
	NoteSet,
	SpelledNote,
	Tuning,
} from "@/types/music";
import {
	CHROMATIC,
	intervalBetween,
	noteIndex,
	spelledToPitchClass,
} from "./notes";

const MAX_FRETS = 22;

// stringIndex = index into tuning (0 = lowest-pitched string).
export function getNoteAtPosition(
	tuning: Tuning,
	stringIndex: number,
	fret: number,
): NoteName {
	const openNote = tuning[stringIndex];
	const semitones = noteIndex(openNote) + fret;
	return CHROMATIC[((semitones % 12) + 12) % 12];
}

export function mapNotesToFretboard(
	noteSet: NoteSet,
	tuning: Tuning,
	fretRange: [number, number] = [0, 12],
): FretPosition[] {
	const [minFret, maxFret] = fretRange;
	const positions: FretPosition[] = [];
	const stringCount = tuning.length;

	const spellingByPc = new Map<NoteName, SpelledNote>();
	for (const s of noteSet.notes) {
		spellingByPc.set(spelledToPitchClass(s), s);
	}
	const rootPc = noteSet.root ? spelledToPitchClass(noteSet.root) : undefined;

	for (let stringIdx = 0; stringIdx < stringCount; stringIdx++) {
		for (let fret = minFret; fret <= Math.min(maxFret, MAX_FRETS); fret++) {
			const note = getNoteAtPosition(tuning, stringIdx, fret);
			const spelled = spellingByPc.get(note);
			if (spelled) {
				const position: FretPosition = {
					string: stringCount - stringIdx, // 1 = highest pitch
					fret,
					note,
					spelled,
				};

				if (rootPc) {
					position.interval = intervalBetween(rootPc, note);
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
 * Algorithm: uses the lowest string (string === tuning.length) as reference.
 * Each box starts at the next scale degree on that string. For other strings,
 * picks the N closest notes to the reference fret position.
 */
export function generateBoxPatterns(
	noteSet: NoteSet,
	tuning: Tuning,
	notesPerString: number = 2,
): BoxPattern[] {
	const stringCount = tuning.length;
	const allPositions = mapNotesToFretboard(noteSet, tuning, [0, 17]);

	const byString = new Map<number, FretPosition[]>();
	for (const pos of allPositions) {
		const list = byString.get(pos.string) ?? [];
		list.push(pos);
		byString.set(pos.string, list);
	}
	for (const list of byString.values()) {
		list.sort((a, b) => a.fret - b.fret);
	}

	const refString = byString.get(stringCount) ?? [];
	const numBoxes = Math.min(
		5,
		Math.max(0, refString.length - notesPerString + 1),
	);
	const boxes: BoxPattern[] = [];

	for (let boxIdx = 0; boxIdx < numBoxes; boxIdx++) {
		const boxPositions: FretPosition[] = [];
		const refStartFret = refString[boxIdx].fret;

		for (let str = stringCount; str >= 1; str--) {
			const notes = byString.get(str) ?? [];
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
