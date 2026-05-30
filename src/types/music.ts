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

export interface NoteSet {
	notes: NoteName[];
	root?: NoteName;
}

export interface FretPosition {
	string: number; // 1..stringCount (1 = highest pitch, stringCount = lowest pitch)
	fret: number; // 0-22
	note: NoteName;
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
