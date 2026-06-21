import { describe, expect, it } from "vitest";
import { resolveInterval } from "@/core/notes";
import type { Tuning } from "@/types/music";
import {
	checkFretboardAnswer,
	generateChallenge,
	nextDuration,
	TIMER_CONFIG,
} from "./practice";

const GUITAR: Tuning = ["E", "A", "D", "G", "B", "E"];

describe("generateChallenge – identify-interval", () => {
	it("has correct answer in options", () => {
		const c = generateChallenge("identify-interval", GUITAR);
		if (c.type !== "identify-interval") throw new Error("wrong type");
		expect(c.options).toContain(c.answer);
		expect(c.options).toHaveLength(3);
	});

	it("target equals resolveInterval(root, answer)", () => {
		const c = generateChallenge("identify-interval", GUITAR);
		if (c.type !== "identify-interval") throw new Error("wrong type");
		expect(resolveInterval(c.root, c.answer)).toBe(c.target);
	});

	it("has 4 unique options", () => {
		const c = generateChallenge("identify-interval", GUITAR);
		if (c.type !== "identify-interval") throw new Error("wrong type");
		expect(new Set(c.options).size).toBe(3);
	});
});

describe("generateChallenge – identify-note", () => {
	it("has correct answer in options", () => {
		const c = generateChallenge("identify-note", GUITAR);
		if (c.type !== "identify-note") throw new Error("wrong type");
		expect(c.options).toContain(c.answer);
		expect(c.options).toHaveLength(3);
	});

	it("answer equals resolveInterval(root, interval)", () => {
		const c = generateChallenge("identify-note", GUITAR);
		if (c.type !== "identify-note") throw new Error("wrong type");
		expect(resolveInterval(c.root, c.interval)).toBe(c.answer);
	});

	it("has 4 unique options", () => {
		const c = generateChallenge("identify-note", GUITAR);
		if (c.type !== "identify-note") throw new Error("wrong type");
		expect(new Set(c.options).size).toBe(3);
	});
});

describe("generateChallenge – fretboard-mark", () => {
	it("returns non-empty correctPositions", () => {
		const c = generateChallenge("fretboard-mark", GUITAR);
		if (c.type !== "fretboard-mark") throw new Error("wrong type");
		expect(c.correctPositions.length).toBeGreaterThan(0);
	});

	it("all correctPositions have the interval note", () => {
		const c = generateChallenge("fretboard-mark", GUITAR);
		if (c.type !== "fretboard-mark") throw new Error("wrong type");
		const target = resolveInterval(c.root, c.interval);
		for (const pos of c.correctPositions) {
			expect(pos.note).toBe(target);
		}
	});
});

describe("checkFretboardAnswer", () => {
	it("accepts exact correct marked positions", () => {
		const c = generateChallenge("fretboard-mark", GUITAR);
		if (c.type !== "fretboard-mark") throw new Error("wrong type");
		const marked = new Set(
			c.correctPositions.map((p) => `${p.string}-${p.fret}`),
		);
		expect(checkFretboardAnswer(c, marked)).toBe(true);
	});

	it("rejects when a position is missing", () => {
		const c = generateChallenge("fretboard-mark", GUITAR);
		if (c.type !== "fretboard-mark") throw new Error("wrong type");
		if (c.correctPositions.length === 0) return;
		const marked = new Set(
			c.correctPositions.map((p) => `${p.string}-${p.fret}`),
		);
		const first = [...marked][0];
		marked.delete(first);
		expect(checkFretboardAnswer(c, marked)).toBe(false);
	});

	it("rejects when an extra position is marked", () => {
		const c = generateChallenge("fretboard-mark", GUITAR);
		if (c.type !== "fretboard-mark") throw new Error("wrong type");
		const marked = new Set(
			c.correctPositions.map((p) => `${p.string}-${p.fret}`),
		);
		marked.add("99-99");
		expect(checkFretboardAnswer(c, marked)).toBe(false);
	});
});

describe("nextDuration", () => {
	it("reduces by step", () => {
		const cfg = TIMER_CONFIG["identify-interval"];
		expect(nextDuration(cfg.start, "identify-interval")).toBe(
			cfg.start - cfg.step,
		);
	});

	it("clamps to minimum", () => {
		const cfg = TIMER_CONFIG["identify-interval"];
		expect(nextDuration(cfg.min, "identify-interval")).toBe(cfg.min);
		expect(nextDuration(cfg.min + cfg.step - 1, "identify-interval")).toBe(
			cfg.min,
		);
	});

	it("fretboard-mark has its own config", () => {
		const cfg = TIMER_CONFIG["fretboard-mark"];
		expect(nextDuration(cfg.start, "fretboard-mark")).toBe(
			cfg.start - cfg.step,
		);
	});
});
