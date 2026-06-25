# Showroom — Class PDF viewer

A section for classes: view a PDF (partiture / class doc) full-page. Audio is NOT here
anymore — it lives in the global persistent player (`components/PersistentPlayer` +
`hooks/MediaPlayerContext`), which stays mounted across every tab. The open PDF persists
across reloads.

## Components
- `ShowroomView` — page composition; PDF drag-and-drop onto the page.
- `PdfViewer` — native `<iframe>` viewer + empty-state upload; validates `application/pdf`.
- `RecentDocuments` — empty-state quick-reopen list (renders nothing when there's no
  history). Click re-opens via `openRecentDocument(id)`; on failure shows an inline
  "couldn't reopen" notice (same amber pattern as `pdfUnavailable`).

## State
- `hooks/ShowroomContext` — `currentDocument` (in-memory) persisted across reloads (issue
  #29) via `@/lib/documentStorage`. Blob URL revoked on replace/unmount. Open/close go
  through `openDocument(file)` / `closeDocument()` so persistence stays in one place.
  `unavailableDocumentName` flags a previously-saved doc whose bytes can no longer be read.
- `@/lib/documentStorage` — PDF bytes in IndexedDB (`ArrayBuffer` + MIME type) plus a
  lightweight name marker in localStorage (`fretboard.showroom.document`). All access is
  wrapped in try/catch (private mode / quota).
- `recentDocuments` + `openRecentDocument(id)` on `ShowroomContext` back the recent-files
  history (`@/lib/recentDocuments`). A capped ring of recent PDFs' bytes; reopening bumps
  an entry to the front; an unreadable entry is dropped and `openRecentDocument` resolves
  `false`.

## What NOT to do
- Don't re-add audio UI here — the persistent player owns playback (YouTube + audio file).
- Don't add a media library — out of scope. The PDF is the only persisted concern here.
- Don't pull in pdf.js — the native browser viewer is intentional.
