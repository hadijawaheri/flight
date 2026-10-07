import { describe, expect, it } from "vitest";

import {
  buildClouds,
  buildStars,
  cloudTintAt,
  hourFromSpacers,
  nightFactor,
  skyAt,
  skyColorAt,
  srgbToLinear,
  sunDirAt,
  sunGlowAt,
  sunLightAt,
} from "./journey-model";

const brightness = (color: readonly [number, number, number]): number =>
  color[0] + color[1] + color[2];

describe("hourFromSpacers", () => {
  it("is morning before any spacer and night after all three", () => {
    expect(hourFromSpacers([0, 0, 0])).toBe(0);
    expect(hourFromSpacers([1, 1, 1])).toBe(3);
  });

  it("only advances one spacer at a time", () => {
    expect(hourFromSpacers([1, 0.5, 0])).toBeCloseTo(1.5, 5);
  });
});

describe("sky", () => {
  it("is lighter at noon than at night, in both themes", () => {
    for (const dark of [false, true]) {
      expect(brightness(skyAt(1, dark).zenith)).toBeGreaterThan(brightness(skyAt(3, dark).zenith));
    }
  });

  it("clamps hours outside the day", () => {
    expect(skyAt(-2, false)).toEqual(skyAt(0, false));
    expect(skyAt(9, false)).toEqual(skyAt(3, false));
  });

  it("is paler towards the horizon and deepest straight up", () => {
    const sky = skyAt(1, false);
    const low = skyColorAt(sky, 0.02);
    const high = skyColorAt(sky, 0.9);
    const zenith = skyColorAt(sky, Math.PI / 2);
    expect(brightness(low)).toBeGreaterThan(brightness(high));
    expect(zenith[2]).toBeCloseTo(sky.zenith[2], 0);
  });

  it("fades to haze below the horizon", () => {
    const sky = skyAt(1, false);
    expect(skyColorAt(sky, -0.6)[0]).toBeCloseTo(sky.haze[0], 0);
  });

  it("night is complete only after the last spacer", () => {
    expect(nightFactor(1)).toBe(0);
    expect(nightFactor(3)).toBe(1);
  });

  it("tints clouds amber at dusk and dark at night", () => {
    expect(cloudTintAt(2)[2]).toBeLessThan(cloudTintAt(2)[0]);
    expect(brightness(cloudTintAt(3))).toBeLessThan(brightness(cloudTintAt(1)) / 2);
  });

  it("converts sRGB to linear light", () => {
    expect(srgbToLinear([255, 255, 255])).toEqual([1, 1, 1]);
    expect(srgbToLinear([0, 0, 0])).toEqual([0, 0, 0]);
    expect(srgbToLinear([128, 128, 128])[0]).toBeCloseTo(0.2158, 3);
  });
});

describe("sun", () => {
  it("is a unit vector at every hour", () => {
    for (const hour of [0, 0.4, 1, 1.5, 2, 2.7, 3]) {
      const [x, y, z] = sunDirAt(hour);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    }
  });

  it("stands behind the viewer in the morning, so the approaching nose is lit, and ahead at dusk", () => {
    expect(sunDirAt(0)[2]).toBeGreaterThan(0.5);
    expect(sunDirAt(2)[2]).toBeLessThan(-0.5);
  });

  it("is bright at noon and a dim cold light at night", () => {
    expect(sunLightAt(1).intensity).toBeGreaterThan(sunLightAt(3).intensity * 4);
    expect(sunLightAt(3).color[2]).toBeGreaterThan(sunLightAt(3).color[0]);
    expect(sunGlowAt(1)).toBeCloseTo(1, 5);
  });
});

describe("scenery", () => {
  it("builds the same clouds and stars every time", () => {
    expect(buildClouds()).toEqual(buildClouds());
    expect(buildStars()).toEqual(buildStars());
  });

  it("keeps clouds above the horizon", () => {
    for (const cloud of buildClouds()) {
      expect(cloud.elevation).toBeGreaterThan(0);
      expect(cloud.width).toBeGreaterThan(0);
    }
  });
});
