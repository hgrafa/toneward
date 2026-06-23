import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CUSTOM_ID, INSTRUMENTS } from "@/core/instruments";
import { CHROMATIC } from "@/core/notes";
import { useInstrument } from "@/hooks/useFretboardContext";
import type { NoteName } from "@/types/music";

const MIN_STRINGS = 1;
const MAX_STRINGS = 12;

export function TuningControls() {
	const { t } = useTranslation();
	const {
		tuning,
		instrumentId,
		setInstrument,
		setStringTuning,
		setStringCount,
	} = useInstrument();

	return (
		<div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-card p-[18px]">
			{/* Instrument + string count */}
			<div className="flex flex-wrap items-center gap-3">
				<span className="w-[78px] font-semibold text-secondary-foreground text-sm">
					{t("ui.tuning.instrument")}
				</span>
				<Select value={instrumentId} onValueChange={setInstrument}>
					<SelectTrigger className="h-9 flex-1 rounded-[10px] text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{INSTRUMENTS.map((inst) => (
							<SelectItem key={inst.id} value={inst.id}>
								{inst.name}
							</SelectItem>
						))}
						{instrumentId === CUSTOM_ID && (
							<SelectItem value={CUSTOM_ID}>{t("ui.tuning.custom")}</SelectItem>
						)}
					</SelectContent>
				</Select>
				<div className="flex items-center overflow-hidden rounded-[10px] border border-border">
					<button
						type="button"
						aria-label={t("ui.tuning.removeString")}
						disabled={tuning.length <= MIN_STRINGS}
						onClick={() => setStringCount(tuning.length - 1)}
						className="flex size-9 items-center justify-center bg-card text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
					>
						<Minus className="size-4" />
					</button>
					<span className="w-[70px] text-center font-mono font-semibold text-sm tabular-nums">
						{t("ui.tuning.strings", { count: tuning.length })}
					</span>
					<button
						type="button"
						aria-label={t("ui.tuning.addString")}
						disabled={tuning.length >= MAX_STRINGS}
						onClick={() => setStringCount(tuning.length + 1)}
						className="flex size-9 items-center justify-center bg-card text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
					>
						<Plus className="size-4" />
					</button>
				</div>
			</div>

			{/* Per-string tuning (low → high) */}
			<div className="flex items-center gap-2.5">
				<span className="w-[78px] font-semibold text-secondary-foreground text-sm">
					{t("ui.tuning.tuning")}
				</span>
				<div className="flex flex-1 flex-wrap gap-1.5">
					{tuning.map((note, index) => (
						<Select
							// biome-ignore lint/suspicious/noArrayIndexKey: string position is the identity here
							key={index}
							value={note}
							onValueChange={(value) =>
								setStringTuning(index, value as NoteName)
							}
						>
							<SelectTrigger
								aria-label={t("ui.tuning.stringTuning", {
									n: tuning.length - index,
								})}
								className="h-9 min-w-0 flex-1 justify-center rounded-[9px] border-input bg-muted font-mono font-semibold text-sm"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CHROMATIC.map((chromaticNote) => (
									<SelectItem key={chromaticNote} value={chromaticNote}>
										{chromaticNote}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					))}
				</div>
			</div>
		</div>
	);
}
