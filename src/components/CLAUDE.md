# Components — UI Layer

React components consuming data from `@/core` and the split contexts in `@/hooks`.
All rendering uses shadcn/ui primitives + SVG.

## Layout
Vertical stack: Editor → TuningControls → Toolbar → Fretboard → BoxPatterns (see `App.tsx`).

The app shell (`App.tsx`) is a fixed top `AppHeader` (brand lockup + current section name
+ language / Metrônomo / Áudio controls) and a floating left `FloatingNav` capsule, over a
single active view: `FretboardView` (the stack above), `showroom/ShowroomView`, or
`practice/PracticeView`. View state lives in `hooks/ViewContext` (`useView`). The Metrônomo
and Áudio popovers live in the header (global), not in the Braço toolbar.

## Components

### FretboardDiagram (the one SVG primitive)
- Pure presentational SVG. Takes `positions`, `stringCount`, fret window, a `dimensions` preset, display options, optional `onHoverPosition`.
- Two presets: `MAIN_DIMENSIONS`, `BOX_DIMENSIONS`. **All pixel values live here** — never hardcode geometry in a consumer.
- Labels via `formatSpelled(pos.spelled)` in note mode; root highlight compares `rootPitchClass` to `pos.note`.

### Fretboard
- Thin wrapper: pulls from `useDerived`/`useDisplay`/`useInput`/`useInstrument`, renders `<FretboardDiagram dimensions={MAIN_DIMENSIONS}>`, owns the tooltip overlay.

### BoxPatterns
- Thin wrapper: computes each box's display window, renders `<FretboardDiagram dimensions={BOX_DIMENSIONS}>` (no tooltip).

### Editor / Toolbar / TuningControls
- `Editor` → `useInput`; `Toolbar` → `useDisplay`; `TuningControls` → `useInstrument`.

## State
Four focused contexts composed by `FretboardProvider` (`@/hooks`): Input, Display, Instrument, Derived. Subscribe to the narrowest hook you need.

## What NOT to do
- Don't duplicate the fretboard SVG — extend `FretboardDiagram`.
- Don't read the whole context — use the specific hook.
- Don't put layout constants in a consumer — add them to a dimensions preset.
