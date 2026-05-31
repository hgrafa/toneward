# Components — UI Layer

React components consuming data from `@/core`. All rendering uses shadcn/ui primitives + SVG for the fretboard.

## Layout

Vertical stack: Editor on top, Fretboard below, Toolbar in between.

```
┌─────────────────────────────────────┐
│  Editor (text input area)           │
├─────────────────────────────────────┤
│  Toolbar (toggles, export button)   │
├─────────────────────────────────────┤
│  Fretboard (SVG diagram)            │
└─────────────────────────────────────┘
```

## Components

### Editor
- Textarea for the note/interval syntax input
- Parses input in real-time (debounced)
- Shows inline syntax errors

### Toolbar
- Toggle: dot labels → note name / interval / none
- Toggle: highlight root (on/off)
- Fret range selector (start–end)
- Export button (PNG / SVG)

### TuningControls
- Instrument dropdown (shadcn Select): Guitar / Bass (4) / Bass (5) / Custom
- String-count stepper (1–12), adds/removes at the lowest string
- One note picker per string, ordered low→high; editing → instrument becomes "Custom"

### Fretboard (SVG)
- Renders neck: variable string count (from tuning) × configurable fret range
- Dots at active note positions
- Dot content controlled by display mode toggle (note/interval/none)
- Root note optionally highlighted (different color/border)
- Hover tooltip: shows note + interval info
- Fret markers at positions 3, 5, 7, 9, 12, 15, 17, 19, 21 (single dot) and 12 (double dot)

## State
Managed via React Context at App level:
- `inputText: string`
- `displayMode: 'note' | 'interval' | 'none'`
- `highlightRoot: boolean`
- `fretRange: [number, number]`
- `tuning: NoteName[]` (low→high) — persisted to localStorage
- `instrumentId: string` — derived from tuning via matchInstrument

No external state library needed.
