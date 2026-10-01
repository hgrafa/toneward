// Plays box-pattern runs with the bundled piano recording. The recording holds
// thirteen sampled notes; the preset maps nearby pitches to each sample.
// This source owns its AudioContext so note routing stays independent.

import { midiNumber, type Pitch } from "@/core/pitch";
import { applySink } from "./devices";
import pianoPreset from "./pianoPreset.json";

const NOTE_SPACING_S = 0.44;
const NOTE_LENGTH_S = 1.15;
const SILENCE = 0.0001;

type PianoZone = readonly [
	number,
	number,
	number,
	boolean,
	number,
	number,
	number,
	number,
	boolean,
	number,
	number,
	number,
];
const zones = pianoPreset.zones as unknown as PianoZone[];

export interface NotePlayerConfig {
	volume: number;
}

function zoneForMidi(midi: number): PianoZone {
	return (
		zones.find((zone) => midi >= zone[1] && midi <= zone[2]) ??
		(midi < zones[0][1] ? zones[0] : zones[zones.length - 1])
	);
}

function findMasterOffset(buffer: AudioBuffer): number {
	// The source file begins with a calibration beep to account for MP3 padding.
	const data = buffer.getChannelData(0);
	for (let i = 0; i < Math.min(data.length, buffer.sampleRate); i++) {
		if (data[i] > 0.5) return i / buffer.sampleRate - 27 / 44100;
	}
	throw new Error("Piano sample calibration marker is missing");
}

export class NotePlayer {
	private ctx: AudioContext | null = null;
	private deviceId = "";
	private active: AudioBufferSourceNode[] = [];
	private timeouts: ReturnType<typeof setTimeout>[] = [];
	private token = 0;
	private sample: Promise<{ buffer: AudioBuffer; offset: number }> | null =
		null;
	private config: NotePlayerConfig = { volume: 0.8 };

	onNote: ((index: number) => void) | null = null;
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

	async play(pitches: Pitch[]): Promise<void> {
		this.stop();
		if (pitches.length === 0) return;
		const token = ++this.token;
		if (!this.ctx) {
			this.ctx = new AudioContext();
			if (this.deviceId) await applySink(this.ctx, this.deviceId);
		}
		const ctx = this.ctx;
		// Resume during the user gesture, before the asynchronous sample fetch.
		await ctx.resume();
		const { buffer, offset } = await this.loadSample(ctx);
		if (this.token !== token) return;

		const start = ctx.currentTime + 0.05;
		pitches.forEach((pitch, index) => {
			const time = start + index * NOTE_SPACING_S;
			this.scheduleNote(ctx, buffer, offset, midiNumber(pitch), time);
			this.timeouts.push(
				setTimeout(
					() => {
						if (this.token === token) this.onNote?.(index);
					},
					Math.max(0, (time - ctx.currentTime) * 1000),
				),
			);
		});
		const end = start + (pitches.length - 1) * NOTE_SPACING_S + NOTE_LENGTH_S;
		this.timeouts.push(
			setTimeout(
				() => {
					if (this.token !== token) return;
					this.active = [];
					this.onNote?.(-1);
					this.onEnd?.();
				},
				Math.max(0, (end - ctx.currentTime) * 1000),
			),
		);
	}

	stop(): void {
		this.token++;
		for (const timeout of this.timeouts) clearTimeout(timeout);
		this.timeouts = [];
		for (const source of this.active) {
			try {
				source.stop();
			} catch {
				// A completed source may already have stopped.
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

	private loadSample(
		ctx: AudioContext,
	): Promise<{ buffer: AudioBuffer; offset: number }> {
		if (!this.sample) {
			this.sample = (async () => {
				const response = await fetch(
					`${import.meta.env.BASE_URL}audio/piano.mp3`,
				);
				if (!response.ok) throw new Error("Piano sample could not be loaded");
				const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
				return { buffer, offset: findMasterOffset(buffer) };
			})().catch((error: unknown) => {
				this.sample = null;
				throw error;
			});
		}
		return this.sample;
	}

	private scheduleNote(
		ctx: AudioContext,
		buffer: AudioBuffer,
		masterOffset: number,
		midi: number,
		time: number,
	): void {
		const zone = zoneForMidi(midi);
		const rate = 2 ** ((midi - zone[0]) / 12);
		const source = ctx.createBufferSource();
		const gain = ctx.createGain();
		const duration = Math.min(
			NOTE_LENGTH_S,
			(zone[9] + zone[10] / zone[11] - 0.04) / rate,
		);
		source.buffer = buffer;
		source.playbackRate.value = rate;
		gain.gain.setValueAtTime(SILENCE, time);
		gain.gain.exponentialRampToValueAtTime(
			Math.max(SILENCE, this.config.volume * zone[5] * 0.55),
			time + 0.008,
		);
		gain.gain.exponentialRampToValueAtTime(SILENCE, time + duration);
		source.connect(gain).connect(ctx.destination);
		source.start(time, zone[4] + masterOffset);
		source.stop(time + duration);
		this.active.push(source);
		source.onended = () => {
			this.active = this.active.filter((current) => current !== source);
		};
	}
}
