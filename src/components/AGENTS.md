# Components - UI Layer

React components consuming data from `@/core` and the split contexts in `@/hooks`.
All rendering uses shadcn/ui primitives + SVG.

## Layout

Vertical stack: Editor -> TuningControls -> Toolbar -> Fretboard -> BoxPatterns (see `App.tsx`).

The app shell (`App.tsx`) is a sidebar (`AppSidebar`) + a single active view:
`FretboardView` (the stack above) or `showroom/ShowroomView`. View state lives in
`hooks/ViewContext` (`useView`).

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

## State

Four focused contexts composed by `FretboardProvider` (`@/hooks`): Input, Display, Instrument, Derived. Subscribe to the narrowest hook you need.

## What Not To Do

- Do not duplicate the fretboard SVG - extend `FretboardDiagram`.
- Do not read the whole context - use the specific hook.
- Do not put layout constants in a consumer - add them to a dimensions preset.
