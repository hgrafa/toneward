import type { InstrumentPreset, Tuning } from "@/types/music";

export const INSTRUMENTS: InstrumentPreset[] = [
	{ id: "guitar-6", name: "Guitar", tuning: ["E", "A", "D", "G", "B", "E"] },
	{ id: "bass-4", name: "Bass (4)", tuning: ["E", "A", "D", "G"] },
	{ id: "bass-5", name: "Bass (5)", tuning: ["B", "E", "A", "D", "G"] },
];

export const DEFAULT_INSTRUMENT = INSTRUMENTS[0];
export const CUSTOM_ID = "custom";

export function matchInstrument(tuning: Tuning): string {
	for (const inst of INSTRUMENTS) {
		if (
			inst.tuning.length === tuning.length &&
			inst.tuning.every((note, i) => note === tuning[i])
		) {
			return inst.id;
		}
	}
	return CUSTOM_ID;
}
