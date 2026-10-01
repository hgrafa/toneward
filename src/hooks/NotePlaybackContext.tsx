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
import { NotePlayer } from "@/audio/notePlayer";
import type { Pitch } from "@/core/pitch";
import type { PlaybackDirection } from "@/core/playback";
import { useAudioDevices } from "./AudioDevicesContext";

// Note-playback settings + transport for the box patterns. A separate, focused
// concern from the metronome and the track player; shares device *discovery* via
// AudioDevicesContext but keeps its OWN selected output (see audio/CLAUDE.md).

const VOLUME_KEY = "toneward.notes.volume";
const DEFAULT_VOLUME = 0.8;

function loadVolume(): number {
	try {
		const stored = localStorage.getItem(VOLUME_KEY);
		if (stored === null) return DEFAULT_VOLUME;
		const v = Number(stored);
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
	volume: number;
	setVolume: (v: number) => void;
	// Output routing (shared discovery, per-source selection)
	routingSupported: boolean;
	devices: OutputDevice[];
	deviceId: string;
	setDeviceId: (id: string) => void;
	refreshDevices: () => Promise<void>;
	// Transport
	playing: PlayingState | null;
	activePitch: Pitch | null;
	playbackError: string | null;
	play: (id: string, pitches: Pitch[], direction: PlaybackDirection) => void;
	stop: () => void;
}

const NotePlaybackContext = createContext<NotePlaybackState | null>(null);

export function NotePlaybackProvider({ children }: { children: ReactNode }) {
	const engineRef = useRef<NotePlayer | null>(null);
	if (engineRef.current === null) engineRef.current = new NotePlayer();
	const engine = engineRef.current;

	const [volume, setVolumeState] = useState<number>(loadVolume);
	const [activePitch, setActivePitch] = useState<Pitch | null>(null);
	const [playbackError, setPlaybackError] = useState<string | null>(null);
	const sequenceRef = useRef<Pitch[]>([]);
	const runIdRef = useRef(0);

	const {
		routingSupported,
		devices,
		refresh: refreshDevices,
	} = useAudioDevices();
	const [deviceId, setDeviceIdState] = useState("");

	const [playing, setPlaying] = useState<PlayingState | null>(null);

	// The scheduled run uses the chosen volume at each note onset.
	useEffect(() => {
		engine.configure({ volume });
	}, [engine, volume]);

	// Clear the transport state when a run finishes on its own.
	useEffect(() => {
		engine.onNote = (index) => {
			setActivePitch(index >= 0 ? (sequenceRef.current[index] ?? null) : null);
		};
		engine.onEnd = () => {
			setPlaying(null);
			setActivePitch(null);
		};
		return () => {
			engine.onNote = null;
			engine.onEnd = null;
		};
	}, [engine]);

	useEffect(() => {
		return () => {
			void engine.dispose();
		};
	}, [engine]);

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
			const runId = ++runIdRef.current;
			sequenceRef.current = pitches;
			setActivePitch(null);
			setPlaybackError(null);
			engine.configure({ volume });
			setPlaying({ id, direction });
			void engine.play(pitches).catch(() => {
				if (runId !== runIdRef.current) return;
				setPlaying(null);
				setActivePitch(null);
				setPlaybackError(id);
			});
		},
		[engine, volume],
	);

	const stop = useCallback(() => {
		runIdRef.current++;
		engine.stop();
		setPlaying(null);
		setActivePitch(null);
	}, [engine]);

	const value = useMemo<NotePlaybackState>(
		() => ({
			volume,
			setVolume,
			routingSupported,
			devices,
			deviceId,
			setDeviceId,
			refreshDevices,
			playing,
			activePitch,
			playbackError,
			play,
			stop,
		}),
		[
			volume,
			setVolume,
			routingSupported,
			devices,
			deviceId,
			setDeviceId,
			refreshDevices,
			playing,
			activePitch,
			playbackError,
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
