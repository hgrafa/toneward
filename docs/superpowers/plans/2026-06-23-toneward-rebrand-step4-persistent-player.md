# Toneward Rebrand — Step 4 (Persistent Player) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift audio playback out of the Showroom tab into a persistent bottom-right player that stays mounted across tab changes, with the source loader (YouTube link + audio file) built into the player.

**Architecture:** A new shell-level `MediaPlayerProvider` owns the audio `source`, the `<audio>`/YouTube refs, and the `useMediaPlayer` controller. A `PersistentPlayer` component is mounted once in `AppShell` (bottom-right, `fixed`), renders the hidden media elements, and shows a mini pill ↔ expanded card with the loader and transport. The old in-Showroom audio UI (`MediaSourceBar`, `AudioDock`) is removed; `ShowroomContext` keeps only the PDF document. `useMediaPlayer` itself is reused unchanged.

**Tech Stack:** Vite + React 19 + TS, Tailwind v4 (stone tokens/fonts from Steps 1–3), Vitest + @testing-library/react.

## Global Constraints

- Package manager **pnpm**. Gate each task on `pnpm build` + `pnpm lint` + `pnpm vitest run` (all clean/green).
- Formatting: **tabs, double quotes, semicolons** (Biome).
- **Behavior-preserving capabilities:** the player supports exactly what the app does today — a **YouTube link** or an **uploaded audio file** (`audio/*`). No direct-audio-URL playback, no loop, no localStorage persistence of player state (all explicitly deferred). Mute is a local convenience (toggle volume 0 ↔ previous).
- **Persistence requirement:** the `<audio>` element and YouTube container are mounted **once** at the shell and never unmount on tab change, so playback continues across Braço/Showroom/Prática. This is the whole point — do not render them conditionally per tab.
- **Showroom consequence (intended):** `MediaSourceBar` + `AudioDock` are deleted; Showroom keeps only the PDF viewer + PDF drag-and-drop. `ShowroomContext` loses `audioSource`/`setAudioSource` and keeps `currentDocument`.
- **Accent discipline:** the player is stone-neutral; the only brand color is the progress-fill (use `bg-brand-gradient` from Step 1 on the played portion of the seek bar). Primary play button uses dark ink (`bg-foreground text-background`).
- Reuse existing helpers: `parseYouTubeId` + `fetchYouTubeTitle` from `@/lib/youtube`; `AudioSource` type from `@/types/showroom`; `useMediaPlayer` + `MediaPlayerApi` from `@/hooks/useMediaPlayer`.

## File Structure

- **Create** `src/hooks/MediaPlayerContext.tsx` — shell-level provider: owns `source`, `setSource` (with blob-URL revocation), `audioRef`, `ytContainerRef`, runs `useMediaPlayer`, exposes `{ source, setSource, api, audioRef, ytContainerRef }`.
- **Create** `src/components/PlayerLoader.tsx` — the "no track" loader (YouTube link input + audio-file upload). Extracted so the player file stays focused.
- **Create** `src/components/PersistentPlayer.tsx` — the bottom-right player: mounts hidden `<audio>`/YT container, renders mini pill ↔ expanded card (loader or transport), owns expand/pin/auto-minimize UI state.
- **Modify** `src/App.tsx` — wrap with `MediaPlayerProvider`; render `<PersistentPlayer />` once in the shell body.
- **Modify** `src/hooks/ShowroomContext.tsx` — drop `audioSource`/`setAudioSource` (+ its blob revocation); keep `currentDocument`.
- **Modify** `src/components/showroom/ShowroomView.tsx` — drop `useMediaPlayer`, `AudioDock`, `MediaSourceBar`; keep PDF + PDF drag-and-drop.
- **Delete** `src/components/showroom/MediaSourceBar.tsx` + `MediaSourceBar.test.tsx`; `src/components/showroom/AudioDock.tsx` + `AudioDock.test.tsx` (coverage migrates to `PersistentPlayer.test.tsx`).

---

### Task 1: MediaPlayerContext (shell-level audio ownership)

**Files:**
- Create: `src/hooks/MediaPlayerContext.tsx`
- Test: `src/hooks/MediaPlayerContext.test.tsx`

