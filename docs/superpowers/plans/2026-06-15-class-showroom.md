# Class Showroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar-switchable **Showroom** section for classes: a floating, collapsible audio dock (YouTube link or uploaded MP3, audio-only, with speed + ±10s controls) over a native-browser PDF viewer (upload + drag-and-drop), with no persistence of class content.

**Architecture:** A new `ViewContext` switches the app between the existing Fretboard tool and the new Showroom — no router. The current `App` body moves verbatim into `FretboardView`. The Showroom is one page (`ShowroomView`) holding a `MediaSourceBar` (set source), a `PdfViewer` (fills page, drag-and-drop), and a floating `AudioDock`. A single `useMediaPlayer` hook abstracts two playback backends (HTML5 `<audio>` for MP3, hidden YouTube IFrame player for YouTube) behind one API. Audio source + document live in `ShowroomContext` in memory only; blob URLs are revoked on replace/unmount.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (radix consolidated `radix-ui` package), lucide-react, Biome (tabs, double quotes, semicolons), Vitest + Testing Library, pnpm.

**Conventions for every task:**
- Run `pnpm lint:fix` before each commit; code must pass `pnpm lint`.
- Tests live beside their subject as `*.test.ts[x]`. Component/hook tests render under the relevant provider.
- Every commit message ends with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Empty `catch` blocks must contain a comment (Biome dislikes truly empty blocks), e.g. `catch { /* storage unavailable */ }`.

---

## File Structure

**New files**
- `src/types/showroom.ts` — `AudioSource`, `ShowroomDocument`, `AppView` types.
- `src/types/youtube.d.ts` — minimal ambient typings for the YouTube IFrame API.
- `src/lib/youtube.ts` — `parseYouTubeId`, `fetchYouTubeTitle`, `loadYouTubeApi`.
- `src/lib/youtube.test.ts` — tests for `parseYouTubeId`.
- `src/hooks/ViewContext.tsx` — `useView`: `view`, `setView`, `sidebarCollapsed`, `toggleSidebar` (localStorage-backed).
- `src/hooks/ViewContext.test.tsx` — view default/switch/persistence tests.
- `src/hooks/ShowroomContext.tsx` — `useShowroom`: in-memory `audioSource` + `currentDocument` + setters (blob revoke).
- `src/hooks/useMediaPlayer.ts` — unified player controller hook.
- `src/components/ui/slider.tsx` — vendored shadcn slider primitive (radix consolidated import).
- `src/components/AppSidebar.tsx` — left nav, two views, collapse toggle.
- `src/components/FretboardView.tsx` — current fretboard tool body (moved from `App.tsx`).
- `src/components/showroom/ShowroomView.tsx` — Showroom page composition + drag-and-drop.
- `src/components/showroom/MediaSourceBar.tsx` — set YouTube/MP3 source.
- `src/components/showroom/MediaSourceBar.test.tsx`
- `src/components/showroom/AudioDock.tsx` — floating collapsible transport dock.
- `src/components/showroom/AudioDock.test.tsx`
- `src/components/showroom/PdfViewer.tsx` — native iframe PDF viewer + empty state.
- `src/components/showroom/PdfViewer.test.tsx`
- `src/components/showroom/CLAUDE.md` — folder doc.

**Modified files**
- `src/App.tsx` — wrap in `ViewProvider`; render sidebar + active view.
- `src/components/CLAUDE.md` — note the new view-shell layout + showroom subfolder.

---

## Task 1: Types

**Files:**
- Create: `src/types/showroom.ts`

- [ ] **Step 1: Create the types file**

```ts
export type AppView = "fretboard" | "showroom";

export type AudioSource =
	| { kind: "youtube"; videoId: string; url: string; title: string }
	| { kind: "mp3"; objectUrl: string; title: string };

export interface ShowroomDocument {
	name: string;
	objectUrl: string;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/showroom.ts
git commit -m "feat: add showroom domain types"
```

---

## Task 2: YouTube URL parsing

**Files:**
- Create: `src/lib/youtube.ts`
- Test: `src/lib/youtube.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
	it("parses standard watch URLs", () => {
		expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("parses watch URLs with extra params", () => {
		expect(
			parseYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc"),
		).toBe("dQw4w9WgXcQ");
	});

	it("parses youtu.be short links", () => {
		expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=xyz")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("parses /embed/ and /shorts/ URLs", () => {
		expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
		expect(parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("returns null for non-YouTube hosts", () => {
		expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
	});

	it("returns null for malformed input", () => {
		expect(parseYouTubeId("not a url")).toBeNull();
		expect(parseYouTubeId("")).toBeNull();
		expect(parseYouTubeId("https://www.youtube.com/watch?v=tooShort")).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/youtube.test.ts`
Expected: FAIL — `parseYouTubeId` not exported.

- [ ] **Step 3: Implement `src/lib/youtube.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/youtube.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint:fix
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat: parse YouTube ids and load the IFrame API"
```

---

## Task 3: YouTube ambient typings

**Files:**
- Create: `src/types/youtube.d.ts`

- [ ] **Step 1: Create the ambient declaration**

