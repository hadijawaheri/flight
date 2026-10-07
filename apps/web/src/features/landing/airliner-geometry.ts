/**
 * Procedural geometry for a narrow-body twin-jet (A320 class, 37.6 m long, 35.8 m span), in metres.
 * Nose to +x, up +y, starboard +z. Pure data with no three.js, so it can be unit-tested and the
 * renderer only has to wrap it in buffers. Every surface is lofted from real planform numbers
 * (sweep, taper, dihedral, washout, aerofoil thickness) instead of stacked primitives.
 */

export type V3 = readonly [number, number, number];

export interface MeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

export type PartName =
  "fuselage" | "glass" | "wing" | "tail" | "fin" | "nacelle" | "lip" | "duct" | "fan" | "nozzle";

export interface Part {
  name: PartName;
  mesh: MeshData;
}

export type LightKind = "red" | "green" | "white" | "strobe" | "landing" | "beacon";

export interface LightSpot {
  kind: LightKind;
  position: V3;
}

export interface AirlinerGeometry {
  parts: Part[];
  lights: LightSpot[];
}

export const LENGTH = 37.6;
export const SPAN = 35.8;
export const NOSE_X = 18.8;
export const TAIL_X = -18.8;

const RADIUS = 2.07;
const NOSE_LEN = 5.0;
const TAIL_LEN = 10.8;
const TAIL_START = TAIL_X + TAIL_LEN;
const NOSE_START = NOSE_X - NOSE_LEN;

const at = (list: readonly number[], index: number): number => list[index] ?? 0;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

function emptyMesh(): MeshData {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: V3): V3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** Smooth vertex normals from face normals; duplicated seam columns are welded so lighting is seamless. */
function computeNormals(mesh: MeshData, rows: number, cols: number, wrap: boolean): void {
  const count = mesh.positions.length / 3;
  const acc = new Float64Array(count * 3);
  const p = (i: number): V3 => [
    at(mesh.positions, i * 3),
    at(mesh.positions, i * 3 + 1),
    at(mesh.positions, i * 3 + 2),
  ];
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = at(mesh.indices, t);
    const b = at(mesh.indices, t + 1);
    const c = at(mesh.indices, t + 2);
    const n = cross(sub(p(b), p(a)), sub(p(c), p(a)));
    for (const index of [a, b, c]) {
      acc[index * 3] = (acc[index * 3] ?? 0) + n[0];
      acc[index * 3 + 1] = (acc[index * 3 + 1] ?? 0) + n[1];
      acc[index * 3 + 2] = (acc[index * 3 + 2] ?? 0) + n[2];
    }
  }
  if (wrap) {
    for (let i = 0; i < rows; i += 1) {
      const first = i * cols;
      const last = i * cols + cols - 1;
      for (let k = 0; k < 3; k += 1) {
        const sum = (acc[first * 3 + k] ?? 0) + (acc[last * 3 + k] ?? 0);
        acc[first * 3 + k] = sum;
        acc[last * 3 + k] = sum;
      }
    }
  }
  mesh.normals = new Array<number>(count * 3).fill(0);
  for (let i = 0; i < count; i += 1) {
    const n = normalize([acc[i * 3] ?? 0, acc[i * 3 + 1] ?? 0, acc[i * 3 + 2] ?? 1]);
    mesh.normals[i * 3] = n[0];
    mesh.normals[i * 3 + 1] = n[1];
    mesh.normals[i * 3 + 2] = n[2];
  }
}

interface GridOptions {
  rows: number;
  cols: number;
  point: (row: number, col: number) => V3;
  uv: (row: number, col: number) => readonly [number, number];
  /** Last column repeats the first, so the grid closes into a tube. */
  wrap: boolean;
  /** Which way is "outside"; triangles are flipped when they face the other way. */
  center: (p: V3) => V3;
}

