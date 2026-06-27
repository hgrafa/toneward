import type { NoteName, Tuning } from "@/types/music";
import { CHROMATIC, noteIndex } from "./notes";

// A sounding pitch: a pitch class plus an octave number (scientific pitch
// notation, where middle C is C4). Spelling is intentionally NOT part of a
// Pitch — how a note is written depends on musical context (the note set),
// whereas a Pitch is an absolute, orderable sound. Use this as the foundation
// for future audio playback and pitch sorting.
export interface Pitch {
	note: NoteName;
	octave: number;
}

// Assign octaves to a low→high tuning. The octave increments whenever the next
// string's pitch class does not rise above the previous one (the normal case
// for ascending tunings). baseOctave is the octave of the lowest string.
export function assignOctaves(tuning: Tuning, baseOctave = 2): Pitch[] {
	const pitches: Pitch[] = [];
	let octave = baseOctave;
	let prevIdx = -1;
	for (const note of tuning) {
		const idx = noteIndex(note);
		if (prevIdx !== -1 && idx <= prevIdx) octave += 1;
		pitches.push({ note, octave });
		prevIdx = idx;
	}
	return pitches;
}

export function getPitchAtPosition(
	tuning: Tuning,
	stringIndex: number,
	fret: number,
	baseOctave = 2,
): Pitch {
	const open = assignOctaves(tuning, baseOctave)[stringIndex];
	const semitones = noteIndex(open.note) + fret;
	const note = CHROMATIC[((semitones % 12) + 12) % 12];
	const octave = open.octave + Math.floor(semitones / 12);
	return { note, octave };
}

// MIDI note number: C4 = 60, A4 = 69.
export function midiNumber(pitch: Pitch): number {
	return (pitch.octave + 1) * 12 + noteIndex(pitch.note);
}

// Equal-tempered frequency (Hz) of a MIDI note number, anchored at A4 = 440 Hz.
export function midiToFreq(midi: number): number {
	return 440 * 2 ** ((midi - 69) / 12);
}
