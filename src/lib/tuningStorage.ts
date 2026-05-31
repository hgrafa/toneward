import { DEFAULT_INSTRUMENT, matchInstrument } from "@/core/instruments";
import { CHROMATIC } from "@/core/notes";
import type { NoteName, Tuning } from "@/types/music";

const STORAGE_KEY = "fretboard.tuning";

export interface TuningState {
	instrumentId: string;
	tuning: Tuning;
}

function defaultState(): TuningState {
	return {
		instrumentId: DEFAULT_INSTRUMENT.id,
		tuning: [...DEFAULT_INSTRUMENT.tuning],
	};
}

function isValidTuning(value: unknown): value is Tuning {
	return (
		Array.isArray(value) &&
		value.length >= 1 &&
		value.length <= 12 &&
		value.every((note) => CHROMATIC.includes(note as NoteName))
	);
}

export function loadTuningState(): TuningState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed = JSON.parse(raw);
		if (!isValidTuning(parsed?.tuning)) return defaultState();
		const tuning = parsed.tuning as Tuning;
		return { tuning, instrumentId: matchInstrument(tuning) };
	} catch {
		return defaultState();
	}
}

export function saveTuningState(state: TuningState): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// storage unavailable (private mode / quota) — ignore
	}
}
