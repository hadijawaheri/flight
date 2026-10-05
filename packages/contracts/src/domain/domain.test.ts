import { describe, expect, it } from "vitest";

import { calculateExcessBaggage } from "./baggage";
import { evaluateBattery, wattHoursFromMah } from "./batteries";
import {
  buildFareBreakdown,
  countPassengers,
  FARE_POLICY,
  passengerTypeForAge,
  seatedPassengerCount,
  validatePassengerMix,
} from "./fare";
import { calculateRefund, refundPolicyFor } from "./refund";
import { autoAssignSeats, buildSeatMap, findSeat, parseSeatNumber, seatExists } from "./seatmap";
import { requireAircraft } from "../reference/aircraft";

describe("passenger mix", () => {
  it("requires an adult and one adult per infant", () => {
    expect(validatePassengerMix({ adults: 0, children: 1, infants: 0 })).not.toBeNull();
    expect(validatePassengerMix({ adults: 1, children: 0, infants: 2 })).not.toBeNull();
    expect(validatePassengerMix({ adults: 2, children: 3, infants: 2 })).toBeNull();
  });

  it("caps a booking at nine passengers", () => {
    expect(validatePassengerMix({ adults: 9, children: 1, infants: 0 })).not.toBeNull();
    expect(validatePassengerMix({ adults: 9, children: 0, infants: 0 })).toBeNull();
  });

  it("counts types and seated passengers", () => {
    const types = ["ADULT", "ADULT", "CHILD", "INFANT"] as const;
    expect(countPassengers(types)).toEqual({ adults: 2, children: 1, infants: 1 });
    expect(seatedPassengerCount(types)).toBe(3);
  });

  it("derives the passenger type from age on the travel date", () => {
    expect(passengerTypeForAge("2025-01-10", "2026-01-09")).toBe("INFANT");
    expect(passengerTypeForAge("2024-01-10", "2026-01-10")).toBe("CHILD");
    expect(passengerTypeForAge("2014-06-01", "2026-05-31")).toBe("CHILD");
    expect(passengerTypeForAge("2014-06-01", "2026-06-01")).toBe("ADULT");
    expect(passengerTypeForAge("1990-03-03", "2026-10-10")).toBe("ADULT");
  });
});

describe("fare breakdown", () => {
  it("prices an adult with tax, insurance and service fee", () => {
    const fare = buildFareBreakdown({
      adultBaseFare: 40_000_000,
      flightType: "SYSTEMIC",
      international: false,
      passengerTypes: ["ADULT"],
    });
    const adult = fare.perPassenger[0];
    expect(adult?.baseFare).toBe(40_000_000);
    expect(adult?.taxes).toBe(FARE_POLICY.airportTaxRial.domestic + FARE_POLICY.insuranceRial);
    // 0.8% of 40M is 320k, below the 500k minimum fee.
    expect(adult?.serviceFee).toBe(FARE_POLICY.serviceFeeMinRial);
    expect(fare.total).toBe(
      (adult?.baseFare ?? 0) + (adult?.taxes ?? 0) + (adult?.serviceFee ?? 0),
    );
  });

  it("applies the child discount only to systemic flights", () => {
    const systemic = buildFareBreakdown({
      adultBaseFare: 40_000_000,
      flightType: "SYSTEMIC",
      international: false,
      passengerTypes: ["CHILD"],
    });
    const charter = buildFareBreakdown({
      adultBaseFare: 40_000_000,
      flightType: "CHARTER",
      international: false,
      passengerTypes: ["CHILD"],
    });
    expect(systemic.perPassenger[0]?.baseFare).toBe(30_000_000);
    expect(charter.perPassenger[0]?.baseFare).toBe(40_000_000);
  });

  it("charges an infant a tenth of the fare and no taxes", () => {
    const fare = buildFareBreakdown({
      adultBaseFare: 40_000_000,
      flightType: "SYSTEMIC",
      international: false,
      passengerTypes: ["INFANT"],
    });
    expect(fare.perPassenger[0]?.baseFare).toBe(4_000_000);
    expect(fare.perPassenger[0]?.taxes).toBe(0);
  });

  it("uses the international airport charge", () => {
    const domestic = buildFareBreakdown({
      adultBaseFare: 50_000_000,
      flightType: "SYSTEMIC",
      international: false,
      passengerTypes: ["ADULT"],
    });
    const abroad = buildFareBreakdown({
      adultBaseFare: 50_000_000,
      flightType: "SYSTEMIC",
      international: true,
      passengerTypes: ["ADULT"],
    });
    expect(abroad.taxTotal - domestic.taxTotal).toBe(
      FARE_POLICY.airportTaxRial.international - FARE_POLICY.airportTaxRial.domestic,
    );
  });

  it("sums the party and keeps the parts consistent with the total", () => {
    const fare = buildFareBreakdown({
      adultBaseFare: 33_330_000,
      flightType: "SYSTEMIC",
      international: false,
      passengerTypes: ["ADULT", "ADULT", "CHILD", "INFANT"],
    });
    expect(fare.perPassenger).toHaveLength(4);
    expect(fare.baseTotal + fare.taxTotal + fare.serviceFeeTotal).toBe(fare.total);
  });
});

