import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAudioDevices } from "@/hooks/AudioDevicesContext";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";
import { useMetronome } from "@/hooks/MetronomeContext";
import { useNotePlayback } from "@/hooks/NotePlaybackContext";

// Radix <Select.Item> forbids an empty-string value (it's reserved for "clear
// selection"), but the default output's deviceId IS "". Bridge with a sentinel.
const DEFAULT_VALUE = "__default__";
const toSelectValue = (deviceId: string) =>
	deviceId === "" ? DEFAULT_VALUE : deviceId;
const fromSelectValue = (value: string) =>
	value === DEFAULT_VALUE ? "" : value;

// One routable audio output. Each source (metronome, notes, …) is a row here
// with its own device dropdown, so sounds can play on different devices.
interface OutputRow {
	id: string;
	label: string;
	deviceId: string;
	setDeviceId: (id: string) => void;
}

export function AudioControlPanel() {
	const { t } = useTranslation();
	// Device discovery is shared; each source keeps its OWN selected device.
	const {
		routingSupported,
		devices,
		refresh: refreshDevices,
	} = useAudioDevices();
	const { deviceId: metronomeDeviceId, setDeviceId: setMetronomeDeviceId } =
		useMetronome();
	const {
		deviceId: notesDeviceId,
		setDeviceId: setNotesDeviceId,
		volume,
		setVolume,
	} = useNotePlayback();
	const { deviceId: trackDeviceId, setDeviceId: setTrackDeviceId } =
		useMediaPlayerCtx();

	const rows: OutputRow[] = [
		{
			id: "track",
			label: t("ui.audio.track"),
			deviceId: trackDeviceId,
			setDeviceId: setTrackDeviceId,
		},
		{
			id: "metronome",
			label: t("ui.audio.metronome"),
			deviceId: metronomeDeviceId,
			setDeviceId: setMetronomeDeviceId,
		},
		{
			id: "notes",
			label: t("ui.audio.notes"),
			deviceId: notesDeviceId,
			setDeviceId: setNotesDeviceId,
		},
	];

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t("ui.audio.trigger")}
					className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background sm:px-3"
				>
					<SlidersHorizontal className="size-3.5" />
					<span className="hidden sm:inline">{t("ui.audio.trigger")}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={10} className="w-80 rounded-xl">
				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<p className="text-sm font-semibold">{t("ui.audio.outputTitle")}</p>
						{routingSupported && (
							<button
								type="button"
								onClick={() => void refreshDevices()}
								className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<RefreshCw className="size-3" />
								{t("ui.audio.refresh")}
							</button>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("ui.audio.outputDesc")}
					</p>
				</div>

				{routingSupported ? (
					<div className="mt-4 space-y-3">
						{rows.map((row) => (
							<div key={row.id} className="space-y-1.5">
								<span className="text-xs font-medium">{row.label}</span>
								<Select
									value={toSelectValue(row.deviceId)}
									onValueChange={(v) => row.setDeviceId(fromSelectValue(v))}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={t("ui.audio.systemDefault")} />
									</SelectTrigger>
									<SelectContent>
										{devices.map((d) => (
											<SelectItem
												key={d.deviceId || DEFAULT_VALUE}
												value={toSelectValue(d.deviceId)}
											>
												{d.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						))}
					</div>
				) : (
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						{t("ui.audio.noRoutingMsg")}
					</p>
				)}

				{/* Note-playback voice — works regardless of per-device routing. */}
				<div className="mt-4 space-y-3 border-t border-border pt-4">
					<p className="text-sm font-semibold">{t("ui.audio.notesTitle")}</p>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium">
								{t("ui.audio.volume")}
							</span>
							<span className="text-[0.7rem] text-muted-foreground tabular-nums">
								{Math.round(volume * 100)}%
							</span>
						</div>
						<Slider
							value={[Math.round(volume * 100)]}
							min={0}
							max={100}
							step={1}
							aria-label={t("ui.audio.volume")}
							onValueChange={([v]) => setVolume(v / 100)}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
