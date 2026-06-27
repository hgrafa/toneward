import type { FretPosition, Tuning } from "@/types/music";
import { getPitchAtPosition, midiNumber, type Pitch } from "./pitch";

// How a box pattern is played back through the scale. "up-down" is the default
// practice run (ascend then descend); the one-way modes let you drill a single
// direction.
export type PlaybackDirection = "up" | "down" | "up-down";

// Map a box pattern's fret positions to sounding pitches, sorted low→high and
// de-duped by pitch so unisons (the same note on two strings) don't stutter the
// run. FretPosition.string is 1 = highest-pitched string … stringCount = lowest;
// the tuning array is the reverse (index 0 = lowest), hence the flip.
export function pitchesForBox(
	positions: FretPosition[],
	tuning: Tuning,
): Pitch[] {
	const stringCount = tuning.length;
	const byMidi = new Map<number, Pitch>();
	for (const pos of positions) {
		const stringIndex = stringCount - pos.string;
		const pitch = getPitchAtPosition(tuning, stringIndex, pos.fret);
		byMidi.set(midiNumber(pitch), pitch);
	}
	return [...byMidi.values()].sort((a, b) => midiNumber(a) - midiNumber(b));
}

// Order an ascending pitch list for playback. "up-down" ascends then descends
// without repeating the top note, closing back on the root, e.g. C D E → C D E
// D C. A single pitch is never duplicated.
export function orderForDirection(
	ascending: Pitch[],
	direction: PlaybackDirection,
): Pitch[] {
	if (direction === "up") return [...ascending];
	if (direction === "down") return [...ascending].reverse();
	// up-down
	const down = [...ascending].reverse().slice(1);
	return [...ascending, ...down];
}

// Convenience: derive a box pattern's pitches and order them for playback.
export function boxPlaybackSequence(
	positions: FretPosition[],
	tuning: Tuning,
	direction: PlaybackDirection,
): Pitch[] {
	return orderForDirection(pitchesForBox(positions, tuning), direction);
}
