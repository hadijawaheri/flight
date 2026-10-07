/**
 * The flight path of the landing page: a single airliner that starts as a speck on the horizon,
 * flies straight at the viewer, passes low overhead and climbs away. Pure maths with no DOM and no
 * three.js, so the WebGL scene, the SVG fallback and the unit tests all read the same numbers.
 *
 * World: metres, the viewer stands at the origin looking down -z (three.js convention), +x is the
 * viewer's right and +y is up. The aircraft's own frame has its nose on +x (see airliner-geometry).
 */

export type Vec3 = readonly [number, number, number];

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
export const smoothstep = (value: number): number => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

const RAD = Math.PI / 180;

/** Scroll distance of the whole approach, in viewport heights. Hero plus one open stretch of sky. */
export const APPROACH_SCROLL = 2.2;

/** Where the aircraft starts, the height it passes at and how far away it is when the slow part begins. */
const START_RANGE = 2400;
const RANGE_OFFSET = 120;
const SLOW_RANGE = 170;
const END_RANGE = -60;
const PASS_HEIGHT = 58;
const START_HEIGHT = 330;

/**
 * The approach is an exponential zoom (every scroll step magnifies by the same factor), handing over
 * to a decelerating glide so the aircraft lingers while it is big and overhead. The hand-over point is
 * solved so that both pieces have the same speed there and the motion has no kink.
 */
const SLOW_U = (() => {
  const zoom = Math.log((START_RANGE + RANGE_OFFSET) / (SLOW_RANGE + RANGE_OFFSET));
  const drop = SLOW_RANGE - END_RANGE;
  let low = 0.3;
  let high = 0.85;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    const fast = (zoom / mid) * (SLOW_RANGE + RANGE_OFFSET);
    const slow = (2 * drop) / (1 - mid);
    if (fast > slow) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
})();

/** Quadratic fog density shared by the WebGL scene and the SVG fallback: about a third of the aircraft's contrast is lost to haze at the start. */
export const FOG_DENSITY = 0.00022;

/** Forward distance of the aircraft from the viewer in metres; negative once it is behind. */
export function rangeAt(u: number): number {
  const x = clamp01(u);
  if (x <= SLOW_U) {
    const zoom = Math.log((START_RANGE + RANGE_OFFSET) / (SLOW_RANGE + RANGE_OFFSET));
    return (START_RANGE + RANGE_OFFSET) * Math.exp((-zoom * x) / SLOW_U) - RANGE_OFFSET;
  }
  const t = x - SLOW_U;
  const total = 1 - SLOW_U;
  const speed = (2 * (SLOW_RANGE - END_RANGE)) / total;
  return SLOW_RANGE - speed * t + (speed / (2 * total)) * t * t;
}

export interface AircraftPose {
  position: Vec3;
  /** Rotation about the vertical axis that turns the model's +x nose onto the heading. */
  yaw: number;
  /** Nose up is positive. */
  pitch: number;
  /** Right wing down is positive, in the aircraft's own frame. */
  roll: number;
  /** Distance to the viewer in metres. */
  distance: number;
}

function positionAtRange(range: number): Vec3 {
  // Descends from cruise to a low pass, then pulls up hard; the pull is what carries it off the top of the page
  const descend = smoothstep((START_RANGE - range) / (START_RANGE - 40));
  const pull = smoothstep((60 - range) / 260);
  const x = lerp(285, 6, (START_RANGE - range) / START_RANGE) - 44 * pull;
  const y = lerp(START_HEIGHT, PASS_HEIGHT, descend) + 190 * pull * pull;
  return [x, y, -range];
}

