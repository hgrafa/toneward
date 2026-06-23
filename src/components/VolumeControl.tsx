import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const VOLUME_PRESETS = [0, 0.25, 0.5, 0.75, 1] as const;

const formatPct = (v: number) => `${Math.round(v * 100)}`;

interface VolumeControlProps {
	value: number;
	onChange: (v: number) => void;
	onOpenChange?: (open: boolean) => void;
}

export function VolumeControl({
	value,
	onChange,
	onOpenChange,
}: VolumeControlProps) {
	const { t } = useTranslation();
	const muted = value === 0;

	return (
		<Popover onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t("ui.showroom.volume")}
					className="flex size-7 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20 data-[state=open]:bg-white data-[state=open]:text-[#23201c]"
				>
					{muted ? (
						<VolumeX className="size-4" />
					) : (
						<Volume2 className="size-4" />
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="center"
				sideOffset={10}
				className="w-44 border-white/10 bg-[#2b2724] text-white"
			>
				<div className="flex flex-col items-center gap-3">
					<span className="font-display font-bold text-3xl tabular-nums tracking-tight">
						{formatPct(value)}%
					</span>
					<input
						type="range"
						aria-label={t("ui.showroom.volume")}
						min={0}
						max={1}
						step={0.01}
						value={value}
						onChange={(e) => onChange(Number(e.target.value))}
						className="w-full accent-white"
					/>
					<div className="flex w-full items-center justify-between">
						{VOLUME_PRESETS.map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => onChange(v)}
								className={`rounded px-1.5 py-0.5 font-mono text-xs transition-colors ${
									Math.abs(value - v) < 0.001
										? "font-semibold text-white"
										: "text-white/50 hover:text-white"
								}`}
							>
								{formatPct(v)}
							</button>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
