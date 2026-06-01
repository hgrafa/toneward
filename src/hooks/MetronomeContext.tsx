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
import {
	DEFAULT_OUTPUT,
	isOutputRoutingSupported,
	listOutputDevices,
	type OutputDevice,
	revealDeviceLabels,
} from "@/audio/devices";
import { Metronome } from "@/audio/metronome";
import { clampBpm } from "@/audio/metronomeMath";

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
}

const MetronomeContext = createContext<MetronomeState | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
	const engineRef = useRef<Metronome | null>(null);
	if (engineRef.current === null) engineRef.current = new Metronome();
	const engine = engineRef.current;

	const [isPlaying, setIsPlaying] = useState(false);
	const [bpm, setBpmState] = useState(100);
	const [beatsPerBar, setBeatsPerBarState] = useState(4);
	const [volume, setVolumeState] = useState(0.7);
	const [accent, setAccentState] = useState(true);
	const [activeBeat, setActiveBeat] = useState(-1);

	const routingSupported = useMemo(() => isOutputRoutingSupported(), []);
	const [devices, setDevices] = useState<OutputDevice[]>([DEFAULT_OUTPUT]);
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

	const refreshDevices = useCallback(async () => {
		if (!routingSupported) return;
		await revealDeviceLabels();
		setDevices(await listOutputDevices());
	}, [routingSupported]);

	// Populate the device list once at mount (labels may be placeholders until
	// the user grants permission via refreshDevices).
	useEffect(() => {
		if (routingSupported) void listOutputDevices().then(setDevices);
	}, [routingSupported]);

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
