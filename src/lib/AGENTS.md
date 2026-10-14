# Lib - Utilities And Persistence

## Files

- `utils.ts` - shadcn `cn()` class-name helper. Leave as the shadcn default.
- `tuningStorage.ts` - load/save the tuning to localStorage (`fretboard.tuning`). Validates shape on load and falls back to the default instrument on anything invalid.
- `documentStorage.ts` - persist the Showroom PDF across reloads: bytes in IndexedDB (`ArrayBuffer` + MIME type), name marker in localStorage (`fretboard.showroom.document`). When the marker survives but the bytes don't, `loadStoredDocument` returns a tombstone (`{ name, blob: null }`) so the UI can say "couldn't reopen".
- `supabase.ts` - the one Supabase client (`null` without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`). PKCE OAuth flow; the session lives in localStorage under `toneward.auth`. Only `hooks/AuthContext` should import it for auth.
- `googleSignIn.ts` - direct Google OpenID redirect: `createGoogleSignInUrl` (stores state + raw nonce in sessionStorage; Google gets the nonce's SHA-256), `readGoogleRedirect` / `clearGoogleRedirect` for the ID token in the return URL's hash.

## Conventions

- Persisted tuning is `NoteName[]` (pitch classes). Octaves are not persisted - they are derived in `core/pitch.ts`.
- Storage access is wrapped in try/catch (private mode / quota).
- Each persisted concern is its own single-purpose module (load/save/clear) - not a shared framework.

## What Not To Do

- Do not widen the stored tuning schema to include octaves or spelling - keep it pitch-class only.
- Do not generalize these into one persistence framework; add a focused module per concern, as `documentStorage` did.
