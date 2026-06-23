import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlayerSlider, type SliderStop } from "@/components/PlayerSlider";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export const VOLUME_STOPS: SliderStop[] = [
	{ value: 0, label: "0" },
	{ value: 0.25, label: "25" },
	{ value: 0.5, label: "50" },
	{ value: 0.75, label: "75" },
	{ value: 1, label: "100" },
];

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
				align="end"
				sideOffset={10}
				collisionPadding={12}
				className="w-48 border-white/10 bg-[#2b2724] text-white"
			>
				<div className="flex flex-col items-center gap-3">
					<span className="font-display font-bold text-3xl tabular-nums tracking-tight">
						{formatPct(value)}%
					</span>
					<PlayerSlider
						value={value}
						min={0}
						max={1}
						step={0.01}
						ariaLabel={t("ui.showroom.volume")}
						stops={VOLUME_STOPS}
						onChange={onChange}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
