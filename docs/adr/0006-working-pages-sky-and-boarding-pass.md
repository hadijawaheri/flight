# ADR 0006: Working pages share the landing's sky and use boarding-pass offers

## Status

Accepted

## Context

The landing was rebuilt as one flight through a day, but every other page still looked like a
default shadcn app (flat page, hairline cards, 32px controls), so the product read as two
different sites and the redesign did not register to the user.

## Decision

- A still sky band (`.app-sky`, tokens `--sky-band-*`) sits behind the top of every working page and
  fades into the page colour. The landing paints its own sky and hides it.
- Content stays on solid panels (`Card`, `shadow-panel`); the header is a floating solid bar and the
  footer is night blue, continuing the landing's dusk.
- A flight offer is a boarding pass: body plus a stub with a dashed perforation and masked
  half-circle notches (`.ticket`, shadow drawn by the `.ticket-wrap` filter because a mask clips box-shadow).
- `RouteLine` (dot, dashes, plane, dot) is the single recurring motif.
- Controls grow (buttons 36/44px, inputs 40px) and `--radius` is 0.75rem with panels at 2xl.

## Consequences

- Colours stay tokens: shadows use `--shadow-ink` so they stay dark in the dark theme.
- The notch mask only applies from `md`; below it the stub stacks under a dashed rule.
- Visual QA needs the real app; the build was only checked with a static harness.
