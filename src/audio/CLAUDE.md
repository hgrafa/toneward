# Audio — Web Audio Engine

Browser audio (Web Audio API). This is the **only** place `AudioContext`, oscillators,
and device routing live. Kept out of `core/` (which stays pure music theory, no DOM).

## Modules

### metronomeMath.ts
- Pure timing math, no Web Audio: `beatInterval`, `isAccent`, `nextBeat`, `clampBpm`
  (+ `MIN_BPM`/`MAX_BPM`/`DEFAULT_BPM`), and `tempoMarking` (BPM → Italian marking).
- Fully unit-tested (`metronomeMath.test.ts`). Put any new tempo/beat logic here so it stays testable.

### metronome.ts
- `Metronome` class — look-ahead scheduler (coarse `setInterval` schedules precise clicks ahead of the audio clock; tempo stays steady despite timer jitter). See https://web.dev/articles/audio-scheduling.
- Synthesized clicks (oscillator + gain envelope); accent = higher pitch on the downbeat.
- `start`/`stop`/`dispose`, `configure`, `setOutputDevice`, `onBeat` callback for UI flashing.
- One `AudioContext` per metronome instance; routed via `applySink`.

### notePlayer.ts
- `NotePlayer` class — plays a finite, fully-known sequence of `Pitch`es (a box-pattern run). Unlike the metronome's endless scheduler, every note is scheduled in one pass against the audio clock, with matching timers firing the `onNote`/`onEnd` UI callbacks at sounding time.
- Uses the bundled, CC BY 4.0 piano recording (`public/audio/piano.mp3`) and its matching zone preset (`pianoPreset.json`); each note uses the nearest recorded pitch and a short decay envelope. The recording loads on first play and is cached for later runs. See `public/audio/README.md` for attribution.
- `configure({ volume })`, `play(pitches)` (cancels any run in progress, including one waiting for the sample), `stop`, `dispose`, `setOutputDevice`.
- Owns its OWN `AudioContext` (created lazily on first `play`), routed via `applySink` — independent of the metronome's output.

### devices.ts
- Output-device discovery + routing capability detection.
- `isOutputRoutingSupported` gates per-device routing (Chromium-only `setSinkId`).
- `listOutputDevices` / `revealDeviceLabels` (labels hidden until an audio permission is granted).
- `applySink` (AudioContext, e.g. the metronome) / `applyElementSink` (HTMLMediaElement, the track's `<audio>`) route a source to a chosen output; both no-op where `setSinkId` is missing → graceful fallback to the default output.

## Key invariant
Per-device routing is a **progressive enhancement**. Everything must still work (through the
system default output) when `setSinkId` is unavailable (Firefox/Safari).

Each sound source owns its **own `AudioContext`** so it can be routed independently — this is
what will allow multiple sounds to play on different devices. Device *discovery* is shared
(`hooks/AudioDevicesContext.tsx`); device *selection* is per-source.

## Consumers
- `hooks/AudioDevicesContext.tsx` — shared device list + label-reveal, used by all sources.
- `hooks/MetronomeContext.tsx` owns a `Metronome` instance.
- `hooks/NotePlaybackContext.tsx` owns a `NotePlayer` instance (box-pattern playback + volume setting).
- `components/MetronomePanel.tsx` — the metronome popover (transport + BPM only).
- `components/AudioControlPanel.tsx` — routing hub: per-source output-device dropdowns + piano volume.

## What NOT to do
- Don't add music-theory math here — that belongs in `core/`. Import pitch data from there.
- Don't assume `setSinkId` exists — always go through `devices.ts` helpers.
- Don't create a second `AudioContext` per source on the same device — share one context per device.
