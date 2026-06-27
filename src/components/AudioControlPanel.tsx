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
import { useAudioDevices } from "@/hooks/AudioDevicesContext";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";
import { useMetronome } from "@/hooks/MetronomeContext";

// Radix <Select.Item> forbids an empty-string value (it's reserved for "clear
// selection"), but the default output's deviceId IS "". Bridge with a sentinel.
const DEFAULT_VALUE = "__default__";
const toSelectValue = (deviceId: string) =>
	deviceId === "" ? DEFAULT_VALUE : deviceId;
const fromSelectValue = (value: string) =>
	value === DEFAULT_VALUE ? "" : value;

// One routable audio output. As more sources are added (e.g. note playback),
// each becomes a row here with its own device dropdown.
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
	];

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background"
				>
					<SlidersHorizontal className="size-3.5" />
					{t("ui.audio.trigger")}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={10} className="w-80">
				<div className="space-y-1">
					<p className="text-sm font-semibold">{t("ui.audio.outputTitle")}</p>
					<p className="text-xs text-muted-foreground">
						{t("ui.audio.outputDesc")}
					</p>
				</div>

				{routingSupported ? (
					<div className="mt-4 space-y-3">
						{rows.map((row) => (
							<div key={row.id} className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-xs font-medium">{row.label}</span>
									<button
										type="button"
										onClick={() => void refreshDevices()}
										className="flex items-center gap-1 text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
									>
										<RefreshCw className="size-3" />
										{t("ui.audio.refresh")}
									</button>
								</div>
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
						<p className="pt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
							{t("ui.audio.tip")}
						</p>
					</div>
				) : (
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						{t("ui.audio.noRoutingMsg")}
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
