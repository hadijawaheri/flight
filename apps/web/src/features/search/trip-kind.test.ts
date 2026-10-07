import { describe, expect, it } from "vitest";

import {
  allowedDestinations,
  allowedOrigins,
  kindOfTrip,
  matchInOtherKind,
  retarget,
} from "./trip-kind";

describe("trip kind", () => {
  it("offers only international destinations for the gateway and none for domestic", () => {
    expect(allowedDestinations("DOMESTIC", "IKA")).toEqual([]);
    expect(allowedDestinations("INTERNATIONAL", "IKA")).toContain("DXB");
    expect(allowedDestinations("INTERNATIONAL", "IKA")).not.toContain("MHD");
  });

  it("offers only domestic airports after a domestic origin, and never a foreign one", () => {
    const list = allowedDestinations("DOMESTIC", "MHD");
    expect(list).toContain("THR");
    expect(list).not.toContain("DXB");
    expect(list).not.toContain("IKA");
  });

  it("restricts the origin by the destination already chosen", () => {
    const list = allowedOrigins("INTERNATIONAL", "DXB");
    expect(list).toContain("IKA");
    expect(list).not.toContain("BUZ");
  });

  it("detects the kind of an existing trip", () => {
    expect(kindOfTrip("THR", "MHD")).toBe("DOMESTIC");
    expect(kindOfTrip("IKA", "DXB")).toBe("INTERNATIONAL");
    expect(kindOfTrip("IKA", "MHD")).toBe("DOMESTIC");
  });

  it("moves Tehran to the right airport and clears an end that no longer flies", () => {
    expect(retarget("INTERNATIONAL", { origin: "THR", destination: "MHD" })).toEqual({
      origin: "TEH",
      destination: "",
    });
    expect(retarget("DOMESTIC", { origin: "IKA", destination: "DXB" })).toEqual({
      origin: "THR",
      destination: "",
    });
    expect(retarget("INTERNATIONAL", { origin: "THR", destination: "DXB" })).toEqual({
      origin: "TEH",
      destination: "DXB",
    });
    expect(retarget("INTERNATIONAL", { origin: "BUZ", destination: "" }).origin).toBe("TEH");
    expect(retarget("INTERNATIONAL", { origin: "KER", destination: "NJF" })).toEqual({
      origin: "KER",
      destination: "NJF",
    });
    expect(retarget("DOMESTIC", { origin: "DXB", destination: "" }).origin).toBe("THR");
  });

  it("suggests the other kind when the text only matches there", () => {
    expect(matchInOtherKind("دبی", "DOMESTIC")?.code).toBe("DXB");
    expect(matchInOtherKind("بوشهر", "INTERNATIONAL")?.code).toBe("BUZ");
    expect(matchInOtherKind("", "DOMESTIC")).toBeNull();
  });
});
