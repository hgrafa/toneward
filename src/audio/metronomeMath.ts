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
export function clampBpm(bpm: number): number {
	if (Number.isNaN(bpm)) return MIN_BPM;
	return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}
