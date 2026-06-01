import { Minus, Plus } from "lucide-react";
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
	const {
		tuning,
		instrumentId,
		setInstrument,
		setStringTuning,
		setStringCount,
	} = useInstrument();

	return (
		<div className="flex flex-wrap items-center gap-4">
			{/* Instrument */}
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">Instrument</span>
				<Select value={instrumentId} onValueChange={setInstrument}>
					<SelectTrigger className="h-8 w-[130px] text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{INSTRUMENTS.map((inst) => (
							<SelectItem key={inst.id} value={inst.id}>
								{inst.name}
							</SelectItem>
						))}
						{instrumentId === CUSTOM_ID && (
							<SelectItem value={CUSTOM_ID}>Custom</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>

			{/* String count */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-label="Remove string"
					disabled={tuning.length <= MIN_STRINGS}
					onClick={() => setStringCount(tuning.length - 1)}
					className="flex size-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				>
					<Minus className="size-3.5" />
				</button>
				<span className="text-xs text-muted-foreground tabular-nums">
					{tuning.length} strings
				</span>
				<button
					type="button"
					aria-label="Add string"
					disabled={tuning.length >= MAX_STRINGS}
					onClick={() => setStringCount(tuning.length + 1)}
					className="flex size-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
				>
					<Plus className="size-3.5" />
				</button>
			</div>

			{/* Per-string tuning (low → high) */}
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">Tuning</span>
				<div className="flex flex-wrap gap-1">
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
								aria-label={`String ${tuning.length - index} tuning`}
								className="h-8 w-[58px] text-xs"
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
