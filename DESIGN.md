---
name: FlySmart (پرواز پلاس)
description: Flight booking in one calm sky; offers are boarding passes, brand cobalt only for action.
colors:
  primary: "oklch(0.53 0.22 255)"
  primary-foreground: "oklch(0.99 0 0)"
  background: "oklch(0.985 0.006 245)"
  foreground: "oklch(0.16 0.04 255)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.955 0.012 245)"
  muted-foreground: "oklch(0.47 0.035 250)"
  secondary: "oklch(0.95 0.02 245)"
  border: "oklch(0.91 0.015 245)"
  input: "oklch(0.89 0.02 245)"
  brand-soft: "oklch(0.95 0.03 255)"
  brand-ink: "oklch(0.4 0.18 258)"
  warning: "oklch(0.8 0.16 75)"
  warning-ink: "oklch(0.42 0.1 55)"
  warning-soft: "oklch(0.96 0.05 85)"
  destructive: "oklch(0.55 0.22 25)"
  sky-band-top: "oklch(0.89 0.065 240)"
  sky-band-mid: "oklch(0.945 0.035 240)"
  ticket-stub: "oklch(0.975 0.014 245)"
  night: "oklch(0.17 0.05 265)"
  night-ink: "oklch(0.97 0.01 245)"
  night-ink-muted: "oklch(0.8 0.03 250)"
typography:
  page-title:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 900
    lineHeight: 1.1
  ticket-time:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  price:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
  title:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Vazirmatn, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  md: "9.6px"
  lg: "12px"
  xl: "16.8px"
  2xl: "21.6px"
  full: "9999px"
spacing:
  card-sm: "16px"
  card: "20px"
  gutter: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    height: "36px"
    padding: "0 14px"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    height: "44px"
    padding: "0 20px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "36px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
    padding: "4px 12px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
  header-bar:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
    height: "56px"
  ticket-stub:
    backgroundColor: "{colors.ticket-stub}"
    width: "216px"
    padding: "20px"
  fare-tile:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    height: "72px"
    width: "112px"
  fare-tile-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  footer-night:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
---

# Design System: FlySmart

## Overview

**Creative North Star: "The Cabin Window"**

The working pages are the same sky the landing opened, seen from the cabin: a pale, still sky band behind solid, opaque panels, under a floating header bar. A flight offer is a boarding pass, never a generic card. Persian, right-to-left, Vazirmatn throughout, with tabular numerals wherever a price, time or count appears.

Density is moderate: one 6xl-wide column (max-w-6xl, 16px gutters), 24px between blocks, panels that carry hairline plus a soft shadow. Brand cobalt is spent only on action and the active state; amber marks urgency and peak days. Night navy returns only in the footer, continuing the landing's dusk.

**Key Characteristics:**

- Sky band at the top of every working page, fading into the page colour; hidden on the landing and in print.
- Opaque panels (card colour, 1px ring at 10% foreground, soft panel shadow); no glass, no nested bordered cards.
- Boarding-pass FlightCard with real notch cut-outs and a dashed perforation to the price stub.
- One recurring motif: the route line (ringed dot, dashed rule, plane, dashed rule, solid dot).
- Logical (start/end) layout; directional icons flip in RTL.

## Colors

Cool-tinted neutrals, one cobalt voice, solar amber for urgency; oklch is the source of truth and values live in the frontmatter. A dark theme ("Midnight Horizon") reassigns the same tokens in `.dark`.

### Primary

- **Electric Aviation Cobalt** (`primary`): the select button, the selected fare tile, the active dashboard link, the route line's plane and end dot, focus ring, caret and accent-color.
- **Brand Ink** (`brand-ink`) on **Brand Soft** (`brand-soft`): cheapest-day price and label, price-verdict emphasis; text-safe cobalt.

### Secondary

- **Solar Amber** (`warning`, text `warning-ink`, tint `warning-soft`): scarce seats, peak days, the last two minutes of a hold. Ink, not the fill, is used for text.

### Neutral

- **Stratosphere Cloud White** (`background`) page ground; **Card White** (`card`) every panel, input and header bar; **Ticket Stub Tint** (`ticket-stub`) the price stub; **Muted** (`muted`) segmented controls, hover fills; **Border / Input** hairlines and field strokes.
- **Sky Band** (`sky-band-top` to `sky-band-mid` to `background`): vertical wash, 34rem tall, with three soft white elliptical clouds (75% opacity light, 28% dark).
- **Night** (`night`, `night-ink`, `night-ink-muted`): footer only on working pages; same values in both themes.