```ts
// Minimal typings for the YouTube IFrame Player API surface we use.
export {};

declare global {
	interface YTPlayer {
		playVideo(): void;
		pauseVideo(): void;
		seekTo(seconds: number, allowSeekAhead: boolean): void;
		getCurrentTime(): number;
		getDuration(): number;
		setVolume(volume: number): void; // 0..100
		setPlaybackRate(rate: number): void;
		getAvailablePlaybackRates(): number[];
		loadVideoById(videoId: string): void;
		destroy(): void;
	}

	interface YTPlayerEvent {
		target: YTPlayer;
		data: number;
	}

	interface YTNamespace {
		Player: new (
			el: HTMLElement | string,
			options: {
				videoId?: string;
				playerVars?: Record<string, number | string>;
				events?: {
					onReady?: (event: YTPlayerEvent) => void;
					onStateChange?: (event: YTPlayerEvent) => void;
					onError?: (event: YTPlayerEvent) => void;
				};
			},
		) => YTPlayer;
		PlayerState: {
			PLAYING: number;
			PAUSED: number;
			ENDED: number;
			BUFFERING: number;
			CUED: number;
			UNSTARTED: number;
		};
	}

	interface Window {
		YT: YTNamespace;
		onYouTubeIframeAPIReady?: () => void;
	}
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc -b`
Expected: no errors (`src/lib/youtube.ts` now resolves `window.YT`).

- [ ] **Step 3: Commit**

```bash
git add src/types/youtube.d.ts
git commit -m "feat: add YouTube IFrame API typings"
```

---

## Task 4: ViewContext (navigation state)

**Files:**
- Create: `src/hooks/ViewContext.tsx`
- Test: `src/hooks/ViewContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ViewProvider, useView } from "./ViewContext";

function Probe() {
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();
	return (
		<div>
			<span data-testid="view">{view}</span>
			<span data-testid="collapsed">{String(sidebarCollapsed)}</span>
			<button type="button" onClick={() => setView("showroom")}>
				go showroom
			</button>
			<button type="button" onClick={toggleSidebar}>
				toggle
			</button>
		</div>
	);
}

describe("ViewContext", () => {
	beforeEach(() => localStorage.clear());

	it("defaults to the fretboard view, expanded sidebar", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		expect(screen.getByTestId("view")).toHaveTextContent("fretboard");
		expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
	});

	it("switches view and persists it to localStorage", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		act(() => screen.getByText("go showroom").click());
		expect(screen.getByTestId("view")).toHaveTextContent("showroom");
		expect(localStorage.getItem("fretboard.view")).toBe("showroom");
	});

	it("toggles and persists sidebar collapse", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		act(() => screen.getByText("toggle").click());
		expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
		expect(localStorage.getItem("fretboard.sidebarCollapsed")).toBe("true");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/ViewContext.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks/ViewContext.tsx`**

```tsx
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { AppView } from "@/types/showroom";

const VIEW_KEY = "fretboard.view";
const SIDEBAR_KEY = "fretboard.sidebarCollapsed";

function loadView(): AppView {
	try {
		return localStorage.getItem(VIEW_KEY) === "showroom"
			? "showroom"
			: "fretboard";
	} catch {
		return "fretboard";
	}
}

function loadCollapsed(): boolean {
	try {
		return localStorage.getItem(SIDEBAR_KEY) === "true";
	} catch {
		return false;
	}
}

interface ViewState {
	view: AppView;
	setView: (view: AppView) => void;
	sidebarCollapsed: boolean;
	toggleSidebar: () => void;
}

const ViewContext = createContext<ViewState | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
	const [view, setView] = useState<AppView>(loadView);
	const [sidebarCollapsed, setSidebarCollapsed] =
		useState<boolean>(loadCollapsed);

	useEffect(() => {
		try {
			localStorage.setItem(VIEW_KEY, view);
		} catch {
			/* storage unavailable */
		}
	}, [view]);

	useEffect(() => {
		try {
			localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
		} catch {
			/* storage unavailable */
		}
	}, [sidebarCollapsed]);

	const value = useMemo<ViewState>(
		() => ({
			view,
			setView,
			sidebarCollapsed,
			toggleSidebar: () => setSidebarCollapsed((c) => !c),
		}),
		[view, sidebarCollapsed],
	);

	return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewState {
	const ctx = useContext(ViewContext);
	if (!ctx) throw new Error("useView must be used within a ViewProvider");
	return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/ViewContext.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint:fix
git add src/hooks/ViewContext.tsx src/hooks/ViewContext.test.tsx
git commit -m "feat: add ViewContext for sidebar navigation"
```

---

## Task 5: ShowroomContext (in-memory source + document)

**Files:**
- Create: `src/hooks/ShowroomContext.tsx`

**Note:** the document field is named `currentDocument` to avoid shadowing the global `document`.

- [ ] **Step 1: Implement `src/hooks/ShowroomContext.tsx`**

