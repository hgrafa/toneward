import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	DEFAULT_OUTPUT,
	isOutputRoutingSupported,
	listOutputDevices,
	type OutputDevice,
	revealDeviceLabels,
} from "@/audio/devices";

// Shared discovery of audio output devices, used by every audio source
// (metronome, notes, …). Centralizing it means one device list and a single
// label-permission prompt rather than one per source. Each source still keeps
// its OWN selected device — that independence is the whole point of routing
// different sounds to different outputs.
interface AudioDevicesState {
	routingSupported: boolean;
	devices: OutputDevice[];
	refresh: () => Promise<void>;
}

const AudioDevicesContext = createContext<AudioDevicesState | null>(null);

export function AudioDevicesProvider({ children }: { children: ReactNode }) {
	const routingSupported = useMemo(() => isOutputRoutingSupported(), []);
	const [devices, setDevices] = useState<OutputDevice[]>([DEFAULT_OUTPUT]);

	// Populate the list at mount (labels may be placeholders until refresh()).
	useEffect(() => {
		if (routingSupported) void listOutputDevices().then(setDevices);
	}, [routingSupported]);

	const refresh = useCallback(async () => {
		if (!routingSupported) return;
		await revealDeviceLabels();
		setDevices(await listOutputDevices());
	}, [routingSupported]);

	const value = useMemo<AudioDevicesState>(
		() => ({ routingSupported, devices, refresh }),
		[routingSupported, devices, refresh],
	);

	return (
		<AudioDevicesContext.Provider value={value}>
			{children}
		</AudioDevicesContext.Provider>
	);
}

export function useAudioDevices(): AudioDevicesState {
	const ctx = useContext(AudioDevicesContext);
	if (!ctx) {
		throw new Error(
			"useAudioDevices must be used within an AudioDevicesProvider",
		);
	}
	return ctx;
}
