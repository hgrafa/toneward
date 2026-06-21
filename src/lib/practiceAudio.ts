const STORAGE_KEY = "toneward.practice.muted";

let audioCtx: AudioContext | null = null;
let muted: boolean = localStorage.getItem(STORAGE_KEY) === "true";

function getCtx(): AudioContext {
	if (!audioCtx) audioCtx = new AudioContext();
	if (audioCtx.state === "suspended") void audioCtx.resume();
	return audioCtx;
}

export function getMuted(): boolean {
	return muted;
}

export function setMuted(value: boolean): void {
	muted = value;
	localStorage.setItem(STORAGE_KEY, String(value));
}

function tone(
	ac: AudioContext,
	freq: number,
	startTime: number,
	duration: number,
	type: OscillatorType = "sine",
	volume = 0.25,
): void {
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, startTime);
	gain.gain.setValueAtTime(volume, startTime);
	gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start(startTime);
	osc.stop(startTime + duration);
}

export function playCorrect(): void {
	if (muted) return;
	const ac = getCtx();
	const t = ac.currentTime;
	// Short ascending two-note chime
	tone(ac, 880, t, 0.12);
	tone(ac, 1108, t + 0.07, 0.22, "sine", 0.2);
}

export function playWrong(): void {
	if (muted) return;
	const ac = getCtx();
	const t = ac.currentTime;
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = "sawtooth";
	osc.frequency.setValueAtTime(220, t);
	osc.frequency.linearRampToValueAtTime(160, t + 0.25);
	gain.gain.setValueAtTime(0.12, t);
	gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start(t);
	osc.stop(t + 0.3);
}

export function playGameOver(): void {
	if (muted) return;
	const ac = getCtx();
	const t = ac.currentTime;
	// Descending three-note phrase
	tone(ac, 523, t, 0.2, "sine", 0.2);
	tone(ac, 440, t + 0.18, 0.2, "sine", 0.17);
	tone(ac, 349, t + 0.36, 0.45, "sine", 0.14);
}
