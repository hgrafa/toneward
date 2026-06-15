import { RefreshCw, SlidersHorizontal } from "lucide-react";
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
	const { routingSupported, devices, deviceId, setDeviceId, refreshDevices } =
		useMetronome();

	const rows: OutputRow[] = [
		{ id: "metronome", label: "Metronome", deviceId, setDeviceId },
	];

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted data-[state=open]:border-foreground/30 data-[state=open]:text-foreground"
				>
					<SlidersHorizontal className="size-3.5" />
					Audio
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={10} className="w-80">
				<div className="space-y-1">
					<p className="text-sm font-semibold">Audio output</p>
					<p className="text-xs text-muted-foreground">
						Choose which device each sound plays through.
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
										Refresh
									</button>
								</div>
								<Select
									value={toSelectValue(row.deviceId)}
									onValueChange={(v) => row.setDeviceId(fromSelectValue(v))}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="System default" />
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
							Tip: pick different devices per sound to play them separately —
							e.g. a click on your speakers while practice plays on headphones.
						</p>
					</div>
				) : (
					<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
						This browser plays through the system default output. Per-device
						routing needs Chrome or Edge.
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
