import { Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BoxFretboard } from "@/components/BoxFretboard";
import { MAIN_DIMENSIONS } from "@/components/FretboardDiagram";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { Pitch } from "@/core/pitch";
import type { BoxPattern, DisplayMode, NoteName, Tuning } from "@/types/music";
import { BoxPlayControls } from "./BoxPlayControls";

// An expand-to-modal view of a single box pattern: the same diagram at the
// larger MAIN dimensions plus the play transport, for studying one shape close
// up. Trigger is a compact icon button rendered in the card corner.
export function BoxPatternDialog({
	pattern,
	stringCount,
	displayMode,
	highlightRoot,
	rootPitchClass,
	tuning,
	activePitch,
}: {
	pattern: BoxPattern;
	stringCount: number;
	displayMode: DisplayMode;
	highlightRoot: boolean;
	rootPitchClass?: NoteName;
	tuning: Tuning;
	activePitch?: Pitch | null;
}) {
	const { t } = useTranslation();
	const title = t("ui.boxPatterns.pattern", { n: pattern.index + 1 });

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					type="button"
					size="icon-xs"
					variant="ghost"
					className="text-muted-foreground hover:text-foreground"
					aria-label={t("ui.boxPatterns.expand", { name: title })}
					title={t("ui.boxPatterns.expand", { name: title })}
				>
					<Maximize2 />
				</Button>
			</DialogTrigger>
			<DialogContent className="rounded-xl sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="overflow-x-auto rounded-lg bg-muted/45 px-2 py-3">
					<BoxFretboard
						pattern={pattern}
						stringCount={stringCount}
						displayMode={displayMode}
						highlightRoot={highlightRoot}
						rootPitchClass={rootPitchClass}
						tuning={tuning}
						activePitch={activePitch}
						dimensions={MAIN_DIMENSIONS}
					/>
				</div>
				<div className="border-t border-border pt-3">
					<BoxPlayControls
						id={`box-${pattern.index}`}
						pattern={pattern}
						tuning={tuning}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
