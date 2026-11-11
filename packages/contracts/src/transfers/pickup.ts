import type { TransferDirection } from "./transfers.schema";

/**
 * Simulation assumptions, not airport rules: how long it takes from touchdown to the arrivals hall
 * with checked bags, and how early to be at the airport. Iranian airlines ask for about 2 hours
 * before domestic and 3 hours before international departures.
 */
export const TRANSFER_TIMING = {
  baggageClaimMinutes: { domestic: 30, international: 60 },
  airportLeadMinutes: { domestic: 120, international: 180 },
  /** Extra margin on the road to the airport for traffic. */
  roadBufferMinutes: 15,
} as const;

export interface PickupFlight {
  departureUtc: string | Date;
  arrivalUtc: string | Date;
  international: boolean;
}

/**
 * When the driver should be waiting. From the airport: arrival plus baggage claim, so a 01:30
 * touchdown means a pickup shortly after on the same (next calendar) day. To the airport:
 * departure minus the check-in lead, the drive and a traffic buffer.
 */
export function pickupTimeFor(
  flight: PickupFlight,
  direction: TransferDirection,
  driveMinutes: number,
): Date {
  const scope = flight.international ? "international" : "domestic";
  if (direction === "FROM_AIRPORT") {
    const arrival = new Date(flight.arrivalUtc).getTime();
    return new Date(arrival + TRANSFER_TIMING.baggageClaimMinutes[scope] * 60_000);
  }
  const departure = new Date(flight.departureUtc).getTime();
  const lead =
    TRANSFER_TIMING.airportLeadMinutes[scope] +
    Math.max(0, driveMinutes) +
    TRANSFER_TIMING.roadBufferMinutes;
  return new Date(departure - lead * 60_000);
}
