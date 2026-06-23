import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StudyTimerPanel } from "@/components/StudyTimerPanel";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { formatClock, useStudyTimer } from "@/hooks/StudyTimerContext";

export function StudyTimerButton() {
	const { t } = useTranslation();
	const { mode, running, finished, elapsed, remaining, goal } = useStudyTimer();
	const display = mode === "up" ? elapsed : remaining;
	const trimmedGoal = goal.trim();

	const base =
		"flex h-9 max-w-[260px] items-center gap-2 rounded-lg px-3 font-semibold text-sm transition-colors";
	const className = finished
		? `${base} bg-[#16a34a] text-white`
		: `${base} border border-border bg-card text-secondary-foreground hover:bg-muted data-[state=open]:border-transparent data-[state=open]:bg-foreground data-[state=open]:text-background`;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t("ui.timer.title")}
					className={className}
				>
					<Clock className="size-4 shrink-0" />
					{finished ? (
						<span className="max-w-[180px] truncate">
							{trimmedGoal || t("ui.timer.congrats")} 🎉
						</span>
					) : (
						<>
							<span className="font-mono tabular-nums">
								{formatClock(display)}
							</span>
							{running && trimmedGoal && (
								<>
									<span className="h-3.5 w-px shrink-0 bg-current/20" />
									<span className="max-w-[140px] truncate opacity-70">
										{trimmedGoal}
									</span>
								</>
							)}
							{running && (
								<span className="size-1.5 shrink-0 rounded-full bg-[#22c55e]" />
							)}
						</>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={10} className="w-auto">
				<StudyTimerPanel />
			</PopoverContent>
		</Popover>
	);
}
