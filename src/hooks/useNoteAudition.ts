import { useCallback } from "react";
import { getPitchAtPosition } from "@/core/pitch";
import type { FretPosition, Tuning } from "@/types/music";
import { useNotePlayback } from "./NotePlaybackContext";

export function useNoteAudition(id: string, tuning: Tuning) {
	const { play, playing, activePitch, playbackError } = useNotePlayback();
	const noteId = `note-${id}`;
	const audition = useCallback(
		(pos: FretPosition) => {
			play(
				noteId,
				[getPitchAtPosition(tuning, tuning.length - pos.string, pos.fret)],
				"up",
			);
		},
		[play, noteId, tuning],
	);
	return {
		audition,
		activePitch: playing?.id === noteId ? activePitch : null,
		playbackError: playbackError === noteId,
	};
}
