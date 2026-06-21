import { getNoteAtPosition, mapNotesToFretboard } from "@/core/fretboard";
import { CHROMATIC, resolveInterval } from "@/core/notes";
import type {
	FretPosition,
	IntervalName,
	Letter,
	NoteName,
	Tuning,
} from "@/types/music";

export type ChallengeType =
	| "identify-interval"
	| "identify-note"
	| "fretboard-mark";

export interface IdentifyIntervalChallenge {
	type: "identify-interval";
	root: NoteName;
	target: NoteName;
	answer: IntervalName;
	options: IntervalName[];
}

export interface IdentifyNoteChallenge {
	type: "identify-note";
	root: NoteName;
	interval: IntervalName;
	answer: NoteName;
	options: NoteName[];
}

export interface FretboardMarkChallenge {
	type: "fretboard-mark";
	root: NoteName;
	interval: IntervalName;
	correctPositions: FretPosition[];
}

export type Challenge =
	| IdentifyIntervalChallenge
	| IdentifyNoteChallenge
	| FretboardMarkChallenge;

export const PRACTICE_INTERVALS: IntervalName[] = [
	"b2",
	"2",
	"b3",
	"3",
	"4",
	"b5",
	"5",
	"#5",
	"6",
	"b7",
	"7",
];

export const TIMER_CONFIG: Record<
	ChallengeType,
	{ start: number; min: number; step: number }
> = {
	"identify-interval": { start: 8000, min: 3000, step: 500 },
	"identify-note": { start: 8000, min: 3000, step: 500 },
	"fretboard-mark": { start: 35000, min: 12000, step: 2000 },
};

function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function generateChallenge(
	type: ChallengeType,
	tuning: Tuning,
): Challenge {
	if (type === "identify-interval") {
		const root = pickRandom(CHROMATIC);
		const answer = pickRandom(PRACTICE_INTERVALS);
		const target = resolveInterval(root, answer);
		const wrongs = shuffle(
			PRACTICE_INTERVALS.filter((i) => i !== answer),
		).slice(0, 2) as IntervalName[];
		return {
			type,
			root,
			target,
			answer,
			options: shuffle([answer, ...wrongs]) as IntervalName[],
		};
	}

	if (type === "identify-note") {
		const root = pickRandom(CHROMATIC);
		const interval = pickRandom(PRACTICE_INTERVALS);
		const answer = resolveInterval(root, interval);
		const wrongs = shuffle(CHROMATIC.filter((n) => n !== answer)).slice(
			0,
			2,
		) as NoteName[];
		return {
			type,
			root,
			interval,
			answer,
			options: shuffle([answer, ...wrongs]) as NoteName[],
		};
	}

	// fretboard-mark
	const root = pickRandom(CHROMATIC);
	const interval = pickRandom(PRACTICE_INTERVALS);
	const intervalNote = resolveInterval(root, interval);
	const letter = intervalNote[0] as Letter;
	const accidental = intervalNote.length > 1 ? 1 : 0;
	const correctPositions = mapNotesToFretboard(
		{ notes: [{ letter, accidental }], root: undefined },
		tuning,
		[0, 12],
	);
	return { type: "fretboard-mark", root, interval, correctPositions };
}

// Returns a FretPosition for every string/fret combination (frets 0–12).
// Used by ChallengeFretboardMark to render a fully clickable fretboard.
export function allFretboardPositions(tuning: Tuning): FretPosition[] {
	const stringCount = tuning.length;
	const positions: FretPosition[] = [];
	for (let stringIdx = 0; stringIdx < stringCount; stringIdx++) {
		for (let fret = 0; fret <= 12; fret++) {
			const note = getNoteAtPosition(tuning, stringIdx, fret);
			const letter = note[0] as Letter;
			const accidental = note.length > 1 ? 1 : 0;
			positions.push({
				string: stringCount - stringIdx,
				fret,
				note,
				spelled: { letter, accidental },
			});
		}
	}
	return positions;
}

export function checkFretboardAnswer(
	challenge: FretboardMarkChallenge,
	marked: Set<string>,
): boolean {
	const correct = new Set(
		challenge.correctPositions.map((p) => `${p.string}-${p.fret}`),
	);
	if (correct.size !== marked.size) return false;
	for (const key of correct) {
		if (!marked.has(key)) return false;
	}
	return true;
}

export function nextDuration(current: number, type: ChallengeType): number {
	const { min, step } = TIMER_CONFIG[type];
	return Math.max(min, current - step);
}
