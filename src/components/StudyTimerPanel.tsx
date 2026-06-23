import { Minus, Play, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	formatClock,
	type TimerMode,
	useStudyTimer,
} from "@/hooks/StudyTimerContext";

const PRESETS = [5, 15, 25, 45] as const;
const MODES: TimerMode[] = ["up", "down"];
const GOAL_MAX = 80;

export function StudyTimerPanel() {
	const { t } = useTranslation();
	const {
		mode,
		setMode,
		running,
		elapsed,
		durationMin,
		setDurationMin,
		remaining,
		finished,
		goal,
		setGoal,
		start,
		reset,
		finish,
	} = useStudyTimer();
	const [confirming, setConfirming] = useState(false);

	const display = mode === "up" ? elapsed : remaining;
	const trimmedGoal = goal.trim();

	// ---- Finished: a countdown reached zero ----
	if (finished) {
		return (
			<div className="flex w-72 flex-col gap-3">
				<span className="font-display font-bold text-sm">
					{t("ui.timer.title")}
				</span>
				<div className="rounded-xl bg-[#16a34a] p-4 text-center">
					<p className="font-display font-bold text-base text-white">
						{trimmedGoal || t("ui.timer.congrats")} 🎉
					</p>
				</div>
				<button
					type="button"
					onClick={reset}
					className="flex h-9 items-center justify-center rounded-lg bg-foreground font-semibold text-background text-sm"
				>
					{t("ui.timer.newSession")}
				</button>
			</div>
		);
	}

	// ---- Running: locked; the only action is a confirmed give-up ----
	if (running) {
		return (
			<div className="flex w-72 flex-col gap-3">
				<span className="font-display font-bold text-sm">
					{t("ui.timer.title")}
				</span>
				<div className="text-center font-bold font-display text-5xl text-foreground tabular-nums tracking-tight">
					{formatClock(display)}
				</div>
				{trimmedGoal && (
					<p className="line-clamp-2 text-center text-secondary-foreground text-xs">
						{goal}
					</p>
				)}
				{mode === "up" ? (
					<button
						type="button"
						onClick={finish}
						className="flex h-9 items-center justify-center rounded-lg bg-[#16a34a] font-semibold text-sm text-white hover:bg-[#15803d]"
					>
						{t("ui.timer.done")}
					</button>
				) : confirming ? (
					<div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-3 text-center">
						<p className="font-medium text-secondary-foreground text-sm">
							{t("ui.timer.giveUpConfirm")}
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setConfirming(false)}
								className="h-9 flex-1 rounded-lg border border-border bg-card font-semibold text-secondary-foreground text-sm hover:bg-muted"
							>
								{t("ui.timer.keepGoing")}
							</button>
							<button
								type="button"
								onClick={() => {
									reset();
									setConfirming(false);
								}}
								className="h-9 flex-1 rounded-lg bg-destructive font-semibold text-sm text-white"
							>
								{t("ui.timer.giveUp")}
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirming(true)}
						className="flex h-9 items-center justify-center rounded-lg border border-border bg-card font-semibold text-destructive text-sm hover:bg-muted"
					>
						{t("ui.timer.giveUp")}
					</button>
				)}
			</div>
		);
	}

	// ---- Setup: configure mode / duration / goal, then start ----
	return (
		<div className="flex w-72 flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="font-display font-bold text-sm">
					{t("ui.timer.title")}
				</span>
				<div className="flex gap-0.5 rounded-lg bg-[#ece6dd] p-0.5">
					{MODES.map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMode(m)}
							className={`rounded-md px-2 py-1 font-medium text-xs transition-colors ${
								mode === m
									? "bg-card text-foreground shadow-sm"
									: "text-secondary-foreground hover:text-foreground"
							}`}
						>
							{t(`ui.timer.${m}`)}
						</button>
					))}
				</div>
			</div>

			<div className="text-center font-bold font-display text-5xl text-foreground tabular-nums tracking-tight">
				{formatClock(display)}
			</div>

			{mode === "down" && (
				<div className="flex flex-col items-center gap-2">
					<div className="flex items-center gap-2">
						<button
							type="button"
							aria-label="-5 min"
							onClick={() => setDurationMin(durationMin - 5)}
							className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-secondary-foreground hover:bg-muted"
						>
							<Minus className="size-4" />
						</button>
						<span className="w-20 text-center font-mono font-semibold text-sm tabular-nums">
							{durationMin} {t("ui.timer.min")}
						</span>
						<button
							type="button"
							aria-label="+5 min"
							onClick={() => setDurationMin(durationMin + 5)}
							className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-secondary-foreground hover:bg-muted"
						>
							<Plus className="size-4" />
						</button>
					</div>
					<div className="flex gap-1">
						{PRESETS.map((p) => (
							<button
								key={p}
								type="button"
								onClick={() => setDurationMin(p)}
								className={`rounded-md px-2 py-0.5 font-mono text-xs transition-colors ${
									durationMin === p
										? "bg-foreground text-background"
										: "text-secondary-foreground hover:bg-muted"
								}`}
							>
								{p}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="flex gap-2">
				<button
					type="button"
					onClick={start}
					className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground font-semibold text-background text-sm"
				>
					<Play className="size-4" /> {t("ui.timer.start")}
				</button>
				<button
					type="button"
					aria-label={t("ui.timer.reset")}
					onClick={reset}
					className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-secondary-foreground hover:bg-muted"
				>
					<RotateCcw className="size-4" />
				</button>
			</div>

			<div className="flex flex-col gap-1">
				<span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
					{t("ui.timer.goalLabel")}
				</span>
				<textarea
					value={goal}
					onChange={(e) => setGoal(e.target.value)}
					placeholder={t("ui.timer.goalPlaceholder")}
					rows={2}
					maxLength={GOAL_MAX}
					className="w-full resize-none rounded-[11px] border border-input bg-muted px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>
		</div>
	);
}