### Named Rules

**The Cobalt For Action Rule.** Cobalt fills mark the thing to press or the thing that is current (select button, selected date, active nav). Informational emphasis uses brand-ink text, not a cobalt fill.
**The Colour Plus Word Rule.** Cheapest, peak, scarce and verdict states pair colour with words or an icon; colour is never the only signal.

## Typography

**Display / Body / Label Font:** Vazirmatn (with ui-sans-serif, system-ui). One family, weight carries the hierarchy.

**Character:** Heavy 900 for the numbers a traveller scans (times, prices, page titles), plain 400-500 for supporting detail. Times and prices use `.tnum`; flight numbers and airport codes are `dir="ltr"`.

### Hierarchy

- **Page title** (900, 1.875rem, 3rem from md, balanced wrap): route banner "city, route line, city" and PageHeader h1.
- **Ticket time** (900, 1.875rem, line-height 1, tabular): departure and arrival on a ticket.
- **Price** (900, 1.5rem): the stub price.
- **Title** (700, 1rem; 1.125-1.25rem for detail-page card titles): airline name, CardTitle.
- **Body** (400, 0.875rem; inputs 1rem below md): panel copy, with muted-foreground for secondary lines.
- **Label** (500-600, 0.75rem; fare-tile sub-labels 0.7rem): meta rows, durations, counts.

### Named Rules

**The Numbers Line Up Rule.** Every price, time, count and date uses tabular numerals so columns align.

## Layout

A single container, `max-w-6xl`, `px-4`, `pt-10 pb-12`, `gap-6`, shared by header, pages and footer so edges align. Results are a two-column grid from `lg` (18rem sticky filter aside, then the ticket column); below `lg` filters move to a sheet. Tickets stack with 16px gaps. Dashboard is a sidebar from `lg`, a horizontal scrolling tab row below. The select action sits in the ticket stub at the inline end; on mobile the stub drops under the body behind a dashed top rule. Breakpoints in use: sm, md (48rem, where the ticket notches appear), lg.

## Elevation & Depth

