// A Web Audio metronome using the look-ahead scheduler pattern: a coarse timer
// (setInterval) repeatedly schedules precisely-timed clicks slightly ahead of
// the audio clock, so tempo stays rock-steady regardless of timer jitter.
//
// See https://web.dev/articles/audio-scheduling for the technique.

import { applySink } from "./devices";
import { beatInterval, isAccent, nextBeat } from "./metronomeMath";

export interface MetronomeConfig {
	bpm: number;
	beatsPerBar: number;
	volume: number; // 0..1
	accent: boolean; // emphasize the downbeat
}

// How often the timer wakes up to schedule (ms) and how far ahead it schedules
// (s). The window must exceed the interval so no beat is ever missed.
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

const ACCENT_FREQ = 1500;
const TICK_FREQ = 1000;
const CLICK_DURATION_S = 0.05;

export class Metronome {
	private ctx: AudioContext | null = null;
	private timer: ReturnType<typeof setInterval> | null = null;
	private nextNoteTime = 0;
	private currentBeat = 0;
	private deviceId = "";

	private config: MetronomeConfig = {
		bpm: 100,
		beatsPerBar: 4,
		volume: 0.7,
		accent: true,
	};

	// Notifies the UI when a beat sounds, so it can flash the active beat.
	onBeat: ((beat: number, accent: boolean) => void) | null = null;

	get isRunning(): boolean {
		return this.timer !== null;
	}

	configure(partial: Partial<MetronomeConfig>): void {
		this.config = { ...this.config, ...partial };
	}

	getConfig(): MetronomeConfig {
		return { ...this.config };
	}

	// Route audio to a specific output device. Works mid-playback on browsers
	// that support setSinkId; a no-op elsewhere (plays through the default).
	async setOutputDevice(deviceId: string): Promise<void> {
		this.deviceId = deviceId;
		if (this.ctx) await applySink(this.ctx, deviceId);
	}

	async start(): Promise<void> {
		if (this.isRunning) return;

		if (!this.ctx) {
			this.ctx = new AudioContext();
			if (this.deviceId) await applySink(this.ctx, this.deviceId);
		}
		// Browsers start contexts suspended until a user gesture resumes them.
		await this.ctx.resume();

		this.currentBeat = 0;
		this.nextNoteTime = this.ctx.currentTime + 0.05;
		this.timer = setInterval(() => this.scheduler(), LOOKAHEAD_MS);
	}

	stop(): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	// Release the audio context entirely (e.g. on unmount).
	async dispose(): Promise<void> {
		this.stop();
		if (this.ctx) {
			await this.ctx.close();
			this.ctx = null;
		}
	}

	private scheduler(): void {
		const ctx = this.ctx;
		if (!ctx) return;

		while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
			const accent =
				this.config.accent &&
				isAccent(this.currentBeat, this.config.beatsPerBar);
			this.scheduleClick(this.nextNoteTime, accent);

			const beat = this.currentBeat;
			const time = this.nextNoteTime;
			if (this.onBeat) {
				// Fire the UI callback at sounding time, not scheduling time.
				const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
				setTimeout(() => this.onBeat?.(beat, accent), delayMs);
			}

			this.nextNoteTime += beatInterval(this.config.bpm);
			this.currentBeat = nextBeat(this.currentBeat, this.config.beatsPerBar);
		}
	}

	private scheduleClick(time: number, accent: boolean): void {
		const ctx = this.ctx;
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.frequency.value = accent ? ACCENT_FREQ : TICK_FREQ;

		// Short percussive envelope to avoid clicks/pops at edges.
		const peak = this.config.volume * (accent ? 1 : 0.7);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(peak, time + 0.002);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION_S);

		osc.connect(gain).connect(ctx.destination);
		osc.start(time);
		osc.stop(time + CLICK_DURATION_S);
	}
}