export function approachAt(u: number): AircraftPose {
  const range = rangeAt(u);
  const position = positionAtRange(range);
  // The heading is the path's own tangent, so the aircraft never slides sideways along its route
  const ahead = positionAtRange(range - 1);
  const tx = ahead[0] - position[0];
  const ty = ahead[1] - position[1];
  const tz = ahead[2] - position[2];
  const horizontal = Math.hypot(tx, tz);
  const pitch = Math.atan2(ty, horizontal);
  const yaw = Math.atan2(-tz, tx);
  // A little bank into the turn, so the climb-out does not look glued to rails
  const roll =
    0.09 * smoothstep((140 - range) / 200) * Math.sin(smoothstep((90 - range) / 160) * Math.PI);
  return {
    position,
    yaw,
    pitch,
    roll,
    distance: Math.hypot(position[0], position[1], position[2]),
  };
}

/** Wide enough in portrait that the wings still fit, never narrower than a 34 degree lens. */
export function fovFor(aspect: number): number {
  const base = 34 * RAD;
  const needed = 2 * Math.atan(Math.tan(20 * RAD) / Math.max(0.3, aspect));
  return Math.max(base, Math.min(needed, 78 * RAD));
}

export interface CameraPose {
  yaw: number;
  pitch: number;
  fovY: number;
}

const BASE_PITCH = 4.5 * RAD;
const MIN_PITCH = 1.5 * RAD;
const MAX_PITCH = 74 * RAD;

/**
 * The viewer's head follows the aircraft: it starts in the upper right of the sky, drifts to the
 * middle as it grows, and once the aircraft passes overhead the head stops and lets it leave the top.
 */
export function cameraAt(u: number, aspect: number): CameraPose {
  const fovY = fovFor(aspect);
  const tanY = Math.tan(fovY / 2);
  const tanX = tanY * aspect;
  const { position } = approachAt(u);
  // Signed range: once the aircraft is behind the viewer the elevation passes 90 degrees and the clamp below takes over
  const range = -position[2];
  const elevation = Math.atan2(position[1], range);
  const azimuth = Math.atan2(position[0], Math.max(range, 30));

  const settle = smoothstep(u / 0.72);
  const portrait = aspect < 0.9;
  const targetX = lerp(portrait ? 0.1 : 0.34, 0, settle);
  const targetY = lerp(portrait ? 0.46 : 0.4, 0.02, settle);

  const followedPitch = elevation - Math.atan(targetY * tanY);
  const followedYaw = Math.atan(targetX * tanX) - azimuth;

  const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, followedPitch));
  const release = smoothstep((u - 0.86) / 0.14);
  return {
    yaw: lerp(followedYaw, 0, release),
    pitch: lerp(pitch, BASE_PITCH, release),
    fovY,
  };
}

export interface Projected {
  /** Normalised device coordinates: -1 to 1, y up. */
  x: number;
  y: number;
  /** Distance in front of the viewer along the view axis; negative means behind. */
  depth: number;
}

export function project(point: Vec3, camera: CameraPose, aspect: number): Projected {
  // Undo the camera rotation (yaw, then pitch): the inverse is pitch back first, then yaw back
  const cy = Math.cos(-camera.yaw);
  const sy = Math.sin(-camera.yaw);
  const x1 = point[0] * cy + point[2] * sy;
  const z1 = -point[0] * sy + point[2] * cy;
  const cp = Math.cos(-camera.pitch);
  const sp = Math.sin(-camera.pitch);
  const y2 = point[1] * cp - z1 * sp;
  const z2 = point[1] * sp + z1 * cp;
  const depth = -z2;
  const tanY = Math.tan(camera.fovY / 2);
  return {
    x: x1 / (Math.max(1e-6, depth) * tanY * aspect),
    y: y2 / (Math.max(1e-6, depth) * tanY),
    depth,
  };
}

/** Where the horizon sits on screen, as a fraction of the viewport height from the top. */
export function horizonFraction(camera: CameraPose): number {
  return 0.5 + 0.5 * (Math.tan(camera.pitch) / Math.tan(camera.fovY / 2));
}

/** How far the approach has got for a given scroll, 0 at the top of the page and 1 when it is over. */
export function approachProgress(scrollY: number, viewportH: number): number {
  return clamp01(scrollY / (viewportH * APPROACH_SCROLL));
}

/** True while any part of the aircraft can still be on screen. */
export function aircraftVisible(u: number): boolean {
  return u < 0.965;
}
