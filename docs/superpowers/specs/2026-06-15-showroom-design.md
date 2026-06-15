# Showroom — Design

**Date:** 2026-06-15
**Status:** Approved, ready for implementation plan

## Goal

Add a **Showroom** section to the app for use during bass/guitar classes. It lets the
user play class audio (a YouTube link or an uploaded MP3) with floating controls that
stay usable while scrolling, and open a PDF (partiture or any class document) in a
viewer on the same page. A left sidebar switches between the existing Fretboard tool and
the new Showroom.

## Scope decisions (locked)

- **Navigation:** Left sidebar, two sibling views — `Fretboard` (existing tool) and
  `Showroom`. No client router; a small in-app `view` state.
- **Showroom layout:** One combined page. The PDF viewer fills the page; the audio
  player is a floating **bottom dock**, collapsible to a thin mini-bar.
- **Dock scope:** Showroom-only. Leaving the Showroom view stops/hides playback. The
  dock does not persist across views.
- **Audio sources:** One at a time. Either a YouTube URL or an uploaded MP3 — adding a
  new source replaces the current one.
- **YouTube playback:** Audio-only. The YouTube IFrame player is rendered but visually
  hidden; the video frame is never shown.
- **PDF sources:** Upload from device **and** drag-and-drop. One document at a time.
- **PDF rendering:** Native browser viewer via `<iframe>` over a blob URL (zero deps).
- **Persistence:** None for class content — fresh on every reload. Audio source and PDF
  live in memory only. The only thing persisted is trivial sidebar UI state
  (collapsed + last view) in `localStorage`.
- **Audio controls:** play/pause, seek + time, volume, **playback speed**
  (0.5 / 0.75 / 1 / 1.25 / 1.5), **skip ±10s**. No A–B loop.

## Non-goals (YAGNI)

- No saved library / playlist of tracks or documents.
- No IndexedDB / blob persistence across reloads.
- No A–B loop, no waveform, no equalizer.
- No pdf.js / react-pdf custom rendering, no annotation/markup tools.
- No backend — everything is client-side and in-session.
- No multi-document tabs.

## Architecture

### Navigation shell

- `hooks/ViewContext.tsx` — provides `view: "fretboard" | "showroom"` and
  `setView`, plus `sidebarCollapsed` + toggle. `view` and `sidebarCollapsed` are
  persisted in `localStorage` (small UI prefs only; same try/catch ethos as
  `lib/tuningStorage.ts`). Default view is `fretboard`.
- `components/AppSidebar.tsx` — collapsible left sidebar. Two nav items with
  lucide icons (🎸 Fretboard, 🎵 Showroom), active highlight, collapse toggle.
  Built with Tailwind to match existing component style (not the heavy shadcn
  sidebar block).
- `components/FretboardView.tsx` — the current `App.tsx` body
  (Editor / TuningControls / Toolbar / Fretboard / BoxPatterns) moved verbatim, so the
  existing tool is unchanged. Still wrapped by `FretboardProvider`.
- `App.tsx` — becomes `ViewProvider` → `sidebar + main`, rendering `FretboardView` or
  `ShowroomView` by `view`. `FretboardProvider` continues to wrap the fretboard tool;
  `ShowroomProvider` wraps the Showroom.

### Showroom

- `hooks/ShowroomContext.tsx` (`ShowroomProvider`) — independent of `FretboardProvider`.
  Holds in-memory state:
  - `audioSource: AudioSource | null`
  - `document: ShowroomDocument | null`
  - setters that revoke the previous blob URL before replacing, and a cleanup on unmount
    that revokes any live blob URLs.
- `components/showroom/ShowroomView.tsx` — composes the page: `MediaSourceBar` (header),
  `PdfViewer` (fills page, with drag-and-drop), and `AudioDock` (floating bottom).

### Audio player

- `hooks/useMediaPlayer.ts` — one controller abstracting two backends behind a unified
  API: `{ isPlaying, currentTime, duration, volume, playbackRate, play, pause, toggle,
  seek, skip(seconds), setVolume, setPlaybackRate }`.
  - **MP3:** HTML5 `<audio>` element on a blob URL. `playbackRate` and `seek` are native.
  - **YouTube:** YouTube IFrame Player API in a visually hidden container. The IFrame API
    script is loaded once (idempotent). `skip` uses `seekTo`; speed uses
    `setPlaybackRate`, clamped to `getAvailablePlaybackRates()` (YouTube restricts rates).
    Time/duration polled via the player API while playing.
  - The hook owns one active backend at a time, keyed off `audioSource.kind`, and tears
    down the previous backend when the source changes.
- `components/showroom/AudioDock.tsx` — floating bottom dock bound to `useMediaPlayer`:
  play/pause, seek bar + current/total time, volume, speed picker, ±10s skip buttons,
  track title + source-kind badge, and a collapse toggle that shrinks the dock to a thin
  mini-bar. Uses a shadcn `slider` primitive for seek and volume. Hidden when no source
  is loaded.
