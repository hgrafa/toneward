# Showroom - Class Media Tools

A sidebar section for classes: play a YouTube link or uploaded MP3 (audio-only) and
view a PDF (partiture / class doc). One page; the audio dock floats; nothing persists.

## Components

- `ShowroomView` - page composition; owns `useMediaPlayer`, wires page drag-and-drop.
- `MediaSourceBar` - set the current audio source (YouTube URL or MP3 file).
- `AudioDock` - floating, collapsible transport (play/pause, +/-10s, seek, speed, volume).
  Presentational: receives a `MediaPlayerApi` + the `<audio>`/YouTube container refs.
- `PdfViewer` - native `<iframe>` viewer + empty-state upload; validates `application/pdf`.

## State

- `hooks/ShowroomContext` - in-memory `audioSource` + `currentDocument` (blob URLs revoked
  on replace/unmount). No persistence - fresh each reload, by design.
- `hooks/useMediaPlayer` - one controller over two backends (HTML5 `<audio>` for MP3,
  hidden YouTube IFrame for YouTube). YouTube volume is 0-100; the API exposes 0-1.

## What Not To Do

- Do not add a persistence layer or a media library - explicitly out of scope.
- Do not show the YouTube video frame - audio-only; the iframe stays visually hidden.
- Do not pull in pdf.js - the native browser viewer is intentional.
