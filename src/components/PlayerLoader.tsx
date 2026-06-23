import { Music, Youtube } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";
import { fetchYouTubeTitle, parseYouTubeId } from "@/lib/youtube";

export function PlayerLoader() {
	const { t } = useTranslation();
	const { setSource } = useMediaPlayerCtx();
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const fileId = useId();

	function loadYouTube() {
		const videoId = parseYouTubeId(url);
		if (!videoId) {
			setError(t("errors.invalidYoutubeLink"));
			return;
		}
		setError(null);
		const trimmed = url.trim();
		setSource({ kind: "youtube", videoId, url: trimmed, title: trimmed });
		setUrl("");
		void fetchYouTubeTitle(trimmed).then((title) => {
			if (title) setSource({ kind: "youtube", videoId, url: trimmed, title });
		});
	}

	function loadFile(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith("audio/")) {
			setError(t("errors.invalidAudioFile"));
			return;
		}
		setError(null);
		setSource({
			kind: "mp3",
			objectUrl: URL.createObjectURL(file),
			title: file.name,
		});
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2 rounded-[11px] border border-white/15 bg-white/10 px-3 py-1.5">
				<Youtube className="size-4 shrink-0 text-white/50" />
				<input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") loadYouTube();
					}}
					placeholder={t("ui.showroom.youtubePlaceholder")}
					className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
				/>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={loadYouTube}
					className="h-9 flex-1 rounded-[11px] bg-brand-gradient font-semibold text-white text-sm"
				>
					{t("ui.showroom.load")}
				</button>
				<label
					htmlFor={fileId}
					className="flex h-9 cursor-pointer items-center gap-2 rounded-[11px] border border-white/15 bg-white/10 px-3 font-semibold text-white text-sm hover:bg-white/20"
				>
					<Music className="size-4" />
					{t("ui.showroom.uploadMp3")}
				</label>
				<input
					id={fileId}
					type="file"
					accept="audio/*"
					className="sr-only"
					onChange={(e) => loadFile(e.target.files?.[0])}
				/>
			</div>
			{error && <p className="text-red-300 text-xs">{error}</p>}
		</div>
	);
}
