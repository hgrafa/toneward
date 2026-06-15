import { Music, Youtube } from "lucide-react";
import { useId, useState } from "react";
import { useShowroom } from "@/hooks/ShowroomContext";
import { fetchYouTubeTitle, parseYouTubeId } from "@/lib/youtube";

export function MediaSourceBar() {
	const { setAudioSource } = useShowroom();
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const fileId = useId();

	function loadYouTube() {
		const videoId = parseYouTubeId(url);
		if (!videoId) {
			setError("Enter a valid YouTube link.");
			return;
		}
		setError(null);
		const trimmed = url.trim();
		setAudioSource({ kind: "youtube", videoId, url: trimmed, title: trimmed });
		setUrl("");
		void fetchYouTubeTitle(trimmed).then((title) => {
			if (title)
				setAudioSource({ kind: "youtube", videoId, url: trimmed, title });
		});
	}

	function loadMp3(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith("audio/")) {
			setError("Choose an audio file.");
			return;
		}
		setError(null);
		setAudioSource({
			kind: "mp3",
			objectUrl: URL.createObjectURL(file),
			title: file.name,
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
			<div className="flex flex-1 items-center gap-2">
				<Youtube className="size-4 shrink-0 text-muted-foreground" />
				<input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") loadYouTube();
					}}
					placeholder="Paste a YouTube link…"
					className="min-w-40 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
				/>
				<button
					type="button"
					onClick={loadYouTube}
					className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
				>
					Load
				</button>
			</div>

			<label
				htmlFor={fileId}
				className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
			>
				<Music className="size-4" />
				Upload MP3
			</label>
			<input
				id={fileId}
				type="file"
				accept="audio/*"
				className="sr-only"
				onChange={(e) => loadMp3(e.target.files?.[0])}
			/>

			{error && <p className="w-full text-destructive text-xs">{error}</p>}
		</div>
	);
}
