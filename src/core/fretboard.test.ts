import { describe, expect, it } from "vitest";
import type { NoteSet, Tuning } from "@/types/music";
import {
	generateBoxPatterns,
	getNoteAtPosition,
	mapNotesToFretboard,
} from "./fretboard";

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"];
const BASS4: Tuning = ["E", "A", "D", "G"];

describe("getNoteAtPosition", () => {
	it("returns the open note at fret 0", () => {
		expect(getNoteAtPosition(GUITAR, 0, 0)).toBe("E");
		expect(getNoteAtPosition(GUITAR, 1, 0)).toBe("A");
	});

	it("adds semitones for higher frets, wrapping the octave", () => {
		expect(getNoteAtPosition(GUITAR, 0, 5)).toBe("A");
		expect(getNoteAtPosition(GUITAR, 0, 12)).toBe("E");
	});
});

describe("mapNotesToFretboard", () => {
	it("uses string numbers 1..stringCount with 1 = highest pitch", () => {
		const noteSet: NoteSet = { notes: ["E"] };
		const positions = mapNotesToFretboard(noteSet, GUITAR, [0, 0]);
		const strings = positions.map((p) => p.string).sort((a, b) => a - b);
		expect(strings).toEqual([1, 6]);
	});

	it("adapts to a 4-string tuning", () => {
		const noteSet: NoteSet = { notes: ["E", "A", "D", "G"] };
		const positions = mapNotesToFretboard(noteSet, BASS4, [0, 0]);
		expect(positions.map((p) => p.string).sort((a, b) => a - b)).toEqual([
			1, 2, 3, 4,
		]);
	});

	it("places higher-pitched strings at lower string numbers", () => {
		// On guitar, open B is the 2nd-highest string → string 2; open low E → string 6
		const positions = mapNotesToFretboard(
			{ notes: ["B", "E"] },
			GUITAR,
			[0, 0],
		);
		const openB = positions.find((p) => p.note === "B" && p.fret === 0);
		expect(openB?.string).toBe(2);
		// the two open-E strings are 1 (high) and 6 (low)
		const eStrings = positions
			.filter((p) => p.note === "E" && p.fret === 0)
			.map((p) => p.string)
			.sort((a, b) => a - b);
		expect(eStrings).toEqual([1, 6]);
	});

	it("computes intervals relative to the root", () => {
		const noteSet: NoteSet = { notes: ["E", "G"], root: "E" };
		const positions = mapNotesToFretboard(noteSet, GUITAR, [0, 3]);
		const g = positions.find((p) => p.note === "G");
		expect(g?.interval).toBe("b3");
	});
});

describe("generateBoxPatterns", () => {
	it("generates patterns referenced off the lowest string for any tuning", () => {
		const noteSet: NoteSet = { notes: ["A", "C", "D", "E", "G"], root: "A" };
		const guitarBoxes = generateBoxPatterns(noteSet, GUITAR, 2);
		const bassBoxes = generateBoxPatterns(noteSet, BASS4, 2);
		expect(guitarBoxes.length).toBeGreaterThan(0);
		expect(bassBoxes.length).toBeGreaterThan(0);
		expect(
			guitarBoxes[0].positions.every((p) => p.string >= 1 && p.string <= 6),
		).toBe(true);
		expect(
			bassBoxes[0].positions.every((p) => p.string >= 1 && p.string <= 4),
		).toBe(true);
		expect(
			bassBoxes.every((box) => box.positions.every((p) => p.string <= 4)),
		).toBe(true);
	});
});
