import { describe, expect, it } from "vitest";
import {
	intervalBetween,
	isValidInterval,
	normalizeNote,
	resolveInterval,
	transpose,
} from "./notes";

describe("normalizeNote", () => {
	it("accepts sharps and naturals as-is", () => {
		expect(normalizeNote("C")).toBe("C");
		expect(normalizeNote("F#")).toBe("F#");
	});

	it("converts flats to sharps", () => {
		expect(normalizeNote("Db")).toBe("C#");
		expect(normalizeNote("Bb")).toBe("A#");
	});

	it("is case-insensitive on the letter", () => {
		expect(normalizeNote("c")).toBe("C");
		expect(normalizeNote("eb")).toBe("D#");
	});

	it("returns null for garbage", () => {
		expect(normalizeNote("H")).toBeNull();
		expect(normalizeNote("")).toBeNull();
	});
});

describe("note math", () => {
	it("transposes with octave wrap", () => {
		expect(transpose("A", 3)).toBe("C");
		expect(transpose("C", -1)).toBe("B");
	});

	it("computes the interval between two notes", () => {
		expect(intervalBetween("A", "C")).toBe("b3");
		expect(intervalBetween("C", "G")).toBe("5");
	});

	it("resolves an interval from a root", () => {
		expect(resolveInterval("A", "b3")).toBe("C");
		expect(resolveInterval("C", "5")).toBe("G");
	});

	it("validates interval tokens", () => {
		expect(isValidInterval("b3")).toBe(true);
		expect(isValidInterval("9")).toBe(false);
	});
});
