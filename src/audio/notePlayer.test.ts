import { afterEach, describe, expect, it, vi } from "vitest";
import { NotePlayer } from "./notePlayer";

const pitchC4 = { note: "C" as const, octave: 4 };

function audioHarness() {
	const sources: Array<{
		start: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		playbackRate: { value: number };
	}> = [];
	const context = {
		currentTime: 0,
		destination: {},
		state: "running",
		resume: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		decodeAudioData: vi.fn().mockResolvedValue({
			sampleRate: 44100,
			getChannelData: () => Float32Array.from([0, 0.6]),
		}),
		createBufferSource: vi.fn(() => {
			const source = {
				buffer: null,
				playbackRate: { value: 1 },
				connect: vi.fn().mockReturnThis(),
				start: vi.fn(),
				stop: vi.fn(),
				onended: null,
			};
			sources.push(source);
			return source;
		}),
		createGain: vi.fn(() => ({
			gain: {
				setValueAtTime: vi.fn(),
				exponentialRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn().mockReturnThis(),
		})),
		createOscillator: vi.fn(() => {
			throw new Error("The old oscillator voice was used");
		}),
	};
	vi.stubGlobal(
		"AudioContext",
		vi.fn(() => context),
	);
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		}),
	);
	return { context, sources };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("NotePlayer", () => {
	it("plays middle C from the recorded piano sample", async () => {
		const { context, sources } = audioHarness();
		const player = new NotePlayer();
		await player.play([pitchC4]);

		expect(context.decodeAudioData).toHaveBeenCalledOnce();
		expect(sources).toHaveLength(1);
		expect(sources[0].playbackRate.value).toBeCloseTo(1);
		expect(sources[0].start).toHaveBeenCalledWith(
			expect.any(Number),
			expect.closeTo(25.2, 1),
		);
		await player.dispose();
	});

	it("does not sound a run cancelled while its sample loads", async () => {
		const { context, sources } = audioHarness();
		let resolveAudio!: (value: ArrayBuffer) => void;
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: () =>
					new Promise<ArrayBuffer>((resolve) => {
						resolveAudio = resolve;
					}),
			}),
		);
		const player = new NotePlayer();
		const pending = player.play([pitchC4]);
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
		await Promise.resolve();
		player.stop();
		resolveAudio(new ArrayBuffer(8));
		await pending;

		expect(sources).toHaveLength(0);
		expect(context.createOscillator).not.toHaveBeenCalled();
		await player.dispose();
	});
});
