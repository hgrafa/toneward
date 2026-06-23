# Showroom - Class PDF viewer

A section for classes: view a PDF (partiture / class doc) full-page. Audio is NOT here
anymore - it lives in the global persistent player (`components/PersistentPlayer` +
`hooks/MediaPlayerContext`), which stays mounted across every tab.

## Components

- `ShowroomView` - page composition; PDF drag-and-drop onto the page.
- `PdfViewer` - native `<iframe>` viewer + empty-state upload; validates `application/pdf`.

## State

- `hooks/ShowroomContext` - in-memory `currentDocument` only (blob URL revoked on
  replace/unmount). No persistence - fresh each reload, by design.

## What Not To Do

- Do not re-add audio UI here - the persistent player owns playback (YouTube + audio file).
- Do not add a persistence layer or a media library - explicitly out of scope.
- Do not pull in pdf.js - the native browser viewer is intentional.
