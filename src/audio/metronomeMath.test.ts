import { describe, expect, it } from "vitest";
import {
	beatInterval,
	clampBpm,
	isAccent,
	MAX_BPM,
	MIN_BPM,
	nextBeat,
	tempoMarking,
} from "./metronomeMath";

describe("beatInterval", () => {
	it("is 0.5s at 120 BPM", () => {
		expect(beatInterval(120)).toBe(0.5);
	});
	it("is 1s at 60 BPM", () => {
		expect(beatInterval(60)).toBe(1);
	});
});

describe("isAccent", () => {
	it("accents the downbeat of each bar", () => {
		expect(isAccent(0, 4)).toBe(true);
		expect(isAccent(4, 4)).toBe(true);
	});
	it("does not accent off-beats", () => {
		expect(isAccent(1, 4)).toBe(false);
		expect(isAccent(3, 4)).toBe(false);
	});
	it("treats every beat as a downbeat in a single-beat bar", () => {
		expect(isAccent(0, 1)).toBe(true);
		expect(isAccent(5, 1)).toBe(true);
	});
});

describe("nextBeat", () => {
	it("wraps at the end of the bar", () => {
		expect(nextBeat(0, 4)).toBe(1);
		expect(nextBeat(3, 4)).toBe(0);
	});
});

describe("clampBpm", () => {
	it("clamps below the minimum", () => {
		expect(clampBpm(5)).toBe(MIN_BPM);
	});
	it("clamps above the maximum", () => {
		expect(clampBpm(9999)).toBe(MAX_BPM);
	});
	it("rounds fractional values", () => {
		expect(clampBpm(120.7)).toBe(121);
	});
	it("falls back to the minimum for NaN", () => {
		expect(clampBpm(Number.NaN)).toBe(MIN_BPM);
	});
});

describe("tempoMarking", () => {
	it("labels 97 BPM as Allegretto (matches the reference)", () => {
		expect(tempoMarking(97)).toBe("Allegretto");
	});
	it("labels slow tempos", () => {
		expect(tempoMarking(40)).toBe("Grave");
		expect(tempoMarking(60)).toBe("Largo");
	});
	it("labels fast tempos", () => {
		expect(tempoMarking(130)).toBe("Allegro");
		expect(tempoMarking(200)).toBe("Prestissimo");
	});
	it("uses inclusive upper bounds", () => {
		expect(tempoMarking(95)).toBe("Moderato");
		expect(tempoMarking(96)).toBe("Allegretto");
	});
});