describe("refund", () => {
  const paid = { baseFare: 100_000_000, taxes: 17_000_000, serviceFee: 800_000 };

  it("steps the penalty by time before departure", () => {
    const policy = refundPolicyFor("SYSTEMIC", "STANDARD");
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 100 }).penaltyPercent).toBe(15);
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 48 }).penaltyPercent).toBe(25);
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 10 }).penaltyPercent).toBe(40);
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 1 }).penaltyPercent).toBe(60);
  });

  it("applies a tier exactly at its boundary", () => {
    const policy = refundPolicyFor("SYSTEMIC", "STANDARD");
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 72 }).penaltyPercent).toBe(15);
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 24 }).penaltyPercent).toBe(25);
    expect(calculateRefund({ ...paid, policy, hoursBeforeDeparture: 3 }).penaltyPercent).toBe(40);
  });

  it("penalises the base fare only, returns taxes and keeps the service fee", () => {
    const policy = refundPolicyFor("SYSTEMIC", "STANDARD");
    const result = calculateRefund({ ...paid, policy, hoursBeforeDeparture: 100 });
    expect(result.penaltyAmount).toBe(15_000_000);
    expect(result.refundAmount).toBe(100_000_000 - 15_000_000 + 17_000_000);
    expect(result.nonRefundableFees).toBe(800_000);
  });

  it("treats a departed flight as a no-show", () => {
    const policy = refundPolicyFor("SYSTEMIC", "SAVER");
    const result = calculateRefund({ ...paid, policy, hoursBeforeDeparture: -2 });
    expect(result.isNoShow).toBe(true);
    expect(result.penaltyPercent).toBe(100);
    expect(result.refundAmount).toBe(17_000_000);
  });

  it("refunds everything when the airline is at fault", () => {
    const policy = refundPolicyFor("SYSTEMIC", "SAVER");
    const result = calculateRefund({
      ...paid,
      policy,
      hoursBeforeDeparture: 1,
      reason: "AIRLINE_CANCELLED",
    });
    expect(result.penaltyAmount).toBe(0);
    expect(result.refundAmount).toBe(117_800_000);
  });

  it("never refunds more than was paid or a negative amount", () => {
    for (const family of ["SAVER", "STANDARD", "FLEX"] as const) {
      for (const hours of [-5, 0, 2, 12, 48, 200]) {
        const policy = refundPolicyFor("SYSTEMIC", family);
        const result = calculateRefund({ ...paid, policy, hoursBeforeDeparture: hours });
        expect(result.refundAmount).toBeGreaterThanOrEqual(0);
        expect(result.refundAmount).toBeLessThanOrEqual(117_000_000);
      }
    }
  });

  it("is stricter on charter flights", () => {
    const charter = refundPolicyFor("CHARTER", "STANDARD");
    expect(
      calculateRefund({ ...paid, policy: charter, hoursBeforeDeparture: 10 }).penaltyPercent,
    ).toBe(100);
  });
});

describe("baggage", () => {
  it("charges nothing within the allowance", () => {
    expect(
      calculateExcessBaggage({ allowanceKg: 20, baggageKg: 20, fullEconomyFare: 50_000_000 })
        .totalFee,
    ).toBe(0);
  });

  it("rounds excess kilograms up and charges one percent of the fare per kg", () => {
    const result = calculateExcessBaggage({
      allowanceKg: 20,
      baggageKg: 23.2,
      fullEconomyFare: 50_000_000,
    });
    expect(result.excessKg).toBe(4);
    expect(result.feePerKg).toBe(500_000);
    expect(result.totalFee).toBe(2_000_000);
  });
});