**Interfaces:**
- Consumes: `useMediaPlayer` (`@/hooks/useMediaPlayer`), `AudioSource` (`@/types/showroom`).
- Produces: `MediaPlayerProvider` + `useMediaPlayerCtx(): { source, setSource, api, audioRef, ytContainerRef }`. `setSource(source: AudioSource | null)` revokes a prior mp3 blob URL.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/MediaPlayerContext.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MediaPlayerProvider, useMediaPlayerCtx } from "./MediaPlayerContext";

const wrapper = ({ children }: { children: ReactNode }) => (
	<MediaPlayerProvider>{children}</MediaPlayerProvider>
);

describe("MediaPlayerContext", () => {
	it("starts with no source and exposes a player api", () => {
		const { result } = renderHook(() => useMediaPlayerCtx(), { wrapper });
		expect(result.current.source).toBeNull();
		expect(typeof result.current.api.toggle).toBe("function");
	});

	it("revokes a prior mp3 blob url when the source is replaced", () => {
		const revoke = vi.spyOn(URL, "revokeObjectURL");
		const { result } = renderHook(() => useMediaPlayerCtx(), { wrapper });

		act(() =>
			result.current.setSource({
				kind: "mp3",
				objectUrl: "blob:one",
				title: "one",
			}),
		);
		act(() =>
			result.current.setSource({
				kind: "mp3",
				objectUrl: "blob:two",
				title: "two",
			}),
		);

		expect(revoke).toHaveBeenCalledWith("blob:one");
		expect(result.current.source?.title).toBe("two");
		revoke.mockRestore();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/MediaPlayerContext.test.tsx`
Expected: FAIL — module `./MediaPlayerContext` does not exist.

- [ ] **Step 3: Create the provider**

Create `src/hooks/MediaPlayerContext.tsx`:

```tsx
import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { type MediaPlayerApi, useMediaPlayer } from "@/hooks/useMediaPlayer";
import type { AudioSource } from "@/types/showroom";

interface MediaPlayerState {
	source: AudioSource | null;
	setSource: (source: AudioSource | null) => void;
	api: MediaPlayerApi;
	audioRef: RefObject<HTMLAudioElement | null>;
	ytContainerRef: RefObject<HTMLDivElement | null>;
}

const MediaPlayerContext = createContext<MediaPlayerState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function MediaPlayerProvider({ children }: { children: ReactNode }) {
	const [source, setSourceState] = useState<AudioSource | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const ytContainerRef = useRef<HTMLDivElement | null>(null);

	// Keep the latest source in a ref so unmount cleanup can revoke a live blob.
	const sourceRef = useRef<AudioSource | null>(null);
	sourceRef.current = source;

	const setSource = useCallback((next: AudioSource | null) => {
		setSourceState((prev) => {
			if (prev?.kind === "mp3") revokeIfBlob(prev.objectUrl);
			return next;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (sourceRef.current?.kind === "mp3")
				revokeIfBlob(sourceRef.current.objectUrl);
		};
	}, []);

	const api = useMediaPlayer(source, audioRef, ytContainerRef);

	const value = useMemo<MediaPlayerState>(
		() => ({ source, setSource, api, audioRef, ytContainerRef }),
		[source, setSource, api],
	);

	return (
		<MediaPlayerContext.Provider value={value}>
			{children}
		</MediaPlayerContext.Provider>
	);
}

export function useMediaPlayerCtx(): MediaPlayerState {
	const ctx = useContext(MediaPlayerContext);
	if (!ctx)
		throw new Error("useMediaPlayerCtx must be used within a MediaPlayerProvider");
	return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/MediaPlayerContext.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/MediaPlayerContext.tsx src/hooks/MediaPlayerContext.test.tsx
git commit -m "feat: add shell-level MediaPlayerContext"
```

---

### Task 2: PlayerLoader + PersistentPlayer

Build the player UI (not yet mounted). Two files: a focused loader, and the player shell.

**Files:**
- Create: `src/components/PlayerLoader.tsx`
- Create: `src/components/PersistentPlayer.tsx`
- Test: `src/components/PersistentPlayer.test.tsx`

**Interfaces:**
- Consumes: `useMediaPlayerCtx` (Task 1); `parseYouTubeId`/`fetchYouTubeTitle` (`@/lib/youtube`); `formatTime` (local); lucide icons.
- Produces: `PlayerLoader` (no props — reads context), `PersistentPlayer` (no props — reads context). Both must render inside `MediaPlayerProvider`.

- [ ] **Step 1: Write the failing test**

Create `src/components/PersistentPlayer.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";

function renderPlayer(ui: ReactNode = <PersistentPlayer />) {
	return render(<MediaPlayerProvider>{ui}</MediaPlayerProvider>);
}

describe("PersistentPlayer", () => {
	it("shows the loader controls when no track is loaded", () => {
		renderPlayer();
		// Expand to reveal the card, then the loader.
		act(() => screen.getByLabelText("Open player").click());
		expect(screen.getByPlaceholderText("Paste a YouTube link…")).toBeInTheDocument();
		expect(screen.getByText("Load")).toBeInTheDocument();
	});

	it("mounts a single hidden audio element that persists", () => {
		const { container } = renderPlayer();
		expect(container.querySelectorAll("audio")).toHaveLength(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/PersistentPlayer.test.tsx`
Expected: FAIL — module `@/components/PersistentPlayer` does not exist.

- [ ] **Step 3: Create `PlayerLoader.tsx`**

```tsx
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
			<div className="flex items-center gap-2 rounded-[11px] border border-input bg-muted px-3 py-1.5">
				<Youtube className="size-4 shrink-0 text-muted-foreground" />
				<input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") loadYouTube();
					}}
					placeholder={t("ui.showroom.youtubePlaceholder")}
					className="min-w-0 flex-1 bg-transparent text-sm outline-none"
				/>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={loadYouTube}
					className="h-9 flex-1 rounded-[11px] bg-foreground font-semibold text-background text-sm"
				>
					{t("ui.showroom.load")}
				</button>
				<label
					htmlFor={fileId}
					className="flex h-9 cursor-pointer items-center gap-2 rounded-[11px] border border-border bg-card px-3 font-semibold text-secondary-foreground text-sm hover:bg-muted"
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
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}
```

- [ ] **Step 4: Create `PersistentPlayer.tsx`**

```tsx
import {
	ChevronDown,
	ChevronUp,
	Pause,
	Pin,
	Play,
	RotateCcw,
	RotateCw,
	Trash2,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlayerLoader } from "@/components/PlayerLoader";
import { useMediaPlayerCtx } from "@/hooks/MediaPlayerContext";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersistentPlayer() {
	const { t } = useTranslation();
	const { source, setSource, api, audioRef, ytContainerRef } =
		useMediaPlayerCtx();

	const [expanded, setExpanded] = useState(false);
	const [pinned, setPinned] = useState(false);
	const [seeking, setSeeking] = useState<number | null>(null);
	const prevVolume = useRef(1);

	const hasTrack = source !== null;
	const muted = api.volume === 0;

	// Auto-open the card when a track is loaded so the user can confirm.
	// biome-ignore lint/correctness/useExhaustiveDependencies: open only on source identity change
	useEffect(() => {
		if (source) setExpanded(true);
	}, [source]);

	function cycleSpeed() {
		const i = SPEEDS.findIndex((s) => Math.abs(s - api.playbackRate) < 0.001);
		api.setPlaybackRate(SPEEDS[(i + 1) % SPEEDS.length]);
	}

	function toggleMute() {
		if (muted) api.setVolume(prevVolume.current || 1);
		else {
			prevVolume.current = api.volume;
			api.setVolume(0);
		}
	}

	function onLeave() {
		if (!pinned) setExpanded(false);
	}

	return (
		<div
			onMouseLeave={onLeave}
			className="fixed right-4 bottom-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/90 shadow-xl backdrop-blur-lg"
		>
			{/* Hidden media backends — mounted once, never unmounted. */}
			{/* biome-ignore lint/a11y/useMediaCaption: user-supplied practice audio */}
			<audio ref={audioRef} className="sr-only" />
			<div ref={ytContainerRef} className="sr-only" aria-hidden="true" />

			{!expanded ? (
				/* ---- mini pill ---- */
				<div className="flex items-center gap-2 px-2.5 py-2">
					<button
						type="button"
						aria-label={api.isPlaying ? t("ui.showroom.pause") : t("ui.showroom.play")}
						onClick={api.toggle}
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
					>
						{api.isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
					</button>
					<button
						type="button"
						aria-label={t("ui.showroom.speed")}
						onClick={cycleSpeed}
						className="h-7 rounded-md border border-border bg-card px-2 font-mono font-semibold text-secondary-foreground text-xs"
					>
						{`${+api.playbackRate.toFixed(2)}×`}
					</button>
					<button
						type="button"
						aria-label={muted ? t("ui.showroom.volume") : t("ui.showroom.volume")}
						onClick={toggleMute}
						className="text-muted-foreground hover:text-foreground"
					>
						{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
					</button>
					<input
						type="range"
						aria-label={t("ui.showroom.volume")}
						min={0}
						max={1}
						step={0.01}
						value={api.volume}
						onChange={(e) => api.setVolume(Number(e.target.value))}
						className="w-16 accent-foreground"
					/>
					{hasTrack && (
						<span className="min-w-0 flex-1 truncate text-secondary-foreground text-xs">
							{source.title}
						</span>
					)}
					<button
						type="button"
						aria-label={t("ui.player.open")}
						onClick={() => setExpanded(true)}
						className="ml-auto text-muted-foreground hover:text-foreground"
					>
						<ChevronUp className="size-4" />
					</button>
				</div>
			) : (
				/* ---- expanded card ---- */
				<div className="flex flex-col gap-3 p-3.5">
					<div className="flex items-center justify-between">
						<span className="font-display font-bold text-sm">
							{t("ui.player.title")}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								aria-label={t("ui.player.pin")}
								onClick={() => setPinned((p) => !p)}
								className={`flex size-7 items-center justify-center rounded-md transition-colors ${
									pinned
										? "bg-foreground text-background"
										: "text-muted-foreground hover:bg-muted"
								}`}
							>
								<Pin className="size-4" />
							</button>
							<button
								type="button"
								aria-label={t("ui.player.minimize")}
								onClick={() => setExpanded(false)}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
							>
								<ChevronDown className="size-4" />
							</button>
						</div>
					</div>

					{!hasTrack ? (
						<PlayerLoader />
					) : (
						<>
							<div className="flex items-center gap-2">
								<span className="min-w-0 flex-1 truncate font-semibold text-sm">
									{source.title}
								</span>
								<button
									type="button"
									aria-label={t("ui.player.remove")}
									onClick={() => setSource(null)}
									className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
								>
									<Trash2 className="size-4" />
								</button>
							</div>

							{/* seek */}
							<div className="flex items-center gap-2">
								<span className="w-9 text-right font-mono text-muted-foreground text-[11px] tabular-nums">
									{formatTime(seeking ?? api.currentTime)}
								</span>
								<input
									type="range"
									aria-label={t("ui.showroom.seek")}
									min={0}
									max={api.duration || 0}
									step={1}
									value={seeking ?? Math.min(api.currentTime, api.duration || 0)}
									onChange={(e) => setSeeking(Number(e.target.value))}
									onMouseUp={() => {
										if (seeking !== null) {
											api.seek(seeking);
											setSeeking(null);
										}
									}}
									className="flex-1 accent-foreground"
								/>
								<span className="w-9 font-mono text-muted-foreground text-[11px] tabular-nums">
									{formatTime(api.duration)}
								</span>
							</div>

							{/* transport */}
							<div className="flex items-center justify-center gap-4">
								<button
									type="button"
									aria-label={t("ui.showroom.seekBack")}
									onClick={() => api.skip(-10)}
									className="text-secondary-foreground hover:text-foreground"
								>
									<RotateCcw className="size-5" />
								</button>
								<button
									type="button"
									aria-label={api.isPlaying ? t("ui.showroom.pause") : t("ui.showroom.play")}
									onClick={api.toggle}
									className="flex size-11 items-center justify-center rounded-full bg-foreground text-background"
								>
									{api.isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
								</button>
								<button
									type="button"
									aria-label={t("ui.showroom.seekForward")}
									onClick={() => api.skip(10)}
									className="text-secondary-foreground hover:text-foreground"
								>
									<RotateCw className="size-5" />
								</button>
								<button
									type="button"
									aria-label={t("ui.showroom.speed")}
									onClick={cycleSpeed}
									className="h-7 rounded-md border border-border bg-card px-2 font-mono font-semibold text-secondary-foreground text-xs"
								>
									{`${+api.playbackRate.toFixed(2)}×`}
								</button>
							</div>

							{/* volume */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									aria-label={t("ui.showroom.volume")}
									onClick={toggleMute}
									className="text-muted-foreground hover:text-foreground"
								>
									{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
								</button>
								<input
									type="range"
									aria-label={t("ui.showroom.volume")}
									min={0}
									max={1}
									step={0.01}
									value={api.volume}
									onChange={(e) => api.setVolume(Number(e.target.value))}
									className="flex-1 accent-foreground"
								/>
							</div>
						</>
					)}
					{api.error && <p className="text-destructive text-xs">{api.error}</p>}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 5: Add the new i18n keys**

In `src/i18n/locales/en.ts`, add a `player` block inside `ui` (after the `showroom` block):

```ts
		player: {
			title: "Playback",
			open: "Open player",
			minimize: "Minimize player",
			pin: "Pin player",
			remove: "Remove track",
		},
```

In `src/i18n/locales/pt-BR.ts`, add the matching block in the same place:

```ts
		player: {
			title: "Reprodução",
			open: "Abrir player",
			minimize: "Minimizar player",
			pin: "Fixar player",
			remove: "Remover faixa",
		},
```

- [ ] **Step 6: Run the test + build + lint**

Run: `pnpm vitest run src/components/PersistentPlayer.test.tsx`
Expected: PASS.
Run: `pnpm build && pnpm lint`
Expected: both succeed (the new `ui.player.*` keys typecheck against `TranslationSchema`).

- [ ] **Step 7: Commit**

```bash
git add src/components/PlayerLoader.tsx src/components/PersistentPlayer.tsx src/components/PersistentPlayer.test.tsx src/i18n/locales/en.ts src/i18n/locales/pt-BR.ts
git commit -m "feat: build the persistent player UI + loader"
```

---

### Task 3: Cutover — mount the player, retire Showroom audio

Wire the provider + player into the shell and remove the old in-Showroom audio path.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/ShowroomContext.tsx`
- Modify: `src/components/showroom/ShowroomView.tsx`
- Delete: `src/components/showroom/MediaSourceBar.tsx`, `src/components/showroom/MediaSourceBar.test.tsx`, `src/components/showroom/AudioDock.tsx`, `src/components/showroom/AudioDock.test.tsx`
- Modify: `src/App.test.tsx` (assert the player mounts)

**Interfaces:**
- Consumes: `MediaPlayerProvider` + `PersistentPlayer`.
- Produces: a shell where the player is always mounted; `ShowroomState` shrinks to `{ currentDocument, setCurrentDocument }`.

- [ ] **Step 1: Update the App smoke test**

In `src/App.test.tsx`, add an assertion to the existing test body (after the existing nav assertions) that the player is mounted:

```tsx
		// The persistent player mounts once at the shell.
		expect(screen.getByLabelText("Open player")).toBeInTheDocument();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL — no element labelled "Open player" yet (player not mounted).

- [ ] **Step 3: Wire `App.tsx`**

Add the imports:

```tsx
import { PersistentPlayer } from "@/components/PersistentPlayer";
import { MediaPlayerProvider } from "@/hooks/MediaPlayerContext";
```

Wrap the provider tree — put `MediaPlayerProvider` directly inside `ShowroomProvider` (so it is above `AppShell`):

```tsx
						<ShowroomProvider>
							<MediaPlayerProvider>
								<AppShell />
							</MediaPlayerProvider>
						</ShowroomProvider>
```

In `AppShell`, render the player once inside the relative body, after `FloatingNav`:

```tsx
			<div className="relative flex-1 overflow-hidden">
				<main className="h-full overflow-y-auto">
					{view === "fretboard" && <FretboardView />}
					{view === "showroom" && <ShowroomView />}
					{view === "practice" && <PracticeView />}
				</main>
				<FloatingNav />
				<PersistentPlayer />
			</div>
```

- [ ] **Step 4: Trim `ShowroomContext.tsx` to the document only**

Replace `src/hooks/ShowroomContext.tsx` with:

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
import type { ShowroomDocument } from "@/types/showroom";

interface ShowroomState {
	currentDocument: ShowroomDocument | null;
	setCurrentDocument: (doc: ShowroomDocument | null) => void;
}

const ShowroomContext = createContext<ShowroomState | null>(null);

function revokeIfBlob(url: string | undefined) {
	if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function ShowroomProvider({ children }: { children: ReactNode }) {
	const [currentDocument, setCurrentDocumentState] =
		useState<ShowroomDocument | null>(null);

	const docRef = useRef<ShowroomDocument | null>(null);
	docRef.current = currentDocument;

	const setCurrentDocument = useCallback((doc: ShowroomDocument | null) => {
		setCurrentDocumentState((prev) => {
			if (prev) revokeIfBlob(prev.objectUrl);
			return doc;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (docRef.current) revokeIfBlob(docRef.current.objectUrl);
		};
	}, []);

	const value = useMemo<ShowroomState>(
		() => ({ currentDocument, setCurrentDocument }),
		[currentDocument, setCurrentDocument],
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

- [ ] **Step 5: Trim `ShowroomView.tsx` to PDF only**

Replace `src/components/showroom/ShowroomView.tsx` with:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShowroom } from "@/hooks/ShowroomContext";
import { PdfViewer } from "./PdfViewer";

export function ShowroomView() {
	const { t } = useTranslation();
	const { setCurrentDocument } = useShowroom();
	const [dragging, setDragging] = useState(false);

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
		<div
			className="relative flex h-full flex-col gap-4 p-4"
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={onDrop}
		>
			<div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-border bg-card">
				<PdfViewer />
			</div>

			{dragging && (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-primary border-dashed bg-background/80 font-medium text-sm">
					{t("ui.showroom.pdfDrop")}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 6: Delete the old audio components + their tests**

```bash
git rm src/components/showroom/MediaSourceBar.tsx src/components/showroom/MediaSourceBar.test.tsx src/components/showroom/AudioDock.tsx src/components/showroom/AudioDock.test.tsx
```

- [ ] **Step 7: Run the full suite + build + lint**

Run: `pnpm vitest run`
Expected: all pass — `App.test.tsx` now finds "Open player"; no test imports the deleted files; `PersistentPlayer.test.tsx` + `MediaPlayerContext.test.tsx` cover the migrated behavior.
Run: `pnpm build && pnpm lint`
Expected: both succeed — tsc confirms nothing references the removed `audioSource`/`setAudioSource` or the deleted components.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: mount the persistent player, retire in-Showroom audio"
```

---

## Self-Review

**Spec coverage (Step 4 section of the design spec):**
- Lift media state to the shell; `<audio>`/YT mounted once → Task 1 (context) + Task 2 (single hidden elements) + Task 3 (mounted once in shell) ✓
- PersistentPlayer bottom-right, mini ↔ expanded, loader/transport, auto-minimize + pin → Task 2 ✓
- Preserve YouTube + MP3 (no direct-URL, per user's loader choice) → Task 2 `PlayerLoader` ✓
- Showroom loses MediaSourceBar + AudioDock; keeps PDF; `ShowroomContext` keeps only the document → Task 3 ✓
- `useMediaPlayer` reused unchanged → Tasks 1–3 (imported, not modified) ✓

**Placeholder scan:** none — every step has exact paths, complete code, commands, and expected output.

**Type/behavior consistency:** `useMediaPlayerCtx()` shape (`source`, `setSource`, `api`, `audioRef`, `ytContainerRef`) defined in Task 1 and consumed in Task 2. `MediaPlayerApi` fields used in Task 2 (`isPlaying`, `toggle`, `skip`, `seek`, `currentTime`, `duration`, `volume`, `setVolume`, `playbackRate`, `setPlaybackRate`, `error`) all exist on the current `useMediaPlayer`. `AudioSource` kinds (`youtube`/`mp3`) match `@/types/showroom`. Task 3's `ShowroomState` reduction is consumed only by `ShowroomView` (Task 3 updates it) and `PdfViewer` (uses `currentDocument` — unchanged). New `ui.player.*` keys added to both locales symmetrically.

**Notes:** Mute is a local convenience (no API change). Loop and direct-URL playback are intentionally omitted (deferred), consistent with the "behavior-preserving capabilities" constraint. The player's exact pixel styling and the auto-minimize/pin feel are visual — final validation is the browser, the same as Step 3.
```
