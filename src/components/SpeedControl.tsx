import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlayerSlider, type SliderStop } from "@/components/PlayerSlider";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export const SPEED_STOPS: SliderStop[] = [
	{ value: 0.5, label: ".5" },
	{ value: 0.75, label: ".75" },
	{ value: 1, label: "1" },
	{ value: 1.5, label: "1.5" },
	{ value: 2, label: "2" },
];

const formatSpeed = (r: number) => `${+r.toFixed(2)}×`;

interface SpeedControlProps {
	value: number;
	onChange: (rate: number) => void;
	onOpenChange?: (open: boolean) => void;
}

export function SpeedControl({
	value,
	onChange,
	onOpenChange,
}: SpeedControlProps) {
	const { t } = useTranslation();

	return (
		<Popover onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t("ui.showroom.speed")}
					className="flex h-7 items-center gap-1 rounded-md bg-white/10 px-2 font-mono font-semibold text-white text-xs transition-colors hover:bg-white/20 data-[state=open]:bg-white data-[state=open]:text-[#23201c]"
				>
					<Gauge className="size-3.5 shrink-0" />
					<span className="w-10 text-center tabular-nums">
						{formatSpeed(value)}
					</span>
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
						{formatSpeed(value)}
					</span>
					<PlayerSlider
						value={value}
						min={0.5}
						max={2}
						step={0.05}
						scale="log"
						ariaLabel={t("ui.showroom.playbackSpeed")}
						stops={SPEED_STOPS}
						onChange={onChange}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
