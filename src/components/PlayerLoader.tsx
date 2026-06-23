import { Music, Youtube } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";
import { fetchYouTubeTitle, parseYouTubeId } from "@/lib/youtube";

export function PlayerLoader() {
	const { t } = useTranslation();
	const { setSource, recents } = useMediaPlayerCtx();
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

			<div className="flex flex-col gap-1.5 pt-0.5">
				<span className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
					{t("ui.player.recent")}
				</span>
				{recents.length > 0 ? (
					<div className="flex flex-col gap-1">
						{recents.map((r) => (
							<button
								key={r.kind === "youtube" ? r.videoId : r.title}
								type="button"
								onClick={() => setSource(r)}
								title={r.title}
								className="flex items-center gap-2 truncate rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-left text-white/80 text-xs hover:bg-white/15"
							>
								<Youtube className="size-3.5 shrink-0 text-white/40" />
								<span className="truncate">{r.title}</span>
							</button>
						))}
					</div>
				) : (
					<p className="px-0.5 py-1 text-white/35 text-xs italic">
						{t("ui.player.noRecent")}
					</p>
				)}
			</div>

			{error && <p className="text-red-300 text-xs">{error}</p>}
		</div>
	);
}