```tsx
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AudioSource, ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	audioSource: AudioSource | null;
	currentDocument: ShowroomDocument | null;
	setAudioSource: (source: AudioSource | null) => void;
	setCurrentDocument: (doc: ShowroomDocument | null) => void;
}

const ShowroomContext = createContext<ShowroomState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function ShowroomProvider({ children }: { children: ReactNode }) {
	const [audioSource, setAudioSourceState] = useState<AudioSource | null>(null);
	const [currentDocument, setCurrentDocumentState] =
		useState<ShowroomDocument | null>(null);

	// Keep latest values in refs so the unmount cleanup can revoke live blob URLs.
	const audioRef = useRef<AudioSource | null>(null);
	const docRef = useRef<ShowroomDocument | null>(null);
	audioRef.current = audioSource;
	docRef.current = currentDocument;

	const setAudioSource = useCallback((source: AudioSource | null) => {
		setAudioSourceState((prev) => {
			if (prev?.kind === "mp3") revokeIfBlob(prev.objectUrl);
			return source;
		});
	}, []);

	const setCurrentDocument = useCallback((doc: ShowroomDocument | null) => {
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return doc;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (audioRef.current?.kind === "mp3")
				revokeIfBlob(audioRef.current.objectUrl);
			if (docRef.current) revokeIfBlob(docRef.current.objectUrl);
		};
	}, []);

	const value = useMemo<ShowroomState>(
		() => ({
			audioSource,
			currentDocument,
			setAudioSource,
			setCurrentDocument,
		}),
		[audioSource, currentDocument, setAudioSource, setCurrentDocument],
	);

	return (
		<ShowroomContext.Provider value={value}>
			{children}
		</ShowroomContext.Provider>
	);
}

export function useShowroom(): ShowroomState {
	const ctx = useContext(ShowroomContext);
	if (!ctx)
		throw new Error("useShowroom must be used within a ShowroomProvider");
	return ctx;
}
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm exec tsc -b` → no errors.

```bash
pnpm lint:fix
git add src/hooks/ShowroomContext.tsx
git commit -m "feat: add ShowroomContext for in-memory media state"
```

---

## Task 6: useMediaPlayer (unified player controller)

**Files:**
- Create: `src/hooks/useMediaPlayer.ts`

The hook receives the active `AudioSource`, a ref to an `<audio>` element (MP3 backend), and a ref to a hidden container `<div>` (YouTube backend). It owns exactly one backend at a time and exposes a uniform transport API. YouTube volume is 0–100; we expose 0–1 and scale.

- [ ] **Step 1: Implement `src/hooks/useMediaPlayer.ts`**

```ts
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "@/lib/youtube";
import type { AudioSource } from "@/types/showroom";

export interface MediaPlayerApi {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playbackRate: number;
	error: string | null;
	play: () => void;
	pause: () => void;
	toggle: () => void;
	seek: (time: number) => void;
	skip: (delta: number) => void;
	setVolume: (v: number) => void;
	setPlaybackRate: (rate: number) => void;
}

export function useMediaPlayer(
	source: AudioSource | null,
	audioRef: RefObject<HTMLAudioElement | null>,
	ytContainerRef: RefObject<HTMLElement | null>,
): MediaPlayerApi {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolumeState] = useState(1);
	const [playbackRate, setRateState] = useState(1);
	const [error, setError] = useState<string | null>(null);

	const ytPlayerRef = useRef<YTPlayer | null>(null);
	const pollRef = useRef<number | null>(null);

	const stopPolling = useCallback(() => {
		if (pollRef.current !== null) {
			window.clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	// Reset transport state whenever the source changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on source identity
	useEffect(() => {
		setIsPlaying(false);
		setCurrentTime(0);
		setDuration(0);
		setError(null);
	}, [source]);

	// MP3 backend: bind to the <audio> element.
	useEffect(() => {
		if (source?.kind !== "mp3") return;
		const el = audioRef.current;
		if (!el) return;

		el.src = source.objectUrl;
		el.volume = volume;
		el.playbackRate = playbackRate;

		const onTime = () => setCurrentTime(el.currentTime);
		const onMeta = () => setDuration(el.duration || 0);
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onEnded = () => setIsPlaying(false);
		const onError = () => setError("Could not play this audio file.");

		el.addEventListener("timeupdate", onTime);
		el.addEventListener("loadedmetadata", onMeta);
		el.addEventListener("play", onPlay);
		el.addEventListener("pause", onPause);
		el.addEventListener("ended", onEnded);
		el.addEventListener("error", onError);

		return () => {
			el.removeEventListener("timeupdate", onTime);
			el.removeEventListener("loadedmetadata", onMeta);
			el.removeEventListener("play", onPlay);
			el.removeEventListener("pause", onPause);
			el.removeEventListener("ended", onEnded);
			el.removeEventListener("error", onError);
			el.pause();
			el.removeAttribute("src");
			el.load();
		};
	}, [source, audioRef, volume, playbackRate]);

	// YouTube backend: create a hidden IFrame player.
	useEffect(() => {
		if (source?.kind !== "youtube") return;
		const container = ytContainerRef.current;
		if (!container) return;

		let cancelled = false;
		loadYouTubeApi()
			.then((YT) => {
				if (cancelled) return;
				const mount = document.createElement("div");
				container.appendChild(mount);
				ytPlayerRef.current = new YT.Player(mount, {
					videoId: source.videoId,
					playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
					events: {
						onReady: (e) => {
							e.target.setVolume(Math.round(volume * 100));
							setDuration(e.target.getDuration());
						},
						onStateChange: (e) => {
							setIsPlaying(e.data === YT.PlayerState.PLAYING);
							if (e.data === YT.PlayerState.PLAYING) {
								stopPolling();
								pollRef.current = window.setInterval(() => {
									const p = ytPlayerRef.current;
									if (p) {
										setCurrentTime(p.getCurrentTime());
										setDuration(p.getDuration());
									}
								}, 250);
							} else {
								stopPolling();
							}
						},
						onError: () => setError("Could not play this YouTube video."),
					},
				});
			})
			.catch(() => setError("Could not load the YouTube player."));

		return () => {
			cancelled = true;
			stopPolling();
			ytPlayerRef.current?.destroy();
			ytPlayerRef.current = null;
			container.replaceChildren();
		};
	}, [source, ytContainerRef, volume, stopPolling]);

	const play = useCallback(() => {
		if (source?.kind === "mp3") audioRef.current?.play().catch(() => {});
		else ytPlayerRef.current?.playVideo();
	}, [source, audioRef]);

	const pause = useCallback(() => {
		if (source?.kind === "mp3") audioRef.current?.pause();
		else ytPlayerRef.current?.pauseVideo();
	}, [source, audioRef]);

	const toggle = useCallback(() => {
		if (isPlaying) pause();
		else play();
	}, [isPlaying, play, pause]);

	const seek = useCallback(
		(time: number) => {
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.currentTime = time;
			} else {
				ytPlayerRef.current?.seekTo(time, true);
			}
			setCurrentTime(time);
		},
		[source, audioRef],
	);

	const skip = useCallback(
		(delta: number) => {
			const next = Math.max(0, Math.min(duration || Infinity, currentTime + delta));
			seek(next);
		},
		[currentTime, duration, seek],
	);

	const setVolume = useCallback(
		(v: number) => {
			const clamped = Math.max(0, Math.min(1, v));
			setVolumeState(clamped);
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.volume = clamped;
			} else {
				ytPlayerRef.current?.setVolume(Math.round(clamped * 100));
			}
		},
		[source, audioRef],
	);

	const setPlaybackRate = useCallback(
		(rate: number) => {
			setRateState(rate);
			if (source?.kind === "mp3") {
				if (audioRef.current) audioRef.current.playbackRate = rate;
			} else {
				ytPlayerRef.current?.setPlaybackRate(rate);
			}
		},
		[source, audioRef],
	);

	useEffect(() => stopPolling, [stopPolling]);

	return {
		isPlaying,
		currentTime,
		duration,
		volume,
		playbackRate,
		error,
		play,
		pause,
		toggle,
		seek,
		skip,
		setVolume,
		setPlaybackRate,
	};
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc -b`
Expected: no errors. (If Biome flags the empty `catch`/arrow `() => {}` in `play`, change to `.catch(() => setError("Playback was blocked."))`.)

