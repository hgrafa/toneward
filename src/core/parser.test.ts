import { describe, expect, it } from "vitest";
import { formatSpelled } from "./notes";
import { parseInput } from "./parser";

function labels(out: ReturnType<typeof parseInput>): string[] {
	if (!out.success)
		throw new Error(`expected success, got ${JSON.stringify(out.error)}`);
	return out.noteSet.notes.map(formatSpelled);
}

describe("parseInput — notes mode", () => {
	it("preserves the written accidentals", () => {
		expect(labels(parseInput("C E G Bb"))).toEqual(["C", "E", "G", "Bb"]);
	});

	it("dedupes by pitch class", () => {
		expect(labels(parseInput("C C E"))).toEqual(["C", "E"]);
	});

	it("dedupes enharmonic equivalents by pitch class", () => {
		expect(labels(parseInput("C# Db"))).toEqual(["C#"]);
	});

	it("rejects an invalid note", () => {
		expect(parseInput("C H")).toEqual({
			success: false,
			error: { code: "INVALID_NOTE", token: "H" },
		});
	});
});

describe("parseInput — intervals mode", () => {
	it("spells each degree on its own letter (A minor pentatonic)", () => {
		const out = parseInput("root: A\n1 b3 4 5 b7");
		expect(labels(out)).toEqual(["A", "C", "D", "E", "G"]);
		if (out.success)
			expect(out.noteSet.root).toEqual({ letter: "A", accidental: 0 });
	});

	it("uses flats for a flat key (Db major)", () => {
		expect(labels(parseInput("root: Db\n1 2 3 4 5 6 7"))).toEqual([
			"Db",
			"Eb",
			"F",
			"Gb",
			"Ab",
			"Bb",
			"C",
		]);
	});

	it("caps accidentals at one, avoiding double flats (Db b2 → Db D)", () => {
		expect(labels(parseInput("root: Db\n1 b2"))).toEqual(["Db", "D"]);
	});

	it("rejects an invalid interval", () => {
		expect(parseInput("root: A\n1 b9")).toEqual({
			success: false,
			error: { code: "INVALID_INTERVAL", token: "b9" },
		});
	});

	it("rejects an invalid root", () => {
		expect(parseInput("root: H\n1 3 5")).toEqual({
			success: false,
			error: { code: "INVALID_ROOT_NOTE", token: "H" },
		});
	});
});

describe("parseInput — errors", () => {
	it("rejects empty input", () => {
		expect(parseInput("   ")).toEqual({
			success: false,
			error: { code: "EMPTY_INPUT" },
		});
	});
});