function buildGrid(options: GridOptions): MeshData {
  const { rows, cols, point, uv, wrap, center } = options;
  const mesh = emptyMesh();
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const p = point(i, j);
      const t = uv(i, j);
      mesh.positions.push(p[0], p[1], p[2]);
      mesh.uvs.push(t[0], t[1]);
    }
  }
  for (let i = 0; i < rows - 1; i += 1) {
    for (let j = 0; j < cols - 1; j += 1) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + j + 1;
      const d = i * cols + j + 1;
      mesh.indices.push(a, b, c, a, c, d);
    }
  }
  // Decide the winding from geometry rather than from hand-checked index order
  let score = 0;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ia = at(mesh.indices, t);
    const ib = at(mesh.indices, t + 1);
    const ic = at(mesh.indices, t + 2);
    const pa: V3 = [
      at(mesh.positions, ia * 3),
      at(mesh.positions, ia * 3 + 1),
      at(mesh.positions, ia * 3 + 2),
    ];
    const pb: V3 = [
      at(mesh.positions, ib * 3),
      at(mesh.positions, ib * 3 + 1),
      at(mesh.positions, ib * 3 + 2),
    ];
    const pc: V3 = [
      at(mesh.positions, ic * 3),
      at(mesh.positions, ic * 3 + 1),
      at(mesh.positions, ic * 3 + 2),
    ];
    const n = cross(sub(pb, pa), sub(pc, pa));
    const mid: V3 = [
      (pa[0] + pb[0] + pc[0]) / 3,
      (pa[1] + pb[1] + pc[1]) / 3,
      (pa[2] + pb[2] + pc[2]) / 3,
    ];
    const out = sub(mid, center(mid));
    score += n[0] * out[0] + n[1] * out[1] + n[2] * out[2];
  }
  if (score < 0) {
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const b = at(mesh.indices, t + 1);
      mesh.indices[t + 1] = at(mesh.indices, t + 2);
      mesh.indices[t + 2] = b;
    }
  }
  computeNormals(mesh, rows, cols, wrap);
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// Fuselage

/** Surface radius scale along the body: an elliptical radome, a long cylinder, a tapering tail cone. */
function bodyScale(x: number): number {
  if (x > NOSE_START) {
    const u = clamp01((x - NOSE_START) / NOSE_LEN);
    return Math.pow(Math.max(0, 1 - Math.pow(u, 2.15)), 0.5);
  }
  if (x < TAIL_START) {
    const s = clamp01((TAIL_START - x) / TAIL_LEN);
    return 1 - 0.83 * Math.pow(s, 1.55);
  }
  return 1;
}

/** The centre line droops at the nose and sweeps up through the tail cone. */
function bodyCentre(x: number): number {
  if (x > NOSE_START) return -0.32 * Math.pow(clamp01((x - NOSE_START) / NOSE_LEN), 2.2);
  if (x < TAIL_START) return 1.45 * Math.pow(clamp01((TAIL_START - x) / TAIL_LEN), 1.8);
  return 0;
}

/**
 * A point on the fuselage skin. phi runs from the crown (0) round the starboard side (PI/2)
 * to the keel (PI) and back up the port side; a super-ellipse gives the slightly flattened section.
 */
export function fuselagePoint(x: number, phi: number, inset = 0): V3 {
  const r = Math.max(0.0005, RADIUS * bodyScale(x) - inset);
  const n = 2.35;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const y = r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const z = r * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  // Belly fairing under the wing root
  const fairing = c < 0 ? 0.34 * Math.exp(-Math.pow((x - 1.5) / 5.6, 4)) * c * c : 0;
  return [x, bodyCentre(x) + (c < 0 ? y * 0.985 : y) - fairing, z];
}

function stationXs(): number[] {
  const xs: number[] = [];
  // Dense at the nose and tail where curvature is high
  for (let i = 0; i <= 44; i += 1) xs.push(NOSE_X - NOSE_LEN * (1 - Math.pow(1 - i / 44, 1.8)));
  for (let i = 1; i <= 56; i += 1) xs.push(NOSE_START - ((NOSE_START - TAIL_START) * i) / 56);
  for (let i = 1; i <= 52; i += 1) xs.push(TAIL_START - TAIL_LEN * Math.pow(i / 52, 0.85));
  return xs;
}

function buildFuselage(): MeshData {
  const xs = stationXs();
  const cols = 121;
  const mesh = buildGrid({
    rows: xs.length,
    cols,
    wrap: true,
    point: (i, j) => fuselagePoint(at(xs, i), (j / (cols - 1)) * Math.PI * 2),
    uv: (i, j) => [(NOSE_X - at(xs, i)) / LENGTH, j / (cols - 1)],
    center: (p) => [p[0], bodyCentre(p[0]), 0],
  });
  // Close the blunt tail
  const last = xs.length - 1;
  const capIndex = mesh.positions.length / 3;
  const c = fuselagePoint(at(xs, last), 0);
  mesh.positions.push(at(xs, last), bodyCentre(at(xs, last)), 0);
  mesh.uvs.push(1, 0.5);
  void c;
  for (let j = 0; j < cols - 1; j += 1) {
    const a = last * cols + j;
    const b = last * cols + j + 1;
    mesh.indices.push(a, capIndex, b);
  }
  computeNormals(mesh, xs.length, cols, true);
  return mesh;
}