- [ ] **Step 3: Lint + commit**

```bash
pnpm lint:fix
git add src/hooks/useMediaPlayer.ts
git commit -m "feat: add useMediaPlayer controller (mp3 + youtube)"
```

> **Verification note:** `useMediaPlayer`'s media wiring is exercised by manual testing (jsdom has no real media/YouTube). The unit-testable logic (URL parsing) is covered in Task 2; `AudioDock` tests (Task 9) inject a fake player.

---

## Task 7: Slider primitive

**Files:**
- Create: `src/components/ui/slider.tsx`

This is a vendored shadcn (new-york) slider adapted to the repo's consolidated `radix-ui` import (matching `select.tsx`). Do **not** hand-write divergent markup.

- [ ] **Step 1: Create `src/components/ui/slider.tsx`**

```tsx
import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
	const values = Array.isArray(value)
		? value
		: Array.isArray(defaultValue)
			? defaultValue
			: [min, max];

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className={cn(
					"relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cn(
						"absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
					)}
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length thumb list
					key={index}
					className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm transition-[color,box-shadow] hover:ring-4 hover:ring-ring/50 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm exec tsc -b` → no errors.

```bash
pnpm lint:fix
git add src/components/ui/slider.tsx
git commit -m "feat: add slider ui primitive"
```

---

## Task 8: PdfViewer

**Files:**
- Create: `src/components/showroom/PdfViewer.tsx`
- Test: `src/components/showroom/PdfViewer.test.tsx`

`PdfViewer` shows a drop zone when there is no document, and an `<iframe>` of the document's blob URL when there is. The file-acceptance + error logic lives in a pure helper so it is testable without the DOM file dialog. Drag-and-drop is wired by the parent (`ShowroomView`) but the upload button + validation live here.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShowroomProvider, useShowroom } from "@/hooks/ShowroomContext";
import { PdfViewer } from "./PdfViewer";

function setup() {
	return render(
		<ShowroomProvider>
			<PdfViewer />
		</ShowroomProvider>,
	);
}

