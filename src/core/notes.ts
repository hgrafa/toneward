import type { IntervalName, NoteName } from "@/types/music";

export const CHROMATIC: NoteName[] = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
];

const FLAT_TO_SHARP: Record<string, NoteName> = {
	Db: "C#",
	Eb: "D#",
	Fb: "E",
	Gb: "F#",
	Ab: "G#",
	Bb: "A#",
	Cb: "B",
};

const INTERVAL_SEMITONES: Record<IntervalName, number> = {
	"1": 0,
	b2: 1,
	"2": 2,
	b3: 3,
	"3": 4,
	"4": 5,
	b5: 6,
	"5": 7,
	"#5": 8,
	"6": 9,
	b7: 10,
	"7": 11,
};

const SEMITONE_TO_INTERVAL: Record<number, IntervalName> = {
	0: "1",
	1: "b2",
	2: "2",
	3: "b3",
	4: "3",
	5: "4",
	6: "b5",
	7: "5",
	8: "#5",
	9: "6",
	10: "b7",
	11: "7",
};

export function normalizeNote(input: string): NoteName | null {
	const trimmed = input.trim();

	if (CHROMATIC.includes(trimmed as NoteName)) {
		return trimmed as NoteName;
	}

	if (trimmed in FLAT_TO_SHARP) {
		return FLAT_TO_SHARP[trimmed];
	}

	// Handle lowercase input: "c" → "C", "c#" → "C#", "bb" → "A#"
	const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	if (CHROMATIC.includes(capitalized as NoteName)) {
		return capitalized as NoteName;
	}
	if (capitalized in FLAT_TO_SHARP) {
		return FLAT_TO_SHARP[capitalized];
	}

	return null;
}

export function noteIndex(note: NoteName): number {
	return CHROMATIC.indexOf(note);
}

export function transpose(note: NoteName, semitones: number): NoteName {
	const idx = noteIndex(note);
	const newIdx = (((idx + semitones) % 12) + 12) % 12;
	return CHROMATIC[newIdx];
}

export function intervalBetween(root: NoteName, note: NoteName): IntervalName {
	const semitones = (((noteIndex(note) - noteIndex(root)) % 12) + 12) % 12;
	return SEMITONE_TO_INTERVAL[semitones];
}

export function resolveInterval(
	root: NoteName,
	interval: IntervalName,
): NoteName {
	return transpose(root, INTERVAL_SEMITONES[interval]);
}

export function isValidInterval(input: string): input is IntervalName {
	return input in INTERVAL_SEMITONES;
}