/** A small patch lying on the fuselage skin: windscreen panes, cabin windows, doors. */
function skinPatch(
  x0: number,
  x1: number,
  phi0: number,
  phi1: number,
  cols: number,
  rows: number,
): MeshData {
  const mesh = buildGrid({
    rows: rows + 1,
    cols: cols + 1,
    wrap: false,
    point: (i, j) => {
      const x = mix(x0, x1, i / rows);
      const phi = mix(phi0, phi1, j / cols);
      // Lift the patch 1.5 cm off the skin so it never z-fights the paint
      const p = fuselagePoint(x, phi);
      const q = fuselagePoint(x, phi, -0.015);
      return [mix(p[0], q[0], 1), q[1], q[2]];
    },
    uv: (i, j) => [i / rows, j / cols],
    center: (p) => [p[0], bodyCentre(p[0]), 0],
  });
  return mesh;
}

function mergeMeshes(meshes: readonly MeshData[]): MeshData {
  const out = emptyMesh();
  for (const mesh of meshes) {
    const offset = out.positions.length / 3;
    out.positions.push(...mesh.positions);
    out.normals.push(...mesh.normals);
    out.uvs.push(...mesh.uvs);
    for (const index of mesh.indices) out.indices.push(index + offset);
  }
  return out;
}

function buildGlass(): MeshData {
  const patches: MeshData[] = [];
  const deg = Math.PI / 180;
  // Windscreen: two panes with a centre post, then a side window on each side
  for (const side of [1, -1]) {
    const a = side * 4 * deg;
    patches.push(skinPatch(16.55, 15.35, a, side * 50 * deg, 8, 6));
    patches.push(skinPatch(15.55, 14.75, side * 56 * deg, side * 74 * deg, 4, 4));
  }
  // Cabin windows, one row each side, a little above the equator
  for (const side of [1, -1]) {
    for (let x = 12.9; x > -12.4; x -= 0.508) {
      patches.push(skinPatch(x + 0.1, x - 0.1, side * 80.5 * deg, side * 85.2 * deg, 2, 2));
    }
  }
  return mergeMeshes(patches);
}

// ---------------------------------------------------------------------------------------------
// Lifting surfaces

interface Section {
  /** Leading-edge position. */
  origin: V3;
  chord: number;
  /** Thickness to chord ratio. */
  thickness: number;
  camber: number;
  /** Nose-up rotation about the quarter chord, radians. */
  twist: number;
}

function airfoilY(xc: number, thickness: number, camber: number): [number, number] {
  const yt =
    5 *
    thickness *
    (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1015 * xc ** 4);
  const yc = 4 * camber * xc * (1 - xc);
  return [yc + yt, yc - yt];
}

const AIRFOIL_STEPS = 22;

/**
 * Rings of aerofoil points per section: trailing edge, lower surface, leading edge, upper
 * surface, trailing edge. roll rotates the aerofoil's thickness direction about the chord
 * (0 for a wing, PI/2 for a fin).
 */
function sectionRing(section: Section, roll: number): V3[] {
  const ring: V3[] = [];
  const pivotX = section.origin[0] - 0.25 * section.chord;
  const lower: V3[] = [];
  const upper: V3[] = [];
  for (let k = 0; k <= AIRFOIL_STEPS; k += 1) {
    const xc = (1 - Math.cos((Math.PI * k) / AIRFOIL_STEPS)) / 2;
    const [yu, yl] = airfoilY(xc, section.thickness, section.camber);
    for (const [y, list] of [
      [yl, lower],
      [yu, upper],
    ] as const) {
      const local: V3 = [section.origin[0] - xc * section.chord, y * section.chord, 0];
      // Twist about the quarter-chord pivot in the chord plane
      const dx = local[0] - pivotX;
      const dy = local[1];
      const cos = Math.cos(-section.twist);
      const sin = Math.sin(-section.twist);
      const tx = pivotX + dx * cos - dy * sin;
      const ty = dx * sin + dy * cos;
      // Roll the thickness direction (y) toward z
      const ry = ty * Math.cos(roll);
      const rz = ty * Math.sin(roll);
      list.push([tx, section.origin[1] + ry, section.origin[2] + rz]);
    }
  }
  for (let k = AIRFOIL_STEPS; k >= 0; k -= 1) ring.push(at3(lower, k));
  for (let k = 1; k <= AIRFOIL_STEPS; k += 1) ring.push(at3(upper, k));
  return ring;
}

