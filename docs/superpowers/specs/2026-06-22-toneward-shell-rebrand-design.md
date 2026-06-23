# Toneward Shell Rebrand — Design Spec

**Date:** 2026-06-22
**Scope:** Global visual system + app shell + Braço (fretboard) tab + persistent player.
**Reference:** `Toneward_Handoff.md` and the `Toneward.dc.html` prototype (claude.ai/design project `9f3afadf-…`).

## Goal

Bring the production app's look in line with the Toneward rebrand prototype: a warm
**stone** neutral palette with a single disciplined pink→orange **brand gradient**, three
brand fonts, and the prototype's chrome — a fixed **top header**, a **floating left
sidebar** (vertically centered capsule), and a **persistent bottom-right audio player**.
The Braço tab is fully
restyled. Showroom and Prática inherit the palette but are **not** redesigned.

The work ships as **four small, independently-reviewable PRs**, riskiest last.

## Principles

- **Behavior-preserving.** Music-theory core, the four fretboard contexts, metronome/
  audio logic, and `useMediaPlayer` keep their behavior. This is restyle + relocate +
  (for the player) lift-state-up — not a logic rewrite.
- **Token-driven recolor.** Nearly every component already renders through theme tokens
  (`bg-card`, `border-border`, `fill-foreground`, `bg-primary`, `text-muted-foreground`).
  Swapping the `:root` tokens in `index.css` recolors the whole app. The only hardcoded
  board color is the root dot (`fill-rose-500`).
- **Accent discipline (default).** Brand pink/gradient is reserved for: logo, active nav,
  primary CTAs, progress fill, and the root dot. Everything else is stone-neutral. This is
  the implementation default; final per-element accent placement is decided in review.

## Palette (from handoff)

| Token | Value |
| --- | --- |
| Page bg / card | `#FFFFFF` |
| Input / soft fill | `#F6F2EC` |
| Segmented / chip fill | `#F0EBE2` · track `#ECE6DD` |
| Hairline border | `#E6DFD4` · input border `#DED7CB` |
| Ink — primary / secondary / muted | `#23201C` / `#595349` / `#A8A097` |
| Brand pink | `#F23D78` |
| Brand gradient | `linear-gradient(140deg,#FF9CB4,#F23D78 45%,#F2683C 76%,#FBA63F)` |
| Logo mark gradient | `linear-gradient(150deg,#3A332C 0%,#5B4A45 15%,#C8345F 44%,#F2683C 74%,#FBA63F 100%)` |
| Status ok | `#22C55E` |

**Fonts:** Bricolage Grotesque (display/headings), Hanken Grotesk (body/UI),
JetBrains Mono (numeric: note names, BPM, timecodes, fret/tuning values).

---

## Step 1 — Design foundation (tokens + fonts) · low risk

**Files:** `src/index.css` (primary), `index.html` (font links), `src/components/FretboardDiagram.tsx` (root dot).

- Rewrite the `:root` token block in `index.css` to the stone palette above. Keep the
  existing shadcn token *names* (`--background`, `--card`, `--border`, `--input`,
  `--foreground`, `--primary`, `--secondary`, `--muted-foreground`, `--accent`, etc.) so
  all consumers recolor automatically. Use hex values for fidelity to the handoff.
- Add a brand layer: `--brand: #F23D78`, plus a reusable `.bg-brand-gradient` utility and
  (if needed) `.text-brand`. These are the *only* place the gradient lives.
- Decide `--primary`: keep it as **dark stone ink** (`#23201C`) so existing "primary"
  surfaces (dark buttons, default active states) read as sober; the gradient is applied
  explicitly via `.bg-brand-gradient` where the prototype calls for an expressive accent.
- Load the three Google fonts via `index.html` `<link>` (matching the prototype's
  `fonts.googleapis.com` request). Wire Tailwind families: `font-sans` → Hanken Grotesk,
  `font-mono` → JetBrains Mono, and add a `font-display` → Bricolage Grotesque.
- Point the root dot at `--brand` (replace `fill-rose-500 stroke-rose-300`).

**Result:** the whole app recolors and re-types in one diff. No layout change.

**Out of scope here:** moving any element; new components.

---

## Step 2 — App shell: header + floating sidebar · medium risk

**New files:** `src/components/AppHeader.tsx`, `src/components/FloatingNav.tsx` (capsule sidebar).
**Modified:** `src/App.tsx`, `src/components/AppSidebar.tsx` (removed/replaced),
`src/components/MetronomePanel.tsx` + `src/components/AudioControlPanel.tsx` (trigger restyle only),
`src/components/FretboardView.tsx` (drop the metro/audio row).

- **AppHeader** — fixed 60px frosted bar (`rgba(255,255,255,0.82)` + `backdrop-blur`,
  bottom hairline). Left: squircle **T** logo (gradient mark) + *Toneward / Practice OS*
  lockup + a faint divider + the current section name (from `useView`). Right: **Language**
  switch (moved out of the old sidebar), **Metrônomo** button, **Áudio** button. The two
  buttons open the *existing* `MetronomePanel` / `AudioControlPanel` popovers — only the
  trigger styling changes; panel internals/logic are untouched. Active/open trigger inverts
  to dark ink (`#23201C`).