describe("batteries", () => {
  it("converts mAh to Wh", () => {
    expect(wattHoursFromMah(20_000)).toBeCloseTo(74, 1);
    expect(wattHoursFromMah(27_000)).toBeCloseTo(99.9, 1);
  });

  it("allows up to 100 Wh, needs approval to 160 Wh and forbids above", () => {
    expect(evaluateBattery({ wattHours: 100, spare: true }).verdict).toBe("ALLOWED");
    expect(evaluateBattery({ wattHours: 100.1, spare: true }).verdict).toBe("NEEDS_APPROVAL");
    expect(evaluateBattery({ wattHours: 160, spare: true }).verdict).toBe("NEEDS_APPROVAL");
    expect(evaluateBattery({ wattHours: 160.1, spare: true }).verdict).toBe("FORBIDDEN");
  });

  it("keeps spare batteries in the cabin", () => {
    expect(evaluateBattery({ wattHours: 50, spare: true }).location).toBe("CABIN_ONLY");
    expect(evaluateBattery({ wattHours: 50, spare: false }).location).toBe("CABIN_OR_CHECKED");
  });
});

describe("seat map", () => {
  const input = { aircraftId: "A320", flightKey: "THRMHD20261020IR03E", loadFactor: 0.5 } as const;

  it("is deterministic for the same flight", () => {
    expect(buildSeatMap(input)).toEqual(buildSeatMap(input));
  });

  it("differs between flights", () => {
    const other = buildSeatMap({ ...input, flightKey: "THRMHD20261020W503E" });
    expect(other.freeSeats).not.toEqual(buildSeatMap(input).freeSeats);
  });

  it("has the aircraft's seat count and a business cabin at the front", () => {
    const aircraft = requireAircraft("A320");
    const map = buildSeatMap({ ...input, loadFactor: 0 });
    const seats = map.rows.flatMap((row) => row.groups.flat());
    expect(seats).toHaveLength(aircraft.rows * 6);
    expect(map.rows[0]?.cabin).toBe("BUSINESS");
    expect(map.rows[aircraft.businessRows]?.cabin).toBe("ECONOMY");
    expect(map.freeSeats.BUSINESS + map.freeSeats.ECONOMY).toBe(seats.length);
  });

  it("marks reserved seats as taken even on an empty plane", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0, reservedSeats: new Set(["10A"]) });
    expect(findSeat(map, "10A")?.taken).toBe(true);
    expect(findSeat(map, "10B")?.taken).toBe(false);
  });

  it("prices exit rows and front economy rows, window and aisle are classified", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0 });
    expect(findSeat(map, "12A")?.kind).toBe("EXIT");
    expect(findSeat(map, "12A")?.feeRial).toBeGreaterThan(0);
    expect(findSeat(map, "20A")?.feeRial).toBe(0);
    expect(findSeat(map, "20A")?.position).toBe("WINDOW");
    expect(findSeat(map, "20C")?.position).toBe("AISLE");
    expect(findSeat(map, "20B")?.position).toBe("MIDDLE");
    expect(findSeat(map, "1A")?.feeRial).toBe(0);
  });

  it("validates seat numbers against the aircraft", () => {
    const aircraft = requireAircraft("A320");
    expect(seatExists(aircraft, "1A")).toBe(true);
    expect(seatExists(aircraft, "27F")).toBe(true);
    expect(seatExists(aircraft, "28A")).toBe(false);
    expect(seatExists(aircraft, "5G")).toBe(false);
    expect(parseSeatNumber("12c")).toEqual({ row: 12, letter: "C" });
    expect(parseSeatNumber("C12")).toBeNull();
  });

  it("assigns a party contiguous standard seats in the right cabin", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0.3 });
    const seats = autoAssignSeats(map, "ECONOMY", 3);
    expect(seats).toHaveLength(3);
    expect(new Set(seats).size).toBe(3);
    for (const seat of seats) {
      const found = findSeat(map, seat);
      expect(found?.taken).toBe(false);
      expect(found?.cabin).toBe("ECONOMY");
    }
    const rows = new Set(seats.map((seat) => parseSeatNumber(seat)?.row));
    expect(rows.size).toBe(1);
  });

  it("honours a window preference and never reuses chosen seats", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0.2 });
    const first = autoAssignSeats(map, "ECONOMY", 1, "WINDOW");
    expect(findSeat(map, first[0] as string)?.position).toBe("WINDOW");
    const second = autoAssignSeats(map, "ECONOMY", 1, "WINDOW", new Set(first));
    expect(second[0]).not.toBe(first[0]);
  });

  it("never auto-assigns an excluded kind such as exit rows", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0.9 });
    const seats = autoAssignSeats(map, "ECONOMY", 20, "ANY", new Set(), new Set(["EXIT"]));
    for (const seat of seats) expect(findSeat(map, seat)?.kind).not.toBe("EXIT");
  });

  it("returns fewer seats than asked when the cabin is nearly full", () => {
    const map = buildSeatMap({ ...input, loadFactor: 0.97 });
    expect(autoAssignSeats(map, "BUSINESS", 18).length).toBeLessThanOrEqual(18);
  });
});