Hybrid: hairline ring plus soft shadow on panels that sit over the sky; flat tonal fills (muted, secondary) inside panels.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 1px 2px shadow-ink/7%, 0 10px 28px -14px shadow-ink/22%`): Card, header bar, fare tiles, dashboard nav panel, empty state.
- **Lift** (`0 2px 4px shadow-ink/8%, 0 18px 36px -16px shadow-ink/30%`): select popovers.
- **Ticket** (`filter: drop-shadow(0 0 .5px ticket-edge) drop-shadow(0 12px 14px shadow-ink/9%)`, 16px offset at 16% on hover or focus-within): FlightCard wrapper; a filter, because a mask would clip a box-shadow.
- Small `shadow-xs` / `shadow-sm` on buttons, alerts and selected segmented items.

### Named Rules

**The Shadow Follows The Cut Rule.** Anything masked (the ticket) draws its edge and shadow on a wrapper with `filter: drop-shadow`, never `box-shadow`.

## Shapes

`--radius` is 0.75rem and the scale is multiplicative: md 9.6px, lg 12px, xl 16.8px, 2xl 21.6px. Panels, the header bar, empty states, skeletons and the ticket body are 2xl; alerts, fare tiles, segmented controls and nav links are xl; buttons, inputs and selects are lg. Dashed rules mean "tear here" (perforation, route line, empty state). Dots are full circles.

## Components

### Floating header bar

Sticky, detached from the top edge (`px-3 pt-3`), a 56px card-coloured bar, 2xl radius, panel shadow plus 10% ring, max-w-6xl. Logo, ghost small nav buttons from md, theme toggle, user menu or small primary sign-in button.

### Sky band

`.app-sky`: absolute, 34rem, behind content (z -1), pointer-events none. Hidden when a journey root (the landing) is present and in print.

### Panel / Card

Card colour, 2xl radius, panel shadow, 1px ring at 10% foreground, 20px internal spacing (16px for size sm), optional muted/50 footer with top border. Titles are 700, 1rem.

### Buttons

- **Shape:** lg radius, 600 weight, 0.875rem. Sizes: default 36px high, 14px inline padding; lg 44px, 20px padding, 1rem; sm 32px; xs 24px; icon 36px, icon-lg 44px.
- **Primary:** cobalt fill, near-white text, shadow-sm, hover primary at 85%.
- **Outline:** card fill, input border, hover muted. **Ghost:** transparent, hover muted. **Secondary, destructive (10% tint), link** also exist.
- **Focus / press:** 3px ring at 50% ring colour; 1px downward nudge on press; disabled 50% opacity.

### Inputs / Fields

40px high, lg radius, card background, input-colour border, 12px inline padding, 1rem text (0.875rem from md). Select trigger matches (40px, 32px small), its popover is xl with the lift shadow. Textarea min-height 64px, same skin. Focus: border to ring plus 3px ring at 50%. Invalid: destructive border and 20% ring.

### Segmented controls

Toggle group and tabs: muted track, xl radius, 4px padding; the active item is a card or background chip with shadow-xs.

### Alerts and empty state

Alert: card fill, xl radius, border, shadow-xs, optional leading icon. Empty: 2xl, dashed border, centred, on card with panel shadow.

### FlightCard (boarding pass)

Wrapper `.ticket-wrap` carries the shadow; `.ticket` is a card-coloured 21.6px-radius grid, body plus a 13.5rem stub from md. A radial-gradient mask cuts a 0.7rem half-circle notch at the top and bottom of the perforation, so the sky shows through; the stub sits at the inline end (cut position flips by `dir`). The perforation is a 2px dashed foreground/25% border on the stub, top edge below md, start edge from md. Body: airline, number, aircraft, badges; times with city and airport code at either end of a duration, route line and stop label; baggage, meal and scarcity meta; collapsible refund rules. Stub: 1.5rem price, per-adult caption, insight badge, large primary select button, small ghost detail link.

### Route line

Ringed dot (cobalt border, card fill), dashed foreground/25% rule, cobalt plane (rotated to point along reading direction), dashed rule, solid cobalt dot. Used in the ticket and in the results title banner (w-20, md w-36).

### Fare strip tile

112 x 72px, xl radius, panel shadow, card fill, hover muted; shows weekday and Jalali date, price, then a 12px label slot. Selected = solid primary fill with primary-foreground text and `aria-current="date"`. Cheapest day: brand-ink price and label; peak: warning-ink label; no fares: 50% opacity, disabled. Scrolls horizontally with snap; outline icon buttons at both ends.

### Dashboard nav

Below `lg`: a scrolling row of pills. From `lg`: a card panel (2xl, panel shadow, ring, 8px padding) of vertical links, xl radius, 600 weight, icon plus label. Current page is solid primary and `aria-current="page"`; others muted-foreground with muted hover.

### Night footer

Full-width `night` fill, night-ink text, night-ink-muted secondary copy, 10% top border, 20px (mt-20) separation from content, links underline on hover, hidden in print.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens only; show a verdict, cheapest or scarce state with colour plus words or an icon.
- **Do** put the primary action of an offer in the stub at the inline end.
- **Do** use the shared container and PageHeader/route banner for titles; weight 900 and scale, no decoration, carry emphasis.
- **Do** give every masked or cut shape its shadow through `filter: drop-shadow` on a wrapper.
- **Do** keep panels opaque on the sky band.

### Don't:

- **Don't** use cobalt fills for decoration or informational chips; it marks action and the current item.
- **Don't** put white rounded cards on a flat grey page with a plain sticky bar; this world rejects it.
- **Don't** nest bordered panels inside panels; use muted or secondary tonal tiles.
- **Don't** use glass, glow, gradient text, side-stripe borders or bounce easing (carried from the original rules).

## Aero Stratosphere: original world and landing (preserved)

## Visual World: Aero Stratosphere

Inspired by high-altitude supersonic aviation, cockpit telemetry, and golden-hour horizon dynamics. Strict departure from generic corporate greens and heavy shadows.

### 1. Palette System

- **Light Surface:** Stratosphere Cloud White `oklch(0.985 0.006 245)`
- **Dark Surface:** Midnight Stratosphere Navy `oklch(0.13 0.03 260)`
- **Aviation Primary (Light):** Electric Aviation Cobalt `oklch(0.53 0.22 255)` (`#2563eb`)
- **Aviation Primary (Dark):** Luminous Celestial Cyan-Cobalt `oklch(0.68 0.19 245)` (`#38bdf8`)
- **Horizon Solar Accent (Deals/Urgency/Lowest Fares):** Solar Amber `oklch(0.72 0.18 55)` / `oklch(0.76 0.18 60)`
- **Forbidden:** No vegetable or supermarket emerald greens. Green is completely replaced with precision aeronautical cobalt or warm solar amber.