function at3(list: readonly V3[], index: number): V3 {
  return list[index] ?? [0, 0, 0];
}

function centroid(ring: readonly V3[]): V3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
    z += p[2];
  }
  return [x / ring.length, y / ring.length, z / ring.length];
}

/** A closed, rounded-tip loft through the sections. */
function loftSections(sections: readonly Section[], roll: number): MeshData {
  const rings = sections.map((section) => sectionRing(section, roll));
  const last = at3(rings.flat(), 0);
  void last;
  const tipRing = rings[rings.length - 1] ?? [];
  const prevRing = rings[rings.length - 2] ?? tipRing;
  const tipCentre = centroid(tipRing);
  const direction = normalize(sub(tipCentre, centroid(prevRing)));
  // Two extra rows round the tip off to a point
  const rounded = (scale: number, push: number): V3[] =>
    tipRing.map((p) => [
      mix(tipCentre[0], p[0], scale) + direction[0] * push,
      mix(tipCentre[1], p[1], scale) + direction[1] * push,
      mix(tipCentre[2], p[2], scale) + direction[2] * push,
    ]);
  const all = [...rings, rounded(0.6, 0.02), rounded(0.0, 0.05)];
  const cols = tipRing.length;
  const centres = all.map(centroid);
  return buildGrid({
    rows: all.length,
    cols,
    wrap: true,
    point: (i, j) => at3(all[i] ?? [], j),
    uv: (i, j) => [j / (cols - 1), i / (all.length - 1)],
    center: (p) => {
      // Nearest section centre along the span axis
      let best = at3(centres, 0);
      let bestDistance = Infinity;
      for (const c of centres) {
        const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = c;
        }
      }
      return best;
    },
  });
}

interface WingStation {
  z: number;
  chord: number;
}

function wingSections(side: 1 | -1): Section[] {
  const stations: WingStation[] = [
    { z: 1.2, chord: 7.5 },
    { z: 2.4, chord: 7.1 },
    { z: 5.8, chord: 5.9 },
    { z: 9.5, chord: 4.2 },
    { z: 13.8, chord: 2.75 },
    { z: 17.5, chord: 1.65 },
  ];
  return stations.map((station) => {
    const t = (station.z - 1.2) / 16.3;
    return {
      origin: [
        4.3 - (station.z - 1.2) * 0.515,
        -1.15 + (station.z - 1.2) * 0.091,
        side * station.z,
      ],
      chord: station.chord,
      thickness: mix(0.155, 0.105, t),
      camber: mix(0.024, 0.016, t),
      twist: -0.07 * t,
    };
  });
}

function sharkletSections(side: 1 | -1): Section[] {
  const height = [0, 0.7, 1.5, 2.3];
  return height.map((h, i) => ({
    origin: [-4.45 - h * 0.78, -1.15 + 16.3 * 0.091 + h, side * (17.5 + h * 0.07)],
    chord: mix(1.65, 0.75, i / 3),
    thickness: 0.09,
    camber: 0,
    twist: 0,
  }));
}

function tailPlaneSections(side: 1 | -1): Section[] {
  const zs = [0.6, 2.3, 4.2, 6.1];
  return zs.map((z, i) => ({
    origin: [-12.7 - (z - 0.6) * 0.56, 0.95 + (z - 0.6) * 0.09, side * z],
    chord: mix(4.0, 1.5, i / 3),
    thickness: 0.1,
    camber: 0,
    twist: 0,
  }));
}

function finSections(): Section[] {
  const ys = [1.2, 3.6, 6.4, 9.2, 11.7];
  return ys.map((y, i) => ({
    origin: [-8.0 - (y - 1.2) * 0.62, y, 0],
    chord: mix(8.0, 2.7, i / 4),
    thickness: 0.105,
    camber: 0,
    twist: 0,
  }));
}

