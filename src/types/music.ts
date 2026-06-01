export type NoteName =
	| "C"
	| "C#"
	| "D"
	| "D#"
	| "E"
	| "F"
	| "F#"
	| "G"
	| "G#"
	| "A"
	| "A#"
	| "B";

export type IntervalName =
	| "1"
	| "b2"
	| "2"
	| "b3"
	| "3"
	| "4"
	| "b5"
	| "5"
	| "#5"
	| "6"
	| "b7"
	| "7";

export type DisplayMode = "note" | "interval" | "none";

export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

// A note's written form: a letter plus an accidental offset in semitones
// (-2 = double flat, -1 = flat, 0 = natural, +1 = sharp, +2 = double sharp).
export interface SpelledNote {
	letter: Letter;
	accidental: number;
}

export interface NoteSet {
	notes: SpelledNote[];
	root?: SpelledNote;
}

export interface FretPosition {
	string: number; // 1..stringCount (1 = highest pitch, stringCount = lowest pitch)
	fret: number; // 0-22
	note: NoteName; // pitch class — the math identity
	spelled: SpelledNote; // how to label this position
	interval?: IntervalName;
}

export interface ParseResult {
	success: true;
	noteSet: NoteSet;
}

export interface ParseError {
	success: false;
	error: string;
}

export type ParseOutput = ParseResult | ParseError;

export interface BoxPattern {
	index: number;
	positions: FretPosition[];
	minFret: number;
	maxFret: number;
}

// Open note of each string, LOW → HIGH (index 0 = lowest-pitched string).
export type Tuning = NoteName[];

export interface InstrumentPreset {
	id: string;
	name: string;
	tuning: Tuning;
}
