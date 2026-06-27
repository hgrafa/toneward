import { describe, expect, it } from "vitest";
import type { FretPosition, Tuning } from "@/types/music";
import { midiNumber, type Pitch } from "./pitch";
import {
	boxPlaybackSequence,
	orderForDirection,
	pitchesForBox,
} from "./playback";

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"];

// Spelling/note are irrelevant to pitch derivation (which uses tuning + string
// + fret), so a dummy label keeps the fixtures terse.
function pos(string: number, fret: number): FretPosition {
	return { string, fret, note: "C", spelled: { letter: "C", accidental: 0 } };
}

const midis = (pitches: Pitch[]) => pitches.map(midiNumber);

describe("pitchesForBox", () => {
	it("maps positions to sounding pitches sorted low→high", () => {
		// low E open (E2), A string fret 2 (B2), high E open (E4) — shuffled in.
		const positions = [pos(1, 0), pos(6, 0), pos(5, 2)];
		expect(midis(pitchesForBox(positions, GUITAR))).toEqual([40, 47, 64]);
	});

	it("dedupes unisons so a run ascends cleanly", () => {
		// low E string fret 5 (A2) and A string open (A2) are the same pitch.
		const positions = [pos(6, 5), pos(5, 0)];
		expect(midis(pitchesForBox(positions, GUITAR))).toEqual([45]);
	});

	it("returns an empty list for no positions", () => {
		expect(pitchesForBox([], GUITAR)).toEqual([]);
	});
});

describe("orderForDirection", () => {
	const asc: Pitch[] = [
		{ note: "C", octave: 4 },
		{ note: "D", octave: 4 },
		{ note: "E", octave: 4 },
	];

	it("plays ascending for 'up'", () => {
		expect(midis(orderForDirection(asc, "up"))).toEqual([60, 62, 64]);
	});

	it("plays descending for 'down'", () => {
		expect(midis(orderForDirection(asc, "down"))).toEqual([64, 62, 60]);
	});

	it("plays up then down, with the top note once and the root closing", () => {
		expect(midis(orderForDirection(asc, "up-down"))).toEqual([
			60, 62, 64, 62, 60,
		]);
	});

	it("never duplicates a single note in up-down", () => {
		expect(
			midis(orderForDirection([{ note: "A", octave: 4 }], "up-down")),
		).toEqual([69]);
	});

	it("returns an empty sequence for no pitches", () => {
		expect(orderForDirection([], "up-down")).toEqual([]);
	});
});

describe("boxPlaybackSequence", () => {
	it("combines mapping and direction ordering", () => {
		const positions = [pos(6, 0), pos(5, 2), pos(1, 0)]; // E2, B2, E4
		expect(midis(boxPlaybackSequence(positions, GUITAR, "up-down"))).toEqual([
			40, 47, 64, 47, 40,
		]);
	});
});
