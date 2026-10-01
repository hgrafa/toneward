import { ArrowDown, ArrowUp, Play, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { boxPlaybackSequence, type PlaybackDirection } from "@/core/playback";
import { useNotePlayback } from "@/hooks/NotePlaybackContext";
import type { BoxPattern, Tuning } from "@/types/music";

// The transport for one box pattern: a primary "up & down" run (the default
// practice direction) plus one-way ascending / descending drills. Clicking the
// active direction again stops it. Shared between the pattern card and the
// expand modal, so `id` must be stable per pattern across both.
export function BoxPlayControls({
	id,
	pattern,
	tuning,
}: {
	id: string;
	pattern: BoxPattern;
	tuning: Tuning;
}) {
	const { t } = useTranslation();
	const { playing, playbackError, play, stop } = useNotePlayback();

	const isActive = (direction: PlaybackDirection) =>
		playing?.id === id && playing.direction === direction;

	const toggle = (direction: PlaybackDirection) => {
		if (isActive(direction)) {
			stop();
			return;
		}
		play(
			id,
			boxPlaybackSequence(pattern.positions, tuning, direction),
			direction,
		);
	};

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button
				type="button"
				size="icon-sm"
				variant="default"
				onClick={() => toggle("up-down")}
				aria-pressed={isActive("up-down")}
				title={t("ui.boxPatterns.playUpDown")}
				aria-label={
					isActive("up-down")
						? t("ui.boxPatterns.stop")
						: t("ui.boxPatterns.playUpDown")
				}
				className="rounded-lg"
			>
				{isActive("up-down") ? (
					<Square className="fill-current" />
				) : (
					<Play className="fill-current" />
				)}
			</Button>
			<div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
				<Button
					type="button"
					size="icon-sm"
					variant={isActive("up") ? "secondary" : "ghost"}
					onClick={() => toggle("up")}
					aria-pressed={isActive("up")}
					aria-label={t("ui.boxPatterns.playUp")}
					title={t("ui.boxPatterns.playUp")}
				>
					{isActive("up") ? <Square className="fill-current" /> : <ArrowUp />}
				</Button>
				<Button
					type="button"
					size="icon-sm"
					variant={isActive("down") ? "secondary" : "ghost"}
					onClick={() => toggle("down")}
					aria-pressed={isActive("down")}
					aria-label={t("ui.boxPatterns.playDown")}
					title={t("ui.boxPatterns.playDown")}
				>
					{isActive("down") ? (
						<Square className="fill-current" />
					) : (
						<ArrowDown />
					)}
				</Button>
			</div>
			{(playbackError === id || playbackError === `note-${id}`) && (
				<p role="alert" className="w-full text-xs text-destructive">
					{t("ui.boxPatterns.playbackError")}
				</p>
			)}
		</div>
	);
}
