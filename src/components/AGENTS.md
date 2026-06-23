# Components - UI Layer

React components consuming data from `@/core` and the split contexts in `@/hooks`.
All rendering uses shadcn/ui primitives + SVG.

## Layout

Vertical stack: Editor -> TuningControls -> Toolbar -> Fretboard -> BoxPatterns (see `App.tsx`).

The app shell (`App.tsx`) is a fixed top `AppHeader` (brand lockup + current section name
+ language / Metronome / Audio controls) and a floating left `FloatingNav` capsule, over a
single active view: `FretboardView` (the stack above), `showroom/ShowroomView`, or
`practice/PracticeView`. View state lives in `hooks/ViewContext` (`useView`). The Metronome
and Audio popovers live in the header (global), not in the Braco toolbar.

## Components

### FretboardDiagram (the one SVG primitive)
- Pure presentational SVG. Takes `positions`, `stringCount`, fret window, a `dimensions` preset, display options, optional `onHoverPosition`.
- Two presets: `MAIN_DIMENSIONS`, `BOX_DIMENSIONS`. All pixel values live here - never hardcode geometry in a consumer.
- Labels via `formatSpelled(pos.spelled)` in note mode; root highlight compares `rootPitchClass` to `pos.note`.

### Fretboard
- Thin wrapper: pulls from `useDerived`/`useDisplay`/`useInput`/`useInstrument`, renders `<FretboardDiagram dimensions={MAIN_DIMENSIONS}>`, owns the tooltip overlay.

### BoxPatterns
- Thin wrapper: computes each box's display window, renders `<FretboardDiagram dimensions={BOX_DIMENSIONS}>` (no tooltip).

### Editor / Toolbar / TuningControls
- `Editor` -> `useInput`; `Toolbar` -> `useDisplay`; `TuningControls` -> `useInstrument`.

### App shell - AppHeader / FloatingNav / LanguageToggle
- `AppHeader`: fixed top bar - squircle logo + wordmark + current section name; right side composes `LanguageToggle` + the global `MetronomePanel`/`AudioControlPanel` popovers. The section name maps the current `useView()` view to `ui.sidebar.{fretboard,showroom,practice}`.
- `FloatingNav`: floating left capsule, hover-expand; the 3 view buttons drive `useView`; the active item uses the `bg-brand-gradient` utility.
- `LanguageToggle`: the flag `Select`, extracted so it can live in the header.
- Accent discipline: the brand gradient appears only on the logo mark + active nav; header pills are stone-neutral and invert to dark ink when open.

### Persistent player - PersistentPlayer / PlayerLoader / SpeedControl / VolumeControl / PlayerSlider
- `PersistentPlayer` is mounted ONCE in `App.tsx`'s shell body and never unmounts on tab change, so the hidden `<audio>` + YouTube container keep playing across tabs. Reads `useMediaPlayerCtx` (`@/hooks/MediaPlayerContext`). Mini pill <-> expanded card; auto-minimizes on mouse-leave UNLESS pinned or a control popover is open (`speedOpen`/`volumeOpen` guard - the popover panel is portaled outside the player). "Switch/Trocar" re-opens the loader to swap the track.
- Dark "studio" palette: the player is a self-contained DARK surface (`bg-[#23201c]`, white text) regardless of the app's light theme - it deliberately does NOT use the stone theme tokens. Brand accents (artwork tile, seek fill) use `bg-brand-gradient`.
- `PlayerLoader`: the no-track loader - a YouTube link input + audio-file upload (`audio/*`); reuses `parseYouTubeId`/`fetchYouTubeTitle` from `@/lib/youtube`.
- `SpeedControl` / `VolumeControl`: dark popovers wrapping a `PlayerSlider`. Props `value`, `onChange`, `onOpenChange` (lets the player suppress auto-minimize while a panel is open). Speed uses `scale="log"` so `1x` sits centred between `.5` and `2`.
- `PlayerSlider`: a custom slider (not shadcn) where the thumb and every preset-stop label share ONE value->fraction mapping, so a stop's label sits exactly under its thumb. Supports `scale="linear" | "log"`; pointer/touch/keyboard.

### Audio capability limits (constraint)
- Playback supports a YouTube link or an uploaded audio file only (no direct-URL audio, no loop).
- A real Web-Audio EQ / spectrum visualizer is only feasible for uploaded files (our same-origin `<audio>`). YouTube audio plays in a cross-origin iframe and cannot be tapped by Web Audio, so an EQ/visualizer can never apply to YouTube. Do NOT add YouTube-audio download/extraction - it violates YouTube ToS/copyright and is out of scope.

## State

Four focused contexts composed by `FretboardProvider` (`@/hooks`): Input, Display, Instrument, Derived. Subscribe to the narrowest hook you need. Audio playback is a separate shell-level context: `hooks/MediaPlayerContext` (`useMediaPlayerCtx`).

## What Not To Do

- Do not duplicate the fretboard SVG - extend `FretboardDiagram`.
- Do not read the whole context - use the specific hook.
- Do not put layout constants in a consumer - add them to a dimensions preset.
