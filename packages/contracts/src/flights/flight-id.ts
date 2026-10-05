import { z } from "zod";

import type { Cabin } from "../domain/seatmap";

/**
 * Flights are not stored: the schedule is a pure function of route, date and slot. The id carries
 * everything needed to rebuild a flight, so links and bookings stay valid without a flights table.
 *
 * Format: ORIGIN(3) DEST(3) YYYYMMDD AIRLINE(2) SLOT(2) CABIN(1)  e.g. THRMHD20261020IR03E
 */
export interface FlightKey {
  origin: string;
  destination: string;
  /** ISO local departure date at the origin. */
  date: string;
  airlineCode: string;
  slot: number;
  cabin: Cabin;
}

const FLIGHT_ID_PATTERN = /^([A-Z]{3})([A-Z]{3})(\d{4})(\d{2})(\d{2})([A-Z0-9]{2})(\d{2})([EB])$/;

export function isFlightId(value: string): boolean {
  return parseFlightId(value) !== null;
}

export function buildFlightId(key: FlightKey): string {
  const [year, month, day] = key.date.split("-") as [string, string, string];
  const slot = String(key.slot).padStart(2, "0");
  return `${key.origin}${key.destination}${year}${month}${day}${key.airlineCode}${slot}${key.cabin === "BUSINESS" ? "B" : "E"}`;
}

export function parseFlightId(value: string): FlightKey | null {
  const match = FLIGHT_ID_PATTERN.exec(value);
  if (!match) return null;
  const [, origin, destination, year, month, day, airlineCode, slot, cabin] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const date = `${year}-${month}-${day}`;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.toISOString().slice(0, 10) !== date) return null;
  return {
    origin,
    destination,
    date,
    airlineCode,
    slot: Number(slot),
    cabin: cabin === "B" ? "BUSINESS" : "ECONOMY",
  };
}

export const flightIdSchema = z.string().refine(isFlightId, "شناسه‌ی پرواز معتبر نیست");
