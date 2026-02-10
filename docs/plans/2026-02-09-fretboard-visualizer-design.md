# Fretboard Visualizer — Design Document

**Date**: 2026-02-09

## Goal

Web app to write notes or intervals in a friendly text syntax and visualize them on an interactive guitar fretboard diagram. Supports export to PNG/SVG.

## Input Syntax

### Mode 1: Absolute Notes
```
C E G Bb D
```
Accepts sharps (#) and flats (b). Internally normalizes to sharps.

### Mode 2: Intervals over Root
```
root: G
1 b3 4 5 b7
```
Resolves intervals relative to the chosen tonic, then maps to absolute notes.

## Fretboard Rendering

- **Technology**: SVG as React components
- **Tuning**: Standard EADGBE only
- **Fret range**: Configurable (default 0–12), max 0–22
- **Dot labels**: Toggleable — note name, interval, or none
- **Root highlight**: Optional toggle — distinguishes root note visually
- **Fret markers**: Single dot at 3, 5, 7, 9, 15, 17, 19, 21; double dot at 12
- **Interactivity**: Hover tooltips showing note + interval
- **Export**: PNG via html-to-image, SVG via DOM serialization

## Architecture

```
User Input (text)
  → Parser (core/parser.ts)
    → NoteSet { notes[], root? }
      → FretboardMapper (core/fretboard.ts)
        → Position[] { string, fret, note, interval? }
          → SVG Fretboard Component
```

### Core (pure TS, no React)
- `notes.ts` — chromatic scale, note math, flat/sharp normalization
- `parser.ts` — text syntax parser for both modes
- `fretboard.ts` — maps notes to fretboard positions

### Components (React + SVG)
- `Editor` — text input with real-time parsing
- `Toolbar` — controls (toggles, export)
- `Fretboard` — SVG rendering of the guitar neck

### State (React Context)
- `inputText`, `displayMode`, `highlightRoot`, `fretRange`

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Biome.js (lint + format)
- lucide-react + @phosphor-icons/react
- html-to-image (export)
- pnpm