// ---------------------------------------------------------------------------------------------
// Engines

const NACELLE_Z = 5.75;
const NACELLE_Y = -2.08;
const NACELLE_LIP_X = 4.7;
const NACELLE_LEN = 4.5;

function nacelleRadius(u: number): number {
  // u 0 at the lip, 1 at the exhaust: a rounded lip, full diameter just behind it, then the cowl tapers
  const lip = 1.0 + 0.12 * Math.sin(clamp01(u / 0.12) * Math.PI * 0.5);
  const body = mix(1.12, 0.84, smooth((u - 0.45) / 0.55));
  return u < 0.12 ? lip : mix(lip, body, smooth((u - 0.12) / 0.2));
}

function ringPoint(x: number, r: number, angle: number, side: 1 | -1): V3 {
  return [x, NACELLE_Y + r * Math.cos(angle), side * NACELLE_Z + r * Math.sin(angle)];
}

function buildNacelle(side: 1 | -1): {
  cowl: MeshData;
  lip: MeshData;
  duct: MeshData;
  fan: MeshData;
  nozzle: MeshData;
} {
  const rows = 40;
  const cols = 65;
  const centre = (p: V3): V3 => [p[0], NACELLE_Y, side * NACELLE_Z];
  const cowl = buildGrid({
    rows,
    cols,
    wrap: true,
    point: (i, j) => {
      const u = 0.1 + 0.9 * (i / (rows - 1));
      return ringPoint(
        NACELLE_LIP_X - NACELLE_LEN * u,
        nacelleRadius(u),
        (j / (cols - 1)) * Math.PI * 2,
        side,
      );
    },
    uv: (i, j) => [i / (rows - 1), j / (cols - 1)],
    center: centre,
  });

  // Polished intake lip: a thin ring around the mouth
  const lip = buildGrid({
    rows: 10,
    cols,
    wrap: true,
    point: (i, j) => {
      const a = (i / 9) * Math.PI;
      const r =
        1.0 +
        0.12 * Math.sin(Math.min(1, (a / Math.PI) * 4) * Math.PI * 0.5) -
        0.07 * (1 - Math.cos(a)) * 0.5;
      return ringPoint(
        NACELLE_LIP_X - 0.11 * Math.sin(a) + 0.02 - 0.05 * i * 0.1,
        mix(0.9, r, Math.sin(a * 0.5)),
        (j / (cols - 1)) * Math.PI * 2,
        side,
      );
    },
    uv: (i, j) => [i / 9, j / (cols - 1)],
    center: centre,
  });

  // Dark inner duct running back to the fan face
  const duct = buildGrid({
    rows: 12,
    cols,
    wrap: true,
    point: (i, j) =>
      ringPoint(
        NACELLE_LIP_X - 0.05 - (i / 11) * 0.95,
        mix(0.9, 0.84, i / 11),
        (j / (cols - 1)) * Math.PI * 2,
        side,
      ),
    uv: (i, j) => [i / 11, j / (cols - 1)],
    center: (p) => [p[0], NACELLE_Y, side * NACELLE_Z],
  });

  // Fan face: rings from hub to blade tips, spinner cone in the middle
  const fanX = NACELLE_LIP_X - 1.05;
  const fan = buildGrid({
    rows: 14,
    cols,
    wrap: true,
    point: (i, j) => {
      const t = i / 13;
      const r = t === 0 ? 0 : mix(0.2, 0.84, t);
      const spinner = t < 0.25 ? 0.55 * (1 - t / 0.25) : 0;
      return ringPoint(fanX + spinner * 0.9, r, (j / (cols - 1)) * Math.PI * 2, side);
    },
    uv: (i, j) => [i / 13, j / (cols - 1)],
    center: (p) => [p[0] - 1, NACELLE_Y, side * NACELLE_Z],
  });

  // Exhaust: bypass nozzle ring and the core plug
  const nozzle = buildGrid({
    rows: 16,
    cols,
    wrap: true,
    point: (i, j) => {
      const t = i / 15;
      const x = NACELLE_LIP_X - NACELLE_LEN + 0.1 - t * 1.25;
      const r = t < 0.15 ? 0.84 - t * 0.3 : mix(0.55, 0.06, Math.pow((t - 0.15) / 0.85, 1.4));
      return ringPoint(x, r, (j / (cols - 1)) * Math.PI * 2, side);
    },
    uv: (i, j) => [i / 15, j / (cols - 1)],
    center: (p) => [p[0] + 0.3, NACELLE_Y, side * NACELLE_Z],
  });

  return { cowl, lip, duct, fan, nozzle };
}

