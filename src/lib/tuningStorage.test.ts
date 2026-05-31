import { beforeEach, describe, expect, it } from "vitest";
import { loadTuningState, saveTuningState } from "./tuningStorage";

describe("tuningStorage", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns the default 6-string guitar when nothing is stored", () => {
		const state = loadTuningState();
		expect(state.instrumentId).toBe("guitar-6");
		expect(state.tuning).toEqual(["E", "A", "D", "G", "B", "E"]);
	});

	it("round-trips a saved tuning and derives the instrument id", () => {
		saveTuningState({ instrumentId: "bass-4", tuning: ["E", "A", "D", "G"] });
		const state = loadTuningState();
		expect(state.tuning).toEqual(["E", "A", "D", "G"]);
		expect(state.instrumentId).toBe("bass-4");
	});

	it("derives custom for a non-preset tuning", () => {
		saveTuningState({
			instrumentId: "guitar-6",
			tuning: ["D", "A", "D", "G", "B", "E"],
		});
		expect(loadTuningState().instrumentId).toBe("custom");
	});

	it("falls back to default on corrupt or invalid data", () => {
		localStorage.setItem("fretboard.tuning", "not json");
		expect(loadTuningState().instrumentId).toBe("guitar-6");
		localStorage.setItem(
			"fretboard.tuning",
			JSON.stringify({ tuning: ["Z", "Q"] }),
		);
		expect(loadTuningState().instrumentId).toBe("guitar-6");
		localStorage.setItem("fretboard.tuning", JSON.stringify({ tuning: [] }));
		expect(loadTuningState().instrumentId).toBe("guitar-6");
	});
});
