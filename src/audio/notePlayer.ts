// A Web Audio engine for playing a finite sequence of notes (a box pattern run).
// Unlike the Metronome's endless look-ahead scheduler, a run is short and fully
// known up front, so every note is scheduled in one pass against the audio clock
// and a matching timer fires the `onNote` UI callback at sounding time.
//
// Like every audio source here it owns its OWN AudioContext so it can be routed
// to a chosen output device independently (see audio/CLAUDE.md).

import { midiNumber, midiToFreq, type Pitch } from "@/core/pitch";
import { applySink } from "./devices";

// Timbres offered to the user. Each is a crude single-oscillator voice — enough
// to give the run a distinct character without a sample library.
export type NoteTone = "plucked" | "clean" | "warm";

export interface NotePlayerConfig {
	tone: NoteTone;
	volume: number; // 0..1
}

interface ToneSpec {
	type: OscillatorType;
	attack: number; // seconds to reach peak
	length: number; // seconds until the note decays out
	gain: number; // per-tone loudness trim (osc types differ in perceived volume)
}

const TONE_SPECS: Record<NoteTone, ToneSpec> = {
	plucked: { type: "sawtooth", attack: 0.004, length: 0.4, gain: 0.5 },
	clean: { type: "sine", attack: 0.015, length: 0.5, gain: 0.95 },
	warm: { type: "triangle", attack: 0.05, length: 0.6, gain: 0.85 },
};

// Time between successive note onsets. A note's tail (TONE_SPECS.length) can
// exceed this so the run sounds connected rather than staccato.
const NOTE_SPACING_S = 0.32;

export class NotePlayer {
	private ctx: AudioContext | null = null;
	private deviceId = "";
	private active: OscillatorNode[] = [];
	private timeouts: ReturnType<typeof setTimeout>[] = [];
	// Bumped on every play/stop so stale timers from a superseded run are ignored.
	private token = 0;

	private config: NotePlayerConfig = { tone: "plucked", volume: 0.8 };

	// Fires with the index of the note now sounding, or -1 when the run ends.
	onNote: ((index: number) => void) | null = null;
	// Fires once when a run finishes (not when it's stopped early).
	onEnd: (() => void) | null = null;

	get isPlaying(): boolean {
		return this.active.length > 0;
	}

	configure(partial: Partial<NotePlayerConfig>): void {
		this.config = { ...this.config, ...partial };
	}

	async setOutputDevice(deviceId: string): Promise<void> {
		this.deviceId = deviceId;
		if (this.ctx) await applySink(this.ctx, deviceId);
	}

	// Schedule and play a sequence, cancelling any run already in progress.
	async play(pitches: Pitch[]): Promise<void> {
		this.stop();
		if (pitches.length === 0) return;

		if (!this.ctx) {
			this.ctx = new AudioContext();
			if (this.deviceId) await applySink(this.ctx, this.deviceId);
		}
		// Contexts start suspended until a user gesture resumes them.
		await this.ctx.resume();

		const ctx = this.ctx;
		const token = ++this.token;
		const start = ctx.currentTime + 0.06;

		pitches.forEach((pitch, i) => {
			const time = start + i * NOTE_SPACING_S;
			this.scheduleNote(ctx, midiToFreq(midiNumber(pitch)), time);
			const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
			this.timeouts.push(
				setTimeout(() => {
					if (this.token === token) this.onNote?.(i);
				}, delayMs),
			);
		});

		const endMs = Math.max(
			0,
			(start + pitches.length * NOTE_SPACING_S - ctx.currentTime) * 1000,
		);
		this.timeouts.push(
			setTimeout(() => {
				if (this.token !== token) return;
				this.active = [];
				this.onNote?.(-1);
				this.onEnd?.();
			}, endMs),
		);
	}

	// Stop immediately, silencing scheduled notes and pending UI callbacks.
	stop(): void {
		this.token++;
		for (const id of this.timeouts) clearTimeout(id);
		this.timeouts = [];
		for (const osc of this.active) {
			try {
				osc.stop();
			} catch {
				// Already stopped — ignore.
			}
		}
		this.active = [];
		this.onNote?.(-1);
	}

	async dispose(): Promise<void> {
		this.stop();
		if (this.ctx) {
			await this.ctx.close();
			this.ctx = null;
		}
	}

	private scheduleNote(ctx: AudioContext, freq: number, time: number): void {
		const spec = TONE_SPECS[this.config.tone];
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = spec.type;
		osc.frequency.setValueAtTime(freq, time);

		const peak = Math.max(0.0001, this.config.volume * spec.gain);
		gain.gain.setValueAtTime(0.0001, time);
		gain.gain.exponentialRampToValueAtTime(peak, time + spec.attack);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + spec.length);

		osc.connect(gain).connect(ctx.destination);
		osc.start(time);
		osc.stop(time + spec.length + 0.02);

		this.active.push(osc);
		osc.onended = () => {
			this.active = this.active.filter((o) => o !== osc);
		};
	}
}
