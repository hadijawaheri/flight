import { describe, expect, it } from "vitest";

import {
  aircraftVisible,
  approachAt,
  approachProgress,
  cameraAt,
  fovFor,
  horizonFraction,
  project,
  rangeAt,
} from "./approach-model";

const SPAN = 35.8;
const steps = Array.from({ length: 101 }, (_, i) => i / 100);

/** How wide the aircraft looks, in degrees, at progress u. */
const apparentSpan = (u: number): number =>
  (2 * Math.atan(SPAN / 2 / approachAt(u).distance) * 180) / Math.PI;

describe("approach path", () => {
  it("starts as a speck far away and ends behind the viewer", () => {
    expect(rangeAt(0)).toBeCloseTo(2400, 0);
    expect(rangeAt(1)).toBeLessThan(0);
    expect(apparentSpan(0)).toBeLessThan(1.2);
    expect(apparentSpan(0)).toBeGreaterThan(0.4);
  });

  it("only ever gets closer until it has passed, and never jumps", () => {
    let previous = rangeAt(0);
    for (const u of steps.slice(1)) {
      const range = rangeAt(u);
      expect(range).toBeLessThanOrEqual(previous + 1e-9);
      // The biggest step is the fast zoom just before the hand-over; no step may be a leap
      expect(previous - range).toBeLessThan(150);
      previous = range;
    }
  });

  it("zooms by a steady factor while it is far away", () => {
    const first = apparentSpan(0.1) / apparentSpan(0);
    const second = apparentSpan(0.2) / apparentSpan(0.1);
    expect(second).toBeGreaterThan(first * 0.9);
    expect(second).toBeLessThan(first * 1.1);
  });

  it("passes low overhead and looks big when it does", () => {
    const closest = Math.min(...steps.map((u) => approachAt(u).distance));
    expect(closest).toBeGreaterThan(40);
    expect(closest).toBeLessThan(90);
    expect(Math.max(...steps.map(apparentSpan))).toBeGreaterThan(24);
  });

  it("flies at the viewer, nose first, and climbs once it has passed", () => {
    const start = approachAt(0);
    expect(Math.sin(start.yaw)).toBeLessThan(-0.95);
    const late = approachAt(0.85);
    expect(late.pitch).toBeGreaterThan(0.3);
    expect(late.position[1]).toBeGreaterThan(approachAt(0.7).position[1]);
  });

  it("is gone by the end of the approach", () => {
    expect(aircraftVisible(0)).toBe(true);
    expect(aircraftVisible(1)).toBe(false);
  });
});

describe("camera", () => {
  it("holds the aircraft in the upper right of the sky at first, then drifts it to the middle", () => {
    for (const aspect of [16 / 9, 0.5]) {
      const camera = cameraAt(0, aspect);
      const first = project(approachAt(0).position, camera, aspect);
      // A narrow screen has a wide lens and the horizon cannot rise above the middle, so it sits a little lower
      expect(first.y).toBeGreaterThan(aspect > 1 ? 0.2 : 0.1);
      if (aspect > 1) expect(first.x).toBeGreaterThan(0.2);
      const mid = cameraAt(0.6, aspect);
      const middle = project(approachAt(0.6).position, mid, aspect);
      expect(Math.abs(middle.x)).toBeLessThan(0.15);
      expect(Math.abs(middle.y)).toBeLessThan(0.15);
    }
  });

  it("keeps the whole aircraft on screen until it climbs away, on wide and narrow screens", () => {
    for (const aspect of [16 / 9, 0.5]) {
      for (const u of steps.filter((value) => value <= 0.7)) {
        const where = project(approachAt(u).position, cameraAt(u, aspect), aspect);
        expect(Math.abs(where.x)).toBeLessThan(1.05);
        expect(Math.abs(where.y)).toBeLessThan(1.05);
        expect(where.depth).toBeGreaterThan(0);
      }
    }
  });

  it("lets the aircraft leave through the top of the screen", () => {
    const aspect = 16 / 9;
    const exits = steps
      .filter((u) => u > 0.7 && u < 0.95)
      .map((u) => project(approachAt(u).position, cameraAt(u, aspect), aspect));
    expect(Math.max(...exits.map((p) => p.y))).toBeGreaterThan(1.1);
  });

  it("tilts back to look up as the aircraft passes, and levels out again afterwards", () => {
    expect(horizonFraction(cameraAt(0, 16 / 9))).toBeGreaterThan(0.5);
    expect(horizonFraction(cameraAt(0, 16 / 9))).toBeLessThan(0.75);
    expect(horizonFraction(cameraAt(0.78, 16 / 9))).toBeGreaterThan(1);
    expect(horizonFraction(cameraAt(1, 16 / 9))).toBeLessThan(0.7);
  });

  it("widens the lens on narrow screens so the wings still fit", () => {
    expect(fovFor(16 / 9)).toBeCloseTo((34 * Math.PI) / 180, 5);
    expect(fovFor(0.5)).toBeGreaterThan(fovFor(16 / 9));
  });

  it("maps scroll to progress and clamps it", () => {
    expect(approachProgress(-50, 800)).toBe(0);
    expect(approachProgress(100000, 800)).toBe(1);
    expect(approachProgress(800 * 1.1, 800)).toBeCloseTo(0.5, 5);
  });
});