- `components/showroom/MediaSourceBar.tsx` — page-header control to set the current audio
  source: a text input + button to load a YouTube URL, and a file picker for an MP3.
  Validates input and surfaces inline errors. Keeps the floating dock purely transport.

### PDF viewer

- `components/showroom/PdfViewer.tsx` — fills the Showroom main area.
  - Empty state: a drop zone reading "Upload a PDF or drag a file here" with an upload
    button.
  - Loaded state: `<iframe>` (with `<object>` fallback) pointing at the document's blob
    URL → the browser's built-in PDF UI (scroll, zoom, page nav) for free.
  - Drag-and-drop is wired on the Showroom container; only `application/pdf` is accepted.

### Utilities & types

- `lib/youtube.ts` — `parseYouTubeId(url): string | null`, handling `watch?v=`,
  `youtu.be/`, `/embed/`, `/shorts/`, and extra query params. Pure, unit-tested.
  - Track **title** for a YouTube source: best-effort fetch from the public oEmbed
    endpoint (`https://www.youtube.com/oembed?url=…&format=json`, no API key); if it
    fails, fall back to the URL string. For MP3, the title is the file name.
- `types/showroom.ts`:
  - `type AudioSource = { kind: "youtube"; videoId: string; url: string; title: string }
    | { kind: "mp3"; objectUrl: string; title: string }`
  - `interface ShowroomDocument { name: string; objectUrl: string }`
- `components/ui/slider.tsx` — shadcn slider primitive (added via shadcn), used by the
  dock.

## Data flow

1. **Add YouTube:** user pastes URL → `parseYouTubeId` → on success build
   `AudioSource{kind:"youtube"}` → `ShowroomProvider.setAudioSource` (revokes prior blob
   if any) → `useMediaPlayer` swaps to the YouTube backend.
2. **Add MP3:** user picks file → `URL.createObjectURL(file)` →
   `AudioSource{kind:"mp3"}` → set source → `useMediaPlayer` swaps to the `<audio>`
   backend.
3. **Add PDF:** user uploads or drops a file → validate type → `createObjectURL` →
   `setDocument` (revokes prior) → `PdfViewer` renders the iframe.
4. **Leaving Showroom:** `ShowroomProvider` stays mounted under `App` only while the
   Showroom view is active; on unmount it revokes blob URLs and the dock/audio stop.

## Error handling

- Invalid YouTube URL → inline error in `MediaSourceBar`; current source unchanged.
- Non-PDF file dropped/picked → inline error; document unchanged.
- YouTube IFrame API fails to load or errors → error state shown in the dock.
- `localStorage` unavailable (private mode/quota) → try/catch; UI prefs silently fall
  back to defaults. (No other storage is used.)
- Blob URLs are always revoked on replace and on unmount to avoid leaks.

## Testing

Follows existing vitest + Testing Library patterns:

- `lib/youtube.test.ts` — `parseYouTubeId` across URL variants and invalid inputs.
- `components/showroom/AudioDock.test.tsx` — renders controls; play/pause, skip, and
  speed callbacks fire (player controller mocked).
- `components/showroom/PdfViewer.test.tsx` — empty-state drop zone renders; dropping a
  non-PDF shows an error; a PDF sets the iframe source.
- `hooks/ViewContext.test.tsx` — view switching and persisted collapse state.

`useMediaPlayer`'s media-element/YouTube wiring is left to light manual verification
(DOM media is awkward to unit test); the testable logic (URL parsing) is isolated in
`lib/youtube.ts`.

## File inventory

**New**

- `src/components/AppSidebar.tsx`
- `src/components/FretboardView.tsx`
- `src/components/showroom/ShowroomView.tsx`
- `src/components/showroom/AudioDock.tsx`
- `src/components/showroom/MediaSourceBar.tsx`
- `src/components/showroom/PdfViewer.tsx`
- `src/hooks/ViewContext.tsx`
- `src/hooks/ShowroomContext.tsx`
- `src/hooks/useMediaPlayer.ts`
- `src/lib/youtube.ts`
- `src/types/showroom.ts`
- `src/components/ui/slider.tsx` (shadcn)
- Tests: `lib/youtube.test.ts`, `components/showroom/AudioDock.test.tsx`,
  `components/showroom/PdfViewer.test.tsx`, `hooks/ViewContext.test.tsx`

**Modified**

- `src/App.tsx` — extract fretboard body into `FretboardView`; add `ViewProvider`,
  sidebar, and view switching.

## Workflow

Per the user's standing preference: implement on a dedicated git worktree
(`feat/` branch) and open a PR to GitHub at the end — not committed to `main` directly.
