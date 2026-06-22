---
name: code-review
description: Review Toneward code changes for bugs, architecture violations, missing tests, and regressions. Use when the user asks Codex for a code review, diff review, PR review, or pre-merge review.
---

# Toneward Code Review

Take a code-review stance. Prioritize bugs, behavioral regressions, security issues, architecture violations, and missing tests.

## Architecture Rules

### `src/core/` - Pure TypeScript

- Must not import from `react`, `react-dom`, or any browser/DOM API.
- Pitch class is the math identity.
- Spelling and octave are additive layers.
- Functions should be pure and unit-testable in isolation.

### `src/components/` - React UI

- Use shadcn/ui primitives for form controls.
- SVG rendering uses React components; do not introduce canvas or d3 for the fretboard.
- Icons only from `lucide-react` or `@phosphor-icons/react`.
- Do not duplicate the fretboard SVG; extend `FretboardDiagram`.

### General

- Import alias `@/` maps to `src/`.
- Functional components only; no class components.
- No external state library; use the existing focused React contexts.
- Avoid `any` unless unavoidable and explained.

## Review Checklist

For each changed file, verify:

1. Correct module boundary.
2. No banned imports.
3. Consistent pitch-class/spelling model.
4. shadcn/ui usage for UI controls.
5. Focused state subscriptions.
6. Tests cover risky behavior.
7. Validation commands are appropriate for the changed surface.

## Output

List findings first, ordered by severity, with file/line references. If there are no findings, say so clearly and mention any residual test gaps.
