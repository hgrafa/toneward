import { describe, expect, it } from "vitest";
import {
	CUSTOM_ID,
	DEFAULT_INSTRUMENT,
	INSTRUMENTS,
	matchInstrument,
} from "./instruments";

describe("instruments", () => {
	it("defaults to 6-string guitar", () => {
		expect(DEFAULT_INSTRUMENT.id).toBe("guitar-6");
		expect(DEFAULT_INSTRUMENT.tuning).toEqual(["E", "A", "D", "G", "B", "E"]);
	});

	it("ships guitar, bass-4 and bass-5 presets", () => {
		expect(INSTRUMENTS.map((i) => i.id)).toEqual([
			"guitar-6",
			"bass-4",
			"bass-5",
		]);
	});

	it("matches a tuning that equals a preset", () => {
		expect(matchInstrument(["E", "A", "D", "G"])).toBe("bass-4");
		expect(matchInstrument(["B", "E", "A", "D", "G"])).toBe("bass-5");
	});

	it("returns custom for a non-preset tuning", () => {
		expect(matchInstrument(["D", "A", "D", "G", "B", "E"])).toBe(CUSTOM_ID);
		expect(matchInstrument(["E", "A", "D"])).toBe(CUSTOM_ID);
	});
});
