// Audio output device discovery and routing capability detection.
//
// Routing audio to a *specific* physical output (speakers vs. headphones) relies
// on `AudioContext.setSinkId`, which today ships only in Chromium browsers and
// requires a permission grant before device *labels* are visible. Everything
// here degrades gracefully: when routing is unsupported, callers fall back to
// the system default output.

export interface OutputDevice {
	deviceId: string;
	label: string;
}

// The system default output, always selectable. An empty deviceId tells
// `setSinkId` to use the default sink.
export const DEFAULT_OUTPUT: OutputDevice = {
	deviceId: "",
	label: "System default",
};

// `AudioContext.setSinkId` is not yet in the TS DOM lib, so we narrow to it.
type SinkCapableAudioContext = AudioContext & {
	setSinkId?: (sinkId: string) => Promise<void>;
};

// True when the running browser can route an AudioContext to a chosen device.
export function isOutputRoutingSupported(): boolean {
	if (typeof window === "undefined" || !("AudioContext" in window))
		return false;
	return "setSinkId" in AudioContext.prototype;
}

// Apply a sink to a context if the browser supports it; otherwise no-op so the
// caller still plays through the default device. A failed setSinkId (e.g. the
// device vanished, or permission is missing) must NOT break playback — we log
// and fall back to whatever sink the context already has.
export async function applySink(
	ctx: AudioContext,
	deviceId: string,
): Promise<void> {
	const sinkable = ctx as SinkCapableAudioContext;
	if (typeof sinkable.setSinkId !== "function") return;
	try {
		await sinkable.setSinkId(deviceId);
	} catch (err) {
		console.warn("Could not route audio to the selected device:", err);
	}
}

// Enumerate audio output devices. Labels are only populated after the user has
// granted audio permission; until then the OS hides them and we synthesize a
// stable placeholder so the list is still usable.
export async function listOutputDevices(): Promise<OutputDevice[]> {
	if (!navigator.mediaDevices?.enumerateDevices) return [DEFAULT_OUTPUT];

	const devices = await navigator.mediaDevices.enumerateDevices();
	const outputs = devices.filter((d) => d.kind === "audiooutput");

	const mapped: OutputDevice[] = outputs
		.filter((d) => d.deviceId && d.deviceId !== "default")
		.map((d, i) => ({
			deviceId: d.deviceId,
			label: d.label || `Output ${i + 1}`,
		}));

	return [DEFAULT_OUTPUT, ...mapped];
}

// Device labels are hidden until the page holds an audio permission. Briefly
// opening (and immediately closing) a mic stream unlocks them. Returns true if
// labels should now be visible. Best-effort — failure just leaves placeholders.
export async function revealDeviceLabels(): Promise<boolean> {
	if (!navigator.mediaDevices?.getUserMedia) return false;
	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		for (const track of stream.getTracks()) track.stop();
		return true;
	} catch {
		return false;
	}
}
