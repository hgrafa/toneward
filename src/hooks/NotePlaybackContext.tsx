import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { OutputDevice } from "@/audio/devices";
import { NotePlayer, type NoteTone } from "@/audio/notePlayer";
import type { Pitch } from "@/core/pitch";
import type { PlaybackDirection } from "@/core/playback";
import { useAudioDevices } from "./AudioDevicesContext";

// Note-playback settings + transport for the box patterns. A separate, focused
// concern from the metronome and the track player; shares device *discovery* via
// AudioDevicesContext but keeps its OWN selected output (see audio/CLAUDE.md).

const TONE_KEY = "toneward.notes.tone";
const VOLUME_KEY = "toneward.notes.volume";
const TONES: NoteTone[] = ["plucked", "clean", "warm"];
const DEFAULT_TONE: NoteTone = "plucked";
const DEFAULT_VOLUME = 0.8;

function loadTone(): NoteTone {
	try {
		const v = localStorage.getItem(TONE_KEY);
		if (v && (TONES as string[]).includes(v)) return v as NoteTone;
	} catch {
		// private mode / quota — fall through to the default.
	}
	return DEFAULT_TONE;
}

function loadVolume(): number {
	try {
		const v = Number(localStorage.getItem(VOLUME_KEY));
		if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
	} catch {
		// ignore
	}
	return DEFAULT_VOLUME;
}

function persist(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// ignore
	}
}

// Identifies which box card + direction is currently sounding, so each card can
// reflect the right play/stop state.
export interface PlayingState {
	id: string;
	direction: PlaybackDirection;
}

interface NotePlaybackState {
	tone: NoteTone;
	volume: number;
	setTone: (t: NoteTone) => void;
	setVolume: (v: number) => void;
	// Output routing (shared discovery, per-source selection)
	routingSupported: boolean;
	devices: OutputDevice[];
	deviceId: string;
	setDeviceId: (id: string) => void;
	refreshDevices: () => Promise<void>;
	// Transport
	playing: PlayingState | null;
	play: (id: string, pitches: Pitch[], direction: PlaybackDirection) => void;
	stop: () => void;
}

const NotePlaybackContext = createContext<NotePlaybackState | null>(null);

export function NotePlaybackProvider({ children }: { children: ReactNode }) {
	const engineRef = useRef<NotePlayer | null>(null);
	if (engineRef.current === null) engineRef.current = new NotePlayer();
	const engine = engineRef.current;

	const [tone, setToneState] = useState<NoteTone>(loadTone);
	const [volume, setVolumeState] = useState<number>(loadVolume);

	const {
		routingSupported,
		devices,
		refresh: refreshDevices,
	} = useAudioDevices();
	const [deviceId, setDeviceIdState] = useState("");

	const [playing, setPlaying] = useState<PlayingState | null>(null);

	// Keep the engine's voice in sync with the chosen tone/volume so the next run
	// (or notes still being scheduled) uses the latest settings.
	useEffect(() => {
		engine.configure({ tone, volume });
	}, [engine, tone, volume]);

	// Clear the transport state when a run finishes on its own.
	useEffect(() => {
		engine.onEnd = () => setPlaying(null);
		return () => {
			engine.onEnd = null;
		};
	}, [engine]);

	useEffect(() => {
		return () => {
			void engine.dispose();
		};
	}, [engine]);

	const setTone = useCallback((t: NoteTone) => {
		setToneState(t);
		persist(TONE_KEY, t);
	}, []);

	const setVolume = useCallback((v: number) => {
		setVolumeState(v);
		persist(VOLUME_KEY, String(v));
	}, []);

	const setDeviceId = useCallback(
		(id: string) => {
			setDeviceIdState(id);
			void engine.setOutputDevice(id);
		},
		[engine],
	);

	const play = useCallback(
		(id: string, pitches: Pitch[], direction: PlaybackDirection) => {
			engine.configure({ tone, volume });
			setPlaying({ id, direction });
			void engine.play(pitches);
		},
		[engine, tone, volume],
	);

	const stop = useCallback(() => {
		engine.stop();
		setPlaying(null);
	}, [engine]);

	const value = useMemo<NotePlaybackState>(
		() => ({
			tone,
			volume,
			setTone,
			setVolume,
			routingSupported,
			devices,
			deviceId,
			setDeviceId,
			refreshDevices,
			playing,
			play,
			stop,
		}),
		[
			tone,
			volume,
			setTone,
			setVolume,
			routingSupported,
			devices,
			deviceId,
			setDeviceId,
			refreshDevices,
			playing,
			play,
			stop,
		],
	);

	return (
		<NotePlaybackContext.Provider value={value}>
			{children}
		</NotePlaybackContext.Provider>
	);
}

export function useNotePlayback(): NotePlaybackState {
	const ctx = useContext(NotePlaybackContext);
	if (!ctx) {
		throw new Error(
			"useNotePlayback must be used within a NotePlaybackProvider",
		);
	}
	return ctx;
}