describe("PdfViewer", () => {
	it("shows the empty-state drop zone when no document is loaded", () => {
		setup();
		expect(screen.getByText(/upload a pdf/i)).toBeInTheDocument();
	});

	it("rejects a non-PDF file with an error message", () => {
		setup();
		const input = screen.getByLabelText(/upload a pdf/i) as HTMLInputElement;
		const file = new File(["x"], "notes.txt", { type: "text/plain" });
		fireEvent.change(input, { target: { files: [file] } });
		expect(screen.getByText(/only pdf files/i)).toBeInTheDocument();
	});

	it("renders a viewer once a PDF document is set", () => {
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");

		function Loader() {
			const { setCurrentDocument } = useShowroom();
			return (
				<button
					type="button"
					onClick={() =>
						setCurrentDocument({ name: "score.pdf", objectUrl: "blob:fake" })
					}
				>
					load
				</button>
			);
		}

		render(
			<ShowroomProvider>
				<Loader />
				<PdfViewer />
			</ShowroomProvider>,
		);
		fireEvent.click(screen.getByText("load"));
		expect(screen.getByTitle("score.pdf")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/showroom/PdfViewer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/showroom/PdfViewer.tsx`**

```tsx
import { FileText, Upload } from "lucide-react";
import { useId, useState } from "react";
import { useShowroom } from "@/hooks/ShowroomContext";

export function PdfViewer() {
	const { currentDocument, setCurrentDocument } = useShowroom();
	const [error, setError] = useState<string | null>(null);
	const inputId = useId();

	function acceptFile(file: File | undefined) {
		if (!file) return;
		if (file.type !== "application/pdf") {
			setError("Only PDF files are supported.");
			return;
		}
		setError(null);
		setCurrentDocument({ name: file.name, objectUrl: URL.createObjectURL(file) });
	}

	if (currentDocument) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-between border-border border-b px-4 py-2 text-sm">
					<span className="flex items-center gap-2 truncate text-muted-foreground">
						<FileText className="size-4 shrink-0" />
						<span className="truncate">{currentDocument.name}</span>
					</span>
					<button
						type="button"
						onClick={() => setCurrentDocument(null)}
						className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
					>
						Close
					</button>
				</div>
				<iframe
					title={currentDocument.name}
					src={currentDocument.objectUrl}
					className="h-full w-full flex-1border-0"
				/>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
			<FileText className="size-10 text-muted-foreground" />
			<label
				htmlFor={inputId}
				className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
			>
				<Upload className="size-4" />
				Upload a PDF
			</label>
			<p className="text-xs text-muted-foreground">…or drag a file onto the page</p>
			{error && <p className="text-xs text-destructive">{error}</p>}
			<input
				id={inputId}
				type="file"
				accept="application/pdf"
				className="sr-only"
				onChange={(e) => acceptFile(e.target.files?.[0])}
			/>
		</div>
	);
}
```

> Fix the obvious typo when implementing: the iframe className should be `"h-full w-full flex-1 border-0"` (space before `border-0`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/showroom/PdfViewer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint:fix
git add src/components/showroom/PdfViewer.tsx src/components/showroom/PdfViewer.test.tsx
git commit -m "feat: add native PDF viewer with upload + validation"
```

---

## Task 9: AudioDock

**Files:**
- Create: `src/components/showroom/AudioDock.tsx`
- Test: `src/components/showroom/AudioDock.test.tsx`

`AudioDock` is presentational: it takes a `MediaPlayerApi` + the current source title/kind as props and renders transport controls. It also renders the `<audio>` element and hidden YouTube container that the player binds to (refs passed down from `ShowroomView`). To keep it testable, the dock accepts the API + refs as props; `ShowroomView` owns the hook.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MediaPlayerApi } from "@/hooks/useMediaPlayer";
import { AudioDock } from "./AudioDock";

function fakeApi(overrides: Partial<MediaPlayerApi> = {}): MediaPlayerApi {
	return {
		isPlaying: false,
		currentTime: 0,
		duration: 100,
		volume: 1,
		playbackRate: 1,
		error: null,
		play: vi.fn(),
		pause: vi.fn(),
		toggle: vi.fn(),
		seek: vi.fn(),
		skip: vi.fn(),
		setVolume: vi.fn(),
		setPlaybackRate: vi.fn(),
		...overrides,
	};
}

describe("AudioDock", () => {
	it("calls toggle when play/pause is clicked", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /play/i }));
		expect(api.toggle).toHaveBeenCalledTimes(1);
	});

	it("skips backward and forward by 10s", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /back 10/i }));
		fireEvent.click(screen.getByRole("button", { name: /forward 10/i }));
		expect(api.skip).toHaveBeenNthCalledWith(1, -10);
		expect(api.skip).toHaveBeenNthCalledWith(2, 10);
	});

	it("changes playback speed", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /speed/i }));
		fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
		expect(api.setPlaybackRate).toHaveBeenCalledWith(0.5);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/showroom/AudioDock.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/showroom/AudioDock.tsx`**

```tsx
import {
	ChevronDown,
	ChevronUp,
	Gauge,
	Pause,
	Play,
	RotateCcw,
	RotateCw,
	Volume2,
} from "lucide-react";
import { type RefObject, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { MediaPlayerApi } from "@/hooks/useMediaPlayer";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioDockProps {
	api: MediaPlayerApi;
	title: string;
	kind: "youtube" | "mp3";
	audioRef: RefObject<HTMLAudioElement | null>;
	ytContainerRef: RefObject<HTMLDivElement | null>;
}

export function AudioDock({
	api,
	title,
	kind,
	audioRef,
	ytContainerRef,
}: AudioDockProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [speedOpen, setSpeedOpen] = useState(false);

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-border border-t bg-card/95 backdrop-blur">
			{/* Hidden media backends */}
			{/* biome-ignore lint/a11y/useMediaCaption: user-supplied practice audio */}
			<audio ref={audioRef} className="sr-only" />
			<div ref={ytContainerRef} className="sr-only" aria-hidden="true" />

			<div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
				<button
					type="button"
					aria-label={api.isPlaying ? "Pause" : "Play"}
					onClick={api.toggle}
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
				>
					{api.isPlaying ? (
						<Pause className="size-4" />
					) : (
						<Play className="size-4" />
					)}
				</button>

				{!collapsed && (
					<>
						<button
							type="button"
							aria-label="Back 10 seconds"
							onClick={() => api.skip(-10)}
							className="text-muted-foreground hover:text-foreground"
						>
							<RotateCcw className="size-4" />
						</button>
						<button
							type="button"
							aria-label="Forward 10 seconds"
							onClick={() => api.skip(10)}
							className="text-muted-foreground hover:text-foreground"
						>
							<RotateCw className="size-4" />
						</button>

						<span className="w-10 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
							{formatTime(api.currentTime)}
						</span>
						<Slider
							aria-label="Seek"
							min={0}
							max={api.duration || 0}
							step={1}
							value={[Math.min(api.currentTime, api.duration || 0)]}
							onValueChange={([v]) => api.seek(v)}
							className="min-w-24 flex-1"
						/>
						<span className="w-10 shrink-0 text-muted-foreground text-xs tabular-nums">
							{formatTime(api.duration)}
						</span>

						<div className="relative">
							<button
								type="button"
								aria-label="Speed"
								onClick={() => setSpeedOpen((o) => !o)}
								className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
							>
								<Gauge className="size-4" />
								{api.playbackRate}×
							</button>
							{speedOpen && (
								<div className="absolute right-0 bottom-full mb-2 flex flex-col rounded-md border border-border bg-popover p-1 shadow-md">
									{SPEEDS.map((rate) => (
										<button
											key={rate}
											type="button"
											onClick={() => {
												api.setPlaybackRate(rate);
												setSpeedOpen(false);
											}}
											className={`rounded px-3 py-1 text-left text-xs hover:bg-accent ${
												api.playbackRate === rate ? "text-primary" : ""
											}`}
										>
											{rate}×
										</button>
									))}
								</div>
							)}
						</div>

						<div className="hidden items-center gap-2 sm:flex">
							<Volume2 className="size-4 text-muted-foreground" />
							<Slider
								aria-label="Volume"
								min={0}
								max={1}
								step={0.01}
								value={[api.volume]}
								onValueChange={([v]) => api.setVolume(v)}
								className="w-20"
							/>
						</div>
					</>
				)}

				<span className="hidden max-w-40 truncate text-muted-foreground text-xs md:block">
					{kind === "youtube" ? "▶ " : "♪ "}
					{title}
				</span>

				<button
					type="button"
					aria-label={collapsed ? "Expand player" : "Collapse player"}
					onClick={() => setCollapsed((c) => !c)}
					className="ml-auto text-muted-foreground hover:text-foreground"
				>
					{collapsed ? (
						<ChevronUp className="size-4" />
					) : (
						<ChevronDown className="size-4" />
					)}
				</button>
			</div>

			{api.error && (
				<p className="px-4 pb-2 text-destructive text-xs">{api.error}</p>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/showroom/AudioDock.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint:fix
git add src/components/showroom/AudioDock.tsx src/components/showroom/AudioDock.test.tsx
git commit -m "feat: add floating collapsible audio dock"
```

---

## Task 10: MediaSourceBar

**Files:**
- Create: `src/components/showroom/MediaSourceBar.tsx`
- Test: `src/components/showroom/MediaSourceBar.test.tsx`

Sets the current audio source: a text input + "Load" for YouTube (validated via `parseYouTubeId`), and a file picker for MP3. On a valid YouTube URL it sets the source immediately with the URL as the title, then upgrades the title via `fetchYouTubeTitle` (best-effort).

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShowroomProvider, useShowroom } from "@/hooks/ShowroomContext";
import { MediaSourceBar } from "./MediaSourceBar";

vi.mock("@/lib/youtube", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/youtube")>();
	return { ...actual, fetchYouTubeTitle: vi.fn(async () => null) };
});

function Probe() {
	const { audioSource } = useShowroom();
	return <span data-testid="source">{audioSource?.kind ?? "none"}</span>;
}

function setup() {
	return render(
		<ShowroomProvider>
			<MediaSourceBar />
			<Probe />
		</ShowroomProvider>,
	);
}

describe("MediaSourceBar", () => {
	it("loads a valid YouTube URL as the audio source", async () => {
		setup();
		fireEvent.change(screen.getByPlaceholderText(/youtube/i), {
			target: { value: "https://youtu.be/dQw4w9WgXcQ" },
		});
		fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByTestId("source")).toHaveTextContent("youtube"),
		);
	});

	it("shows an error for an invalid YouTube URL", () => {
		setup();
		fireEvent.change(screen.getByPlaceholderText(/youtube/i), {
			target: { value: "https://vimeo.com/1" },
		});
		fireEvent.click(screen.getByRole("button", { name: /load/i }));
		expect(screen.getByText(/valid youtube/i)).toBeInTheDocument();
		expect(screen.getByTestId("source")).toHaveTextContent("none");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/showroom/MediaSourceBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/showroom/MediaSourceBar.tsx`**

```tsx
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

			{error && (
				<p className="w-full text-destructive text-xs">{error}</p>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/showroom/MediaSourceBar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint + commit**

```bash
pnpm lint:fix
git add src/components/showroom/MediaSourceBar.tsx src/components/showroom/MediaSourceBar.test.tsx
git commit -m "feat: add media source bar (youtube + mp3)"
```

---

## Task 11: ShowroomView (composition + drag-and-drop)

**Files:**
- Create: `src/components/showroom/ShowroomView.tsx`

Owns the `useMediaPlayer` hook, passes its API + refs to the dock, lays out the page, and wires page-level drag-and-drop for PDFs.

- [ ] **Step 1: Implement `src/components/showroom/ShowroomView.tsx`**

```tsx
import { useRef, useState } from "react";
import { useShowroom } from "@/hooks/ShowroomContext";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { AudioDock } from "./AudioDock";
import { MediaSourceBar } from "./MediaSourceBar";
import { PdfViewer } from "./PdfViewer";

export function ShowroomView() {
	const { audioSource, setCurrentDocument } = useShowroom();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const ytContainerRef = useRef<HTMLDivElement | null>(null);
	const [dragging, setDragging] = useState(false);

	const api = useMediaPlayer(audioSource, audioRef, ytContainerRef);

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file?.type === "application/pdf") {
			setCurrentDocument({
				name: file.name,
				objectUrl: URL.createObjectURL(file),
			});
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop target wrapper
		<div
			className="relative flex h-full flex-col gap-4"
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={onDrop}
		>
			<MediaSourceBar />

			<div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-border bg-card pb-16">
				<PdfViewer />
			</div>

			{dragging && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-primary border-dashed bg-background/80 text-sm font-medium">
					Drop a PDF to open it
				</div>
			)}

			{audioSource && (
				<AudioDock
					api={api}
					title={audioSource.title}
					kind={audioSource.kind}
					audioRef={audioRef}
					ytContainerRef={ytContainerRef}
				/>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm exec tsc -b` → no errors.

```bash
pnpm lint:fix
git add src/components/showroom/ShowroomView.tsx
git commit -m "feat: compose ShowroomView with drag-and-drop"
```

---

## Task 12: AppSidebar

**Files:**
- Create: `src/components/AppSidebar.tsx`

- [ ] **Step 1: Implement `src/components/AppSidebar.tsx`**

```tsx
import { Guitar, Music4, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useView } from "@/hooks/ViewContext";
import type { AppView } from "@/types/showroom";

const NAV: { view: AppView; label: string; icon: typeof Guitar }[] = [
	{ view: "fretboard", label: "Fretboard", icon: Guitar },
	{ view: "showroom", label: "Showroom", icon: Music4 },
];

export function AppSidebar() {
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();

	return (
		<aside
			className={`flex shrink-0 flex-col border-border border-r bg-card transition-[width] ${
				sidebarCollapsed ? "w-14" : "w-48"
			}`}
		>
			<div className="flex h-14 items-center justify-between px-3">
				{!sidebarCollapsed && (
					<span className="font-bold text-sm tracking-tight">Scale Training</span>
				)}
				<button
					type="button"
					aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					onClick={toggleSidebar}
					className="text-muted-foreground hover:text-foreground"
				>
					{sidebarCollapsed ? (
						<PanelLeftOpen className="size-5" />
					) : (
						<PanelLeftClose className="size-5" />
					)}
				</button>
			</div>

			<nav className="flex flex-col gap-1 p-2">
				{NAV.map(({ view: v, label, icon: Icon }) => (
					<button
						key={v}
						type="button"
						onClick={() => setView(v)}
						aria-current={view === v ? "page" : undefined}
						className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							view === v
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted"
						} ${sidebarCollapsed ? "justify-center" : ""}`}
						title={label}
					>
						<Icon className="size-5 shrink-0" />
						{!sidebarCollapsed && label}
					</button>
				))}
			</nav>
		</aside>
	);
}
```

- [ ] **Step 2: Type-check + commit**

Run: `pnpm exec tsc -b` → no errors.

```bash
pnpm lint:fix
git add src/components/AppSidebar.tsx
git commit -m "feat: add collapsible app sidebar"
```

---

## Task 13: Extract FretboardView + wire App shell

**Files:**
- Create: `src/components/FretboardView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/FretboardView.tsx` (move the current App body verbatim)**

```tsx
import { useRef } from "react";
import { BoxPatterns } from "@/components/BoxPatterns";
import { Editor } from "@/components/Editor";
import { Fretboard } from "@/components/Fretboard";
import { Toolbar } from "@/components/Toolbar";
import { TuningControls } from "@/components/TuningControls";

export function FretboardView() {
	const fretboardRef = useRef<HTMLDivElement>(null);

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-6">
			<h1 className="font-bold text-2xl tracking-tight">Scale Training</h1>

			<Editor />

			<TuningControls />

			<Toolbar fretboardRef={fretboardRef} />

			<div
				ref={fretboardRef}
				className="overflow-x-auto rounded-lg border border-border bg-card p-4"
			>
				<Fretboard />
			</div>

			<BoxPatterns />
		</div>
	);
}
```

- [ ] **Step 2: Rewrite `src/App.tsx`**

```tsx
import { AppSidebar } from "@/components/AppSidebar";
import { FretboardView } from "@/components/FretboardView";
import { ShowroomView } from "@/components/showroom/ShowroomView";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { ShowroomProvider } from "@/hooks/ShowroomContext";
import { ViewProvider, useView } from "@/hooks/ViewContext";

export default function App() {
	return (
		<ViewProvider>
			<FretboardProvider>
				<ShowroomProvider>
					<AppShell />
				</ShowroomProvider>
			</FretboardProvider>
		</ViewProvider>
	);
}

function AppShell() {
	const { view } = useView();

	return (
		<div className="flex h-screen bg-background text-foreground">
			<AppSidebar />
			<main className="flex-1 overflow-y-auto">
				{view === "fretboard" ? <FretboardView /> : <ShowroomView />}
			</main>
		</div>
	);
}
```

> Keep both `FretboardProvider` and `ShowroomProvider` always mounted so switching views never tears down state mid-session. `ShowroomView` itself only renders when `view === "showroom"`, so the audio dock and player exist only while the Showroom is active (Showroom-only dock, per spec).

- [ ] **Step 3: Type-check + full test run**

Run: `pnpm exec tsc -b && pnpm test`
Expected: build clean; all tests pass (existing 53 + new).

- [ ] **Step 4: Lint + commit**

```bash
pnpm lint:fix
git add src/App.tsx src/components/FretboardView.tsx
git commit -m "feat: wire sidebar shell with fretboard + showroom views"
```

---

## Task 14: Folder docs

**Files:**
- Create: `src/components/showroom/CLAUDE.md`
- Modify: `src/components/CLAUDE.md`

- [ ] **Step 1: Create `src/components/showroom/CLAUDE.md`**

```markdown
# Showroom — Class media tools

A sidebar section for classes: play a YouTube link or uploaded MP3 (audio-only) and
view a PDF (partiture / class doc). One page; the audio dock floats; nothing persists.

## Components
- `ShowroomView` — page composition; owns `useMediaPlayer`, wires page drag-and-drop.
- `MediaSourceBar` — set the current audio source (YouTube URL or MP3 file).
- `AudioDock` — floating, collapsible transport (play/pause, ±10s, seek, speed, volume).
  Presentational: receives a `MediaPlayerApi` + the `<audio>`/YouTube container refs.
- `PdfViewer` — native `<iframe>` viewer + empty-state upload; validates `application/pdf`.

## State
- `hooks/ShowroomContext` — in-memory `audioSource` + `currentDocument` (blob URLs revoked
  on replace/unmount). No persistence — fresh each reload, by design.
- `hooks/useMediaPlayer` — one controller over two backends (HTML5 `<audio>` for MP3,
  hidden YouTube IFrame for YouTube). YouTube volume is 0–100; the API exposes 0–1.

## What NOT to do
- Don't add a persistence layer or a media library — explicitly out of scope (YAGNI).
- Don't show the YouTube video frame — audio-only; the iframe stays visually hidden.
- Don't pull in pdf.js — the native browser viewer is intentional.
```

- [ ] **Step 2: Append a note to `src/components/CLAUDE.md`**

Add under the `## Layout` section:

```markdown
The app shell (`App.tsx`) is a sidebar (`AppSidebar`) + a single active view:
`FretboardView` (the stack above) or `showroom/ShowroomView`. View state lives in
`hooks/ViewContext` (`useView`).
```

- [ ] **Step 3: Commit**

```bash
git add src/components/showroom/CLAUDE.md src/components/CLAUDE.md
git commit -m "docs: document the showroom components"
```

---

## Task 15: Final verification + PR

- [ ] **Step 1: Full verification**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: build succeeds (tsc + vite), Biome clean, all tests pass.

- [ ] **Step 2: Manual smoke (dev server)**

Run: `pnpm dev`, then in the browser:
- Sidebar switches Fretboard ↔ Showroom; collapse toggle works and survives reload.
- Paste a YouTube link → dock appears → play/pause, ±10s, seek, speed (0.5×), volume work; no video visible.
- Upload an MP3 → same controls work; speed changes pitch-preserved playback.
- Upload a PDF and drag-drop a PDF → renders in the iframe with native scroll/zoom; non-PDF is rejected.
- Reload → Showroom is empty (no persistence), view selection restored.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/class-showroom
gh pr create --title "feat: class showroom (media dock + PDF viewer)" --body "$(cat <<'EOF'
## Summary
Adds a sidebar-switchable **Showroom** section for bass/guitar classes:
- Left sidebar switches between the Fretboard tool and Showroom (no router).
- Floating, collapsible audio dock: YouTube link or uploaded MP3, audio-only, with
  play/pause, ±10s skip, seek, playback speed, and volume.
- Native-browser PDF viewer (upload + drag-and-drop) for partitures and class docs.
- No persistence of class content by design — fresh each reload.

## Design
Spec: `docs/superpowers/specs/2026-06-15-showroom-design.md`
Plan: `docs/superpowers/plans/2026-06-15-class-showroom.md`

## Testing
- `pnpm build` / `pnpm lint` / `pnpm test` all green.
- Manual smoke of audio (YouTube + MP3), PDF upload/drag-drop, sidebar, and reload.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review (author checklist — completed)

**Spec coverage:** sidebar + two views (Tasks 12–13) ✓ · Showroom one page (Task 11) ✓ ·
floating collapsible dock (Task 9) ✓ · YouTube audio-only + MP3 (Tasks 6, 10) ✓ ·
speed + ±10s (Tasks 6, 9) ✓ · native PDF viewer upload + drag-drop (Tasks 8, 11) ✓ ·
no persistence / in-memory + blob revoke (Task 5) ✓ · keyless YouTube title via oEmbed
(Task 2) ✓ · error handling: invalid URL / non-PDF / player failure (Tasks 6, 8, 10) ✓ ·
tests for youtube parsing + components (Tasks 2, 8, 9, 10) ✓ · `ViewContext` persistence
(Task 4) ✓.

**Placeholder scan:** none — every step has full code. (One intentional, called-out typo
fix in Task 8's iframe className.)

**Type consistency:** `AudioSource`/`ShowroomDocument`/`AppView` (Task 1) used
consistently; `MediaPlayerApi` shape (Task 6) matches the dock's prop + fake (Task 9);
`currentDocument`/`setCurrentDocument` and `audioSource`/`setAudioSource` names match
across context, viewer, source bar, and view; `useView` fields match across sidebar +
shell.