### 2. Craft Floor & Anti-Patterns

- **No Gradient Text:** Headlines achieve emphasis strictly via weight (`font-extrabold`) and deliberate scale (`text-3xl` to `text-5xl`).
- **No Eyebrow Kickers:** Headlines carry their own weight without repetitive badge kickers.
- **Single Elevation Declaration:** Cards declare elevation once (clean subtle border or soft offset blur, never heavy offset 0-blur boxes).
- **Radius Bounds:** Controls are 12px (`rounded-lg`); panels and tickets are 21.6px (`rounded-2xl`).
- **Real SVG Icons:** Lucide aviation icons at consistent 1.5–2px stroke; zero emoji glyphs.

### 3. Motion & Micro-Interactions

- Smooth spring-eased transitions (`transition-all duration-200 ease-out`).
- Airport swap button with 180° fluid rotation on trigger.
- Theme toggle with scale/rotation flip between Sun and Moon.
- Expandable flight rules drawer with smooth height easing.
- Custom aeronautical thin scrollbars and cyan-tinted text selection.

## Rebuild notes (shadcn + impeccable)

- Tokens are semantic only (`primary`, `muted`, `warning`, `brand-soft`, `brand-ink`, `warning-soft`, `warning-ink`);
  components never use raw colours. Numbers use tabular figures (`.tnum`).
- Colour is never the only signal: verdicts and reliability pair colour with an icon and words.
- Layout is logical (start/end) and direction-aware; directional icons use `rtl:rotate-180`. The price chart
  runs time right-to-left with its value axis at the end edge.
- Time-sensitive state (hold countdown) switches to the warning tokens in the last two minutes.
- Impeccable checks: no gradient text, glass, glow, side-stripe borders, nested cards or bounce easing.
  Run `npx impeccable detect apps/web/src` after installing dependencies.

## Landing: one approach, then a day (2026-10-07, reworked)

The landing (`/`) is one scroll-driven flight. See `docs/adr/0005-landing-flight-day.md`.

- **Opening:** an A320-class airliner is a speck in the upper right of a clear morning sky, flying straight at the
  viewer. Scrolling magnifies it exponentially; the viewer's head follows it and tilts back as it passes low
  overhead, then it pulls up and leaves through the top of the screen. After that the sky turns from morning to
  noon, dusk and night inside empty spacers.
- **Realism, not illustration:** lofted geometry from real planform numbers (sweep, taper, dihedral, washout,
  aerofoil sections), clear-coat paint with a painted livery texture, glass that reflects the actual sky, a
  spinning fan behind the intake, atmospheric fog tinted to the sky behind the aircraft, and a procedural sky
  (gradient, cirrus, fair-weather cumulus lit from the sun's side, stars at night). No outlines, no flat fills in
  the 3D tier.
- **Sky** is a physical scene with its own palette (not theme tokens): clear morning, noon blue, dusk copper,
  night navy. The dark theme's morning sky is deliberately deep so the hero headline, which sits straight on
  it, keeps light type above 4.5:1. Colours change only inside the empty spacers.
- **Panels:** all other copy sits on `JourneyPanel` (bg-card, rounded-3xl, one hairline border, one soft
  primary-tinted offset shadow). No nested bordered cards: deals are `bg-secondary` tiles.
- **Airliner:** white with a navy fin, cheatline and an amber pinstripe; tokens `--plane-body`, `--plane-shade`,
  `--plane-glass`, `--plane-livery`. Landing lights, nav lights, strobes and a beacon, brighter at night.
- **Night close:** solid `--night` with `--night-ink` / `--night-ink-muted` text in both themes.
- **Type:** Vazirmatn 900 for display (hero up to `text-6xl`), 800 for section titles, no gradient text.
- **Motion:** one authored moment (the approach) plus a transform-only rise on sections; every effect has a
  `prefers-reduced-motion` path (a still sky with the aircraft far away).
