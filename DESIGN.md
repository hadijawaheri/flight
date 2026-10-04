# FlySmart - Design System & Visual World (2026 Aero Stratosphere)

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
- **Radius Bounds:** Cards stay within 12px–16px (`rounded-xl` to `rounded-2xl`).
- **Real SVG Icons:** Lucide aviation icons at consistent 1.5–2px stroke; zero emoji glyphs.

### 3. Motion & Micro-Interactions

- Smooth spring-eased transitions (`transition-all duration-200 ease-out`).
- Airport swap button with 180° fluid rotation on trigger.
- Theme toggle with scale/rotation flip between Sun and Moon.
- Expandable flight rules drawer with smooth height easing.
- Custom aeronautical thin scrollbars and cyan-tinted text selection.
