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
import { Metronome } from "@/audio/metronome";
import { clampBpm, DEFAULT_BPM } from "@/audio/metronomeMath";
import { useAudioDevices } from "./AudioDevicesContext";

interface MetronomeState {
	isPlaying: boolean;
	bpm: number;
	beatsPerBar: number;
	volume: number;
	accent: boolean;
	activeBeat: number; // the currently-sounding beat, -1 when stopped
	// Output routing
	routingSupported: boolean;
	devices: OutputDevice[];
	deviceId: string;
	toggle: () => void;
	setBpm: (bpm: number) => void;
	setBeatsPerBar: (n: number) => void;
	setVolume: (v: number) => void;
	setAccent: (a: boolean) => void;
	setDeviceId: (id: string) => void;
	refreshDevices: () => Promise<void>;
	reset: () => void;
}

const MetronomeContext = createContext<MetronomeState | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
	const engineRef = useRef<Metronome | null>(null);
	if (engineRef.current === null) engineRef.current = new Metronome();
	const engine = engineRef.current;

	const [isPlaying, setIsPlaying] = useState(false);
	const [bpm, setBpmState] = useState(DEFAULT_BPM);
	const [beatsPerBar, setBeatsPerBarState] = useState(4);
	const [volume, setVolumeState] = useState(0.7);
	const [accent, setAccentState] = useState(true);
	const [activeBeat, setActiveBeat] = useState(-1);

	// Device discovery is shared across audio sources; this source keeps only its
	// own selected output.
	const {
		routingSupported,
		devices,
		refresh: refreshDevices,
	} = useAudioDevices();
	const [deviceId, setDeviceIdState] = useState("");

	// Flash the active beat as each click sounds.
	useEffect(() => {
		engine.onBeat = (beat) => setActiveBeat(beat);
		return () => {
			engine.onBeat = null;
		};
	}, [engine]);

	// Tear down the audio context on unmount.
	useEffect(() => {
		return () => {
			void engine.dispose();
		};
	}, [engine]);

	const toggle = useCallback(() => {
		if (engine.isRunning) {
			engine.stop();
			setIsPlaying(false);
			setActiveBeat(-1);
		} else {
			void engine.start().then(() => setIsPlaying(true));
		}
	}, [engine]);

	const setBpm = useCallback(
		(value: number) => {
			const next = clampBpm(value);
			setBpmState(next);
			engine.configure({ bpm: next });
		},
		[engine],
	);

	const reset = useCallback(() => {
		setBpmState(DEFAULT_BPM);
		engine.configure({ bpm: DEFAULT_BPM });
	}, [engine]);

	const setBeatsPerBar = useCallback(
		(n: number) => {
			setBeatsPerBarState(n);
			engine.configure({ beatsPerBar: n });
		},
		[engine],
	);

	const setVolume = useCallback(
		(v: number) => {
			setVolumeState(v);
			engine.configure({ volume: v });
		},
		[engine],
	);

	const setAccent = useCallback(
		(a: boolean) => {
			setAccentState(a);
			engine.configure({ accent: a });
		},
		[engine],
	);

	const setDeviceId = useCallback(
		(id: string) => {
			setDeviceIdState(id);
			void engine.setOutputDevice(id);
		},
		[engine],
	);

	const value = useMemo<MetronomeState>(
		() => ({
			isPlaying,
			bpm,
			beatsPerBar,
			volume,
			accent,
			activeBeat,
			routingSupported,
			devices,
			deviceId,
			toggle,
			setBpm,
			setBeatsPerBar,
			setVolume,
			setAccent,
			setDeviceId,
			refreshDevices,
			reset,
		}),
		[
			isPlaying,
			bpm,
			beatsPerBar,
			volume,
			accent,
			activeBeat,
			routingSupported,
			devices,
			deviceId,
			toggle,
			setBpm,
			setBeatsPerBar,
			setVolume,
			setAccent,
			setDeviceId,
			refreshDevices,
			reset,
		],
	);

	return (
		<MetronomeContext.Provider value={value}>
			{children}
		</MetronomeContext.Provider>
	);
}

export function useMetronome(): MetronomeState {
	const ctx = useContext(MetronomeContext);
	if (!ctx) {
		throw new Error("useMetronome must be used within a MetronomeProvider");
	}
	return ctx;
}
