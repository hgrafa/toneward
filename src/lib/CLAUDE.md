# Lib — Utilities & Persistence

## Files
- `utils.ts` — shadcn `cn()` class-name helper. Leave as the shadcn default.
- `tuningStorage.ts` — load/save the tuning to localStorage (`fretboard.tuning`). Validates shape on load and falls back to the default instrument on anything invalid.
- `documentStorage.ts` — persist the Showroom PDF across reloads: bytes in IndexedDB (`ArrayBuffer` + MIME type), name marker in localStorage (`fretboard.showroom.document`). When the marker survives but the bytes don't, `loadStoredDocument` returns a tombstone (`{ name, blob: null }`) so the UI can say "couldn't reopen".
- `recentDocuments.ts` — recent-files history for the Showroom empty state: a capped ring (`MAX_RECENT_DOCUMENTS`) of recently opened PDFs' bytes in IndexedDB (DB `toneward-recent`), with a lightweight `{ id, name, addedAt }` index in localStorage (`fretboard.showroom.recent`) so `listRecentDocuments()` is synchronous. Browsers can't reopen by path, so bytes are the only way a click actually re-opens; `readRecentDocument(id)` returns `null` when bytes were evicted (caller shows a notice). Deduped by name; oldest evicted past the cap. Separate concern from `documentStorage` (current doc) on purpose.

## Conventions
- Persisted tuning is `NoteName[]` (pitch classes). Octaves are NOT persisted — they're derived in `core/pitch.ts`.
- Storage access is wrapped in try/catch (private mode / quota).
- Each persisted concern is its own single-purpose module (load/save/clear) — not a shared framework.

## What NOT to do
- Don't widen the stored tuning schema to include octaves or spelling — keep it pitch-class only.
- Don't generalize these into one persistence framework; add a focused module per concern, as `documentStorage` did.
