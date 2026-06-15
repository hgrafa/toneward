const YT_HOSTS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"music.youtube.com",
	"youtu.be",
]);

/** Extract an 11-char YouTube video id from a URL, or null if not a YouTube link. */
export function parseYouTubeId(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}

	const host = url.hostname.toLowerCase();
	if (!YT_HOSTS.has(host)) return null;

	let id: string | null = null;
	if (host === "youtu.be") {
		id = url.pathname.slice(1).split("/")[0];
	} else if (url.pathname === "/watch") {
		id = url.searchParams.get("v");
	} else if (url.pathname.startsWith("/embed/")) {
		id = url.pathname.slice("/embed/".length).split("/")[0];
	} else if (url.pathname.startsWith("/shorts/")) {
		id = url.pathname.slice("/shorts/".length).split("/")[0];
	} else if (url.pathname.startsWith("/v/")) {
		id = url.pathname.slice("/v/".length).split("/")[0];
	}

	if (!id) return null;
	return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Best-effort track title via YouTube's public oEmbed endpoint (no API key). */
export async function fetchYouTubeTitle(url: string): Promise<string | null> {
	try {
		const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
			url,
		)}&format=json`;
		const res = await fetch(endpoint);
		if (!res.ok) return null;
		const data = (await res.json()) as { title?: string };
		return data.title ?? null;
	} catch {
		return null;
	}
}

let apiPromise: Promise<typeof window.YT> | null = null;

/** Load the YouTube IFrame Player API once (idempotent). */
export function loadYouTubeApi(): Promise<typeof window.YT> {
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (apiPromise) return apiPromise;

	apiPromise = new Promise((resolve) => {
		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previous?.();
			resolve(window.YT);
		};
		const tag = document.createElement("script");
		tag.src = "https://www.youtube.com/iframe_api";
		document.head.appendChild(tag);
	});
	return apiPromise;
}
