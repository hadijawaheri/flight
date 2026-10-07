/**
 * Pure maths for the landing sky: colours by hour of the day, the sun, and the sky gradient seen
 * at any angle. No DOM and no three.js, so the WebGL scene, the CSS fallback and the unit tests all
 * read the same numbers. The aircraft's own path lives in approach-model.ts.
 */

export type Tier = "full" | "lite" | "off";
export type Rgb = readonly [number, number, number];

export interface SkyColors {
  /** Straight up. */
  zenith: Rgb;
  /** Where the sky meets the haze, just above the horizon. */
  horizon: Rgb;
  /** The pale layer of haze that hangs on the horizon and fades the distance. */
  haze: Rgb;
}

type FourStops<T> = readonly [T, T, T, T];

// Hours: 0 clear morning, 1 noon, 2 dusk, 3 night. The sky is a lit scene of its own, so it does not
// use theme tokens; two palettes exist because a dark-theme visitor expects a deeper first impression.
// Copy never sits on the sky, it sits on solid panels.
const SKY_LIGHT: FourStops<SkyColors> = [
  { zenith: [96, 148, 226], horizon: [196, 218, 244], haze: [238, 234, 228] },
  { zenith: [54, 120, 220], horizon: [170, 206, 242], haze: [224, 234, 246] },
  { zenith: [54, 66, 132], horizon: [236, 140, 98], haze: [250, 192, 148] },
  { zenith: [5, 9, 24], horizon: [16, 26, 58], haze: [26, 36, 72] },
];

const SKY_DARK: FourStops<SkyColors> = [
  // The hero headline sits straight on this sky in the dark theme, so it stays deep enough for light type
  { zenith: [24, 52, 120], horizon: [66, 98, 160], haze: [80, 106, 154] },
  { zenith: [34, 86, 184], horizon: [120, 170, 226], haze: [190, 208, 230] },
  { zenith: [36, 40, 100], horizon: [196, 96, 70], haze: [220, 150, 112] },
  { zenith: [3, 6, 16], horizon: [10, 18, 42], haze: [18, 26, 56] },
];

// Cloud tint per hour, so a cloud at dusk is lit amber and a cloud at night is a dark blue-grey
const CLOUD_TINT: FourStops<Rgb> = [
  [255, 250, 244],
  [255, 255, 255],
  [255, 196, 160],
  [70, 86, 140],
];

export const LAST_HOUR = 3;

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

export function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

export function rgbToCss(color: Rgb): string {
  return `rgb(${Math.round(color[0])} ${Math.round(color[1])} ${Math.round(color[2])})`;
}

/** 0-255 sRGB to the 0-1 linear values a shader works in. */
export function srgbToLinear(color: Rgb): Rgb {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(color[0]), channel(color[1]), channel(color[2])];
}

function pickStops<T>(stops: FourStops<T>, hour: number): { from: T; to: T; t: number } {
  const clamped = Math.min(LAST_HOUR, Math.max(0, hour));
  const index = Math.min(LAST_HOUR - 1, Math.floor(clamped)) as 0 | 1 | 2;
  const next = (index + 1) as 1 | 2 | 3;
  return { from: stops[index], to: stops[next], t: clamped - index };
}

export function skyAt(hour: number, dark: boolean): SkyColors {
  const { from, to, t } = pickStops(dark ? SKY_DARK : SKY_LIGHT, hour);
  return {
    zenith: mixRgb(from.zenith, to.zenith, t),
    horizon: mixRgb(from.horizon, to.horizon, t),
    haze: mixRgb(from.haze, to.haze, t),
  };
}

/**
 * The sky's colour looking along a direction whose elevation is `angle` radians above the horizon.
 * The WebGL sky shader evaluates exactly this curve, so the CSS fallback and the fog on the
 * aircraft (which must match the sky behind it) agree with what the shader paints.
 */
export function skyColorAt(sky: SkyColors, angle: number): Rgb {
  const up = Math.sin(angle);
  const base =
    up >= 0
      ? mixRgb(sky.horizon, sky.zenith, clamp01(up) ** 0.45)
      : mixRgb(sky.horizon, sky.haze, smoothstep(-up / 0.25));
  return mixRgb(base, sky.haze, 0.5 * Math.exp(-Math.abs(up) * 12));
}

