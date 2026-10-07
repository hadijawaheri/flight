# 0005 — The landing is one approach, drawn by scroll, in a realistic tiered scene

Status: accepted · Date: 2026-10-07 (reworked after review of the first, stylised version)

Context: the landing was a standard hero, a deals row and a feature list. The brief asked for a modern,
memorable page with scroll-driven animation built around an airliner. The first version crossed the page
sideways with a stylised model and cartoon-like sky; review rejected it. The requested effect is a realistic
airliner that starts tiny and distant, flies straight at the viewer as the page scrolls, passes overhead and
climbs away. Visitors are on mid-range phones and variable connections, and the page must stay accessible.

Decision:

- One approach path (`approach-model.ts`, pure and unit-tested): range shrinks by an exponential zoom, then a
  decelerating glide (the hand-over point is solved so speed is continuous) so the aircraft lingers when it is
  big and overhead. The aircraft's heading comes from the path tangent. The viewer's head follows it (yaw and
  pitch from the same maths), tilts back to look up as it passes, and releases once it has gone. The approach
  covers `APPROACH_SCROLL` viewport heights: the hero plus one open "approach" spacer.
- After the approach the sky changes from morning to night only while three empty "pass" spacers cross the
  screen. All other copy sits on solid panels. The hero headline sits straight on the morning sky, whose
  palettes are kept dark or light enough for 4.5:1 type in each theme.
- `journey-model.ts` holds the sky palettes, the sky gradient curve (`skyColorAt`, mirrored in GLSL), sun
  position and light, and deterministic stars and fallback clouds. `journey-engine.ts` derives frames from
  scroll and writes CSS variables straight to the DOM, so scrolling causes no React renders.
- Three tiers, chosen in `journey-tier.ts`: `full` draws the lofted airliner (`airliner-geometry.ts`, pure
  data, A320 planform) with physically based materials, an environment map painted from the same sky, fog
  matched to the sky behind the aircraft, canvas-drawn livery and fan textures, and a shader sky with
  procedural cirrus and cumulus (`sky-shader.ts`); no model or image downloads, three.js is code-split.
  `lite` moves SVG views drawn from the same planform (front view while the head is level, underside view when it
  tilts back) over a CSS gradient sky with the same vertical curve. `off` is a still sky with the aircraft far
  away for `prefers-reduced-motion`. `?motion=full|lite|off` forces a tier. Automated browsers, Save-Data,
  low memory or few cores start in `lite`; software-rendered WebGL, a lost context or sustained slow frames
  demote `full` to `lite` at runtime.
- Section reveals are a CSS scroll-driven animation on transform only, behind `@supports` and
  `prefers-reduced-motion: no-preference`; content is never faded out or hidden by default.

Consequences: a dependency on `three` (and `@types/three`) in `apps/web`; first paint is the SVG aircraft, which
the 3D scene replaces after its first frame. The sky is a physical scene, so its CSS and shader use their own
palettes (not theme tokens). The night section and the aircraft have fixed colours in both themes (`--night*`,
`--plane-*` tokens). The sky fragment shader runs a few noise octaves per pixel; the frame governor lowers the
pixel ratio, then demotes to `lite`, on devices that cannot keep up.
