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
	string: number; // 1-6 (1 = high E, 6 = low E)
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