function pylonSections(side: 1 | -1): Section[] {
  const ys = [-0.62, -1.15, -1.7];
  return ys.map((y, i) => ({
    origin: [3.1 - i * 0.6, y, side * NACELLE_Z],
    chord: 5.2 - i * 0.7,
    thickness: 0.07,
    camber: 0,
    twist: 0,
  }));
}

// ---------------------------------------------------------------------------------------------

export function buildAirlinerGeometry(): AirlinerGeometry {
  const parts: Part[] = [];
  parts.push({ name: "fuselage", mesh: buildFuselage() });
  parts.push({ name: "glass", mesh: buildGlass() });

  const wings: MeshData[] = [];
  const tails: MeshData[] = [];
  const nacelles: MeshData[] = [];
  const lips: MeshData[] = [];
  const ducts: MeshData[] = [];
  const fans: MeshData[] = [];
  const nozzles: MeshData[] = [];
  for (const side of [1, -1] as const) {
    wings.push(loftSections(wingSections(side), 0));
    wings.push(loftSections(sharkletSections(side), Math.PI / 2));
    tails.push(loftSections(tailPlaneSections(side), 0));
    wings.push(loftSections(pylonSections(side), Math.PI / 2));
    const n = buildNacelle(side);
    nacelles.push(n.cowl);
    lips.push(n.lip);
    ducts.push(n.duct);
    fans.push(n.fan);
    nozzles.push(n.nozzle);
  }
  parts.push({ name: "wing", mesh: mergeMeshes(wings) });
  parts.push({ name: "tail", mesh: mergeMeshes(tails) });
  parts.push({ name: "fin", mesh: loftSections(finSections(), Math.PI / 2) });
  parts.push({ name: "nacelle", mesh: mergeMeshes(nacelles) });
  parts.push({ name: "lip", mesh: mergeMeshes(lips) });
  parts.push({ name: "duct", mesh: mergeMeshes(ducts) });
  parts.push({ name: "fan", mesh: mergeMeshes(fans) });
  parts.push({ name: "nozzle", mesh: mergeMeshes(nozzles) });

  const lights: LightSpot[] = [
    { kind: "green", position: [-5.0, 2.0, 17.9] },
    { kind: "red", position: [-5.0, 2.0, -17.9] },
    { kind: "strobe", position: [-5.2, 1.95, 17.95] },
    { kind: "strobe", position: [-5.2, 1.95, -17.95] },
    { kind: "white", position: [-18.3, 2.55, 0] },
    { kind: "strobe", position: [-18.2, 2.5, 0] },
    { kind: "landing", position: [3.6, -1.1, 3.4] },
    { kind: "landing", position: [3.6, -1.1, -3.4] },
    { kind: "landing", position: [14.3, -1.55, 0] },
    { kind: "beacon", position: [2.0, 2.15, 0] },
  ];

  return { parts, lights };
}

// ---------------------------------------------------------------------------------------------
// Outline numbers for the flat SVG stand-ins, taken from the same planform as the 3D model

export interface PlanStation {
  /** Distance from the centre line. */
  z: number;
  /** Leading and trailing edge positions along the body (nose is +x). */
  lead: number;
  trail: number;
}

export function wingPlan(): readonly PlanStation[] {
  return wingSections(1).map((s) => ({
    z: s.origin[2],
    lead: s.origin[0],
    trail: s.origin[0] - s.chord,
  }));
}

export function tailPlan(): readonly PlanStation[] {
  return tailPlaneSections(1).map((s) => ({
    z: s.origin[2],
    lead: s.origin[0],
    trail: s.origin[0] - s.chord,
  }));
}

export const ENGINE_PLAN = {
  z: NACELLE_Z,
  y: NACELLE_Y,
  front: NACELLE_LIP_X,
  back: NACELLE_LIP_X - NACELLE_LEN,
  radius: 1.12,
} as const;

/** Half-width of the body seen from above or below, at x. */
export function bodyHalfWidth(x: number): number {
  return RADIUS * bodyScale(x);
}