- **FloatingNav** — small frosted capsule, absolutely positioned, vertically centered on
  the **left** edge (the prototype render confirms left, not right; main content carries a
  ~96px left pad to clear it). Icons only by default; hover expands (width transition) to
  reveal labels. Items: Braço / Showroom / Prática, driven by `useView`. Active item uses
  the brand gradient (default expressive). Keeps the existing localStorage view persistence.
- **App.tsx** — change `AppShell` from a horizontal `flex` (left sidebar + main) to a
  vertical column: `AppHeader` on top, then a relative body containing `main` (scroll),
  the floating nav, and (Step 4) the player. Remove the left `AppSidebar`.
- **FretboardView** — remove the `Toolbar/MetronomePanel/AudioControlPanel` row's
  metro+audio (they now live in the header). The Braço `Toolbar` keeps its view controls.

**Notes/usability:** Metrônomo + Áudio become **global** (available on every tab), matching
the prototype. The language switch leaves the (now-removed) left sidebar and lives in the
header. The old `sidebarCollapsed` toggle is retired in favor of hover-expand.

---

## Step 3 — Braço tab restyle · medium risk, isolated

**Modified:** `src/components/Editor.tsx`, `src/components/TuningControls.tsx`,
`src/components/Toolbar.tsx`, `src/components/FretboardView.tsx`,
`src/components/BoxPatterns.tsx`. SVG geometry in `FretboardDiagram.tsx` largely carries over.

- Match the prototype's Braço layout: page title in Bricolage Grotesque; a two-card top row
  (scale input card + instrument/tuning card) with 18px radius and hairline borders;
  uppercase muted section labels; JetBrains Mono for the interval field, scale summary,
  tuning cells, and fret-range inputs.
- **Toolbar:** an eye icon, then a segmented label-mode control (Notas / Intervalos /
  Nenhum) on `#ECE6DD` with the active item as a white pill; a **Tônica** toggle whose
  active state is **dark ink** (`#23201C`, not gradient); NPS 2/3 segmented control;
  fret-range mono inputs; copy button — styled per prototype.
- **Fretboard card + BoxPatterns:** stone card wrappers; board strings/frets as stone
  hairlines; box cards at 16px radius. Non-root dots stay dark ink (`#262220`/foreground),
  root dot is brand pink (from Step 1).

---

## Step 4 — Persistent player · highest risk, last

**New files:** `src/hooks/MediaPlayerContext.tsx` (shell-level provider),
`src/components/PersistentPlayer.tsx`.
**Modified:** `src/App.tsx` (mount provider + player + the single `<audio>`/YT container),
`src/components/showroom/ShowroomView.tsx`, `src/hooks/ShowroomContext.tsx`,
removal of `src/components/showroom/AudioDock.tsx` + `src/components/showroom/MediaSourceBar.tsx`.

- **Lift media state to the shell.** Move ownership of `audioSource` + `useMediaPlayer` +
  the `<audio>` element and YouTube container out of `ShowroomView` into a new
  `MediaPlayerProvider` mounted at the app shell, so playback persists across tab changes
  (audio element mounted once, never unmounts). `useMediaPlayer` itself is reused as-is.
- **PersistentPlayer** — anchored bottom-right. Mini pill by default (play/pause, speed
  cycle, mute, volume, expand chevron, track title when loaded) ↔ expanded card (loader
  when no track: paste link **or** upload file; full transport when loaded: seek bar,
  loop, ±10s, large play, speed, volume, pin). Auto-minimize on mouse-leave unless pinned.
- **Preserve existing backends.** Keep both YouTube and MP3 support (do not reduce to
  audio-links-only). The loader's link field accepts a YouTube URL or a direct audio URL;
  file upload covers mp3/wav/ogg/m4a — same `AudioSource` model the hook already uses.
- **Showroom consequence (flagged).** `MediaSourceBar` + `AudioDock` are removed; Showroom
  keeps PDF + notes only. This is the one intentional touch to a tab otherwise left alone,
  because audio is now global. `ShowroomContext` keeps `currentDocument`; `audioSource`
  moves to the new media context.

**Risks:** state-lift + cross-tab persistence is the most invasive change; the YouTube
hidden-iframe lifecycle must survive remount-free tab switches. Verify playback continues
when switching Braço↔Showroom↔Prática.

---

## Out of scope (this pass)

- Redesigning Showroom or Prática internals (beyond the unavoidable audio relocation).
- Audio **output routing** / `setSinkId` per-source panel (handoff §05) — `AudioControlPanel`
  keeps its current single-output behavior.
- Localizing newly-added strings beyond the existing i18n pattern.
- Player state persistence to `localStorage` (last track/volume/speed/pin).
- The `sober`/`dock` theme variants — we ship the expressive + capsule defaults.

## Verification per step

- `pnpm lint` and `pnpm build` clean after each step.
- Existing tests pass; no behavior regressions in fretboard, metronome, or media player.
- Manual visual check against the prototype for the step's surface.
