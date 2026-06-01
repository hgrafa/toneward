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

const LETTERS: Letter[] = ["A", "B", "C", "D", "E", "F", "G"];

// Pitch-class index (into CHROMATIC, where C = 0) of each natural letter.
const LETTER_PITCH_CLASS: Record<Letter, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

export function spelledToPitchClass(s: SpelledNote): NoteName {
	const pc = (((LETTER_PITCH_CLASS[s.letter] + s.accidental) % 12) + 12) % 12;
	return CHROMATIC[pc];
}

export function formatSpelled(s: SpelledNote): string {
	let suffix = "";
	if (s.accidental === 2) suffix = "x";
	else if (s.accidental === -2) suffix = "bb";
	else if (s.accidental > 0) suffix = "#".repeat(s.accidental);
	else if (s.accidental < 0) suffix = "b".repeat(-s.accidental);
	return s.letter + suffix;
}

// Parse a written note like "Bb", "c#", "G" into a SpelledNote (preserving the
// written accidental). Returns null if the letter or accidentals are invalid.
export function parseSpelledNote(input: string): SpelledNote | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	const letter = trimmed.charAt(0).toUpperCase() as Letter;
	if (!LETTERS.includes(letter)) return null;
	const rest = trimmed.slice(1);
	let accidental = 0;
	for (const ch of rest) {
		if (ch === "#") accidental += 1;
		else if (ch === "b" || ch === "B") accidental -= 1;
		else if (ch === "x") accidental += 2;
		else return null;
	}
	if (accidental < -2 || accidental > 2) return null;
	return { letter, accidental };
}

// Spell a scale degree (1..7) from a root, choosing the accidental so the
// result equals `targetPitchClass`. Letter = root letter advanced (degree-1)
// steps; accidental = signed distance from that letter's natural pitch class.
export function spellDegree(
	root: SpelledNote,
	degree: number,
	targetPitchClass: NoteName,
): SpelledNote {
	const rootLetterIdx = LETTERS.indexOf(root.letter);
	const letter = LETTERS[(rootLetterIdx + (degree - 1)) % 7];
	const naturalPc = LETTER_PITCH_CLASS[letter];
	const targetPc = noteIndex(targetPitchClass);
	let accidental = (((targetPc - naturalPc) % 12) + 12) % 12;
	if (accidental > 6) accidental -= 12;
	return { letter, accidental };
}

export const INTERVAL_DEGREE: Record<IntervalName, number> = {
	"1": 1,
	b2: 2,
	"2": 2,
	b3: 3,
	"3": 3,
	"4": 4,
	b5: 5,
	"5": 5,
	"#5": 5,
	"6": 6,
	b7: 7,
	"7": 7,
};
