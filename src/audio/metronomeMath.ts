// Pure metronome timing math — no Web Audio, no DOM, fully unit-testable.

// Seconds between beats at a given tempo.
export function beatInterval(bpm: number): number {
	return 60 / bpm;
}

// Beat 0 (the downbeat) is accented when accents are enabled; every other beat
// is a plain tick. With a single-beat bar every beat is the downbeat.
export function isAccent(beat: number, beatsPerBar: number): boolean {
	return beat % beatsPerBar === 0;
}

// Advance to the next beat index, wrapping at the end of the bar.
export function nextBeat(beat: number, beatsPerBar: number): number {
	return (beat + 1) % beatsPerBar;
}

// Clamp a BPM to a musically sane range.
export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 100;
export function clampBpm(bpm: number): number {
	if (Number.isNaN(bpm)) return MIN_BPM;
	return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

// Italian tempo markings by BPM. Each boundary is the inclusive upper bound of
// its marking; anything faster than the last entry is Prestissimo.
const TEMPO_MARKINGS: { upTo: number; name: string }[] = [
	{ upTo: 24, name: "Larghissimo" },
	{ upTo: 45, name: "Grave" },
	{ upTo: 60, name: "Largo" },
	{ upTo: 66, name: "Larghetto" },
	{ upTo: 72, name: "Adagio" },
	{ upTo: 77, name: "Adagietto" },
	{ upTo: 83, name: "Andante" },
	{ upTo: 89, name: "Andantino" },
	{ upTo: 95, name: "Moderato" },
	{ upTo: 112, name: "Allegretto" },
	{ upTo: 120, name: "Allegro moderato" },
	{ upTo: 140, name: "Allegro" },
	{ upTo: 150, name: "Vivace" },
	{ upTo: 167, name: "Presto" },
];

// The Italian tempo name for a BPM (e.g. 97 → "Allegretto").
export function tempoMarking(bpm: number): string {
	for (const { upTo, name } of TEMPO_MARKINGS) {
		if (bpm <= upTo) return name;
	}
	return "Prestissimo";
}