export function cloudTintAt(hour: number): Rgb {
  const { from, to, t } = pickStops(CLOUD_TINT, hour);
  return mixRgb(from, to, t);
}

/** 0 in daylight, 1 once the night has fully arrived; drives stars and aircraft lights. */
export function nightFactor(hour: number): number {
  return smoothstep(hour - 2);
}

/**
 * The sky only changes while a spacer crosses the screen, never while someone is reading a panel,
 * so each spacer contributes one smoothed step to the hour.
 */
export function hourFromSpacers(progress: readonly [number, number, number]): number {
  return smoothstep(progress[0]) + smoothstep(progress[1]) + smoothstep(progress[2]);
}

interface SunPosition {
  /** Degrees from straight behind the viewer, turning right; 180 is straight ahead. */
  azimuth: number;
  /** Degrees above the horizon. */
  elevation: number;
}

// Behind the viewer in the morning, so the nose of the approaching aircraft is lit; it travels
// round to the front for the dusk, and a dim moon stands in for it at night.
const SUN_PATH: FourStops<SunPosition> = [
  { azimuth: 38, elevation: 26 },
  { azimuth: 12, elevation: 60 },
  { azimuth: 168, elevation: 7 },
  { azimuth: 198, elevation: 34 },
];

const RAD = Math.PI / 180;

/** Unit vector towards the sun in the scene's world: viewer at the origin looking down -z. */
export function sunDirAt(hour: number): Rgb {
  const { from, to, t } = pickStops(SUN_PATH, hour);
  const eased = smoothstep(t);
  const azimuth = lerp(from.azimuth, to.azimuth, eased) * RAD;
  const elevation = lerp(from.elevation, to.elevation, eased) * RAD;
  return [
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  ];
}

interface SunLight {
  color: Rgb;
  intensity: number;
}

// Warm in the morning, white at noon, copper at dusk, a dim cold blue standing in for the moon at night
const SUN_LIGHT: FourStops<SunLight> = [
  { color: [255, 236, 214], intensity: 3 },
  { color: [255, 250, 240], intensity: 3.4 },
  { color: [255, 150, 92], intensity: 2.2 },
  { color: [150, 175, 255], intensity: 0.55 },
];

export function sunLightAt(hour: number): SunLight {
  const { from, to, t } = pickStops(SUN_LIGHT, hour);
  return {
    color: mixRgb(from.color, to.color, t),
    intensity: lerp(from.intensity, to.intensity, t),
  };
}

/** How strongly the sun (or moon) itself shows in the sky; it is only a glow when it is above the horizon. */
export function sunGlowAt(hour: number): number {
  const elevation = sunDirAt(hour)[1];
  return smoothstep((elevation + 0.02) / 0.12);
}

export interface StarSpec {
  x: number;
  y: number;
  r: number;
  twinkle: number;
}

/** Deterministic, so server markup and client agree. Used by the CSS sky; the WebGL sky hashes its own. */
export function buildStars(count = 70): readonly StarSpec[] {
  let seed = 7181;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 70,
    r: 0.6 + next() * 1.1,
    twinkle: next() * 4,
  }));
}

export interface CloudSpec {
  /** Radians left (negative) or right of straight ahead. */
  azimuth: number;
  /** Radians above the horizon. */
  elevation: number;
  /** Angular width in radians. */
  width: number;
  opacity: number;
}

/** Soft clouds pinned to the sky for the CSS fallback; the WebGL sky paints its own. */
export function buildClouds(): readonly CloudSpec[] {
  let seed = 20261007;
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 11 }, (_, index) => ({
    azimuth: (index / 10 - 0.5) * 2.2 + (next() - 0.5) * 0.3,
    elevation: 0.05 + next() * 0.75 + (index % 3) * 0.04,
    width: 0.24 + next() * 0.4,
    opacity: 0.45 + next() * 0.4,
  }));
}
