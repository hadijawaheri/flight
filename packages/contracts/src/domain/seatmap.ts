import { seededRandom } from "../common/seeded";
import { type AircraftType, requireAircraft } from "../reference/aircraft";

export const CABINS = ["ECONOMY", "BUSINESS"] as const;
export type Cabin = (typeof CABINS)[number];
export type SeatKind = "STANDARD" | "FRONT" | "EXIT";
export type SeatPosition = "WINDOW" | "MIDDLE" | "AISLE";

export interface SeatDto {
  number: string;
  row: number;
  letter: string;
  cabin: Cabin;
  kind: SeatKind;
  position: SeatPosition;
  /** Extra charge for choosing this seat, rial. */
  feeRial: number;
  taken: boolean;
}

export interface SeatRowDto {
  row: number;
  cabin: Cabin;
  /** One entry per seat letter group; null marks nothing (gaps are implied between groups). */
  groups: SeatDto[][];
}

export interface SeatMapDto {
  aircraftId: string;
  aircraftName: string;
  layout: string[];
  rows: SeatRowDto[];
  freeSeats: { ECONOMY: number; BUSINESS: number };
}

export const SEAT_FEES = { front: 250_000, exit: 450_000 } as const;
const FRONT_ECONOMY_ROWS = 4;

export function seatNumber(row: number, letter: string): string {
  return `${row}${letter}`;
}

export function parseSeatNumber(value: string): { row: number; letter: string } | null {
  const match = /^(\d{1,2})([A-Z])$/.exec(value.toUpperCase());
  if (!match) return null;
  return { row: Number(match[1]), letter: match[2] as string };
}

export function cabinOfRow(aircraft: AircraftType, row: number): Cabin {
  return row <= aircraft.businessRows ? "BUSINESS" : "ECONOMY";
}

function positionOf(aircraft: AircraftType, letter: string): SeatPosition {
  const groups = aircraft.layout;
  const first = groups[0] as string;
  const last = groups[groups.length - 1] as string;
  if (letter === first[0] || letter === last[last.length - 1]) return "WINDOW";
  for (const group of groups) {
    const index = group.indexOf(letter);
    if (index === -1) continue;
    if (index === 0 || index === group.length - 1) return "AISLE";
  }
  return "MIDDLE";
}

export function seatExists(aircraft: AircraftType, value: string): boolean {
  const parsed = parseSeatNumber(value);
  if (!parsed || parsed.row < 1 || parsed.row > aircraft.rows) return false;
  return aircraft.layout.some((group) => group.includes(parsed.letter));
}

export interface SeatMapInput {
  aircraftId: string;
  /** Stable key of the flight; drives the deterministic occupancy. */
  flightKey: string;
  /** Share of seats already sold by other channels, 0–0.97. */
  loadFactor: number;
  /** Seats reserved by bookings in our own database. */
  reservedSeats?: ReadonlySet<string>;
}

export function buildSeatMap(input: SeatMapInput): SeatMapDto {
  const aircraft = requireAircraft(input.aircraftId);
  const reserved = input.reservedSeats ?? new Set<string>();
  const freeSeats = { ECONOMY: 0, BUSINESS: 0 };

  const rows: SeatRowDto[] = Array.from({ length: aircraft.rows }, (_, index) => {
    const row = index + 1;
    const cabin = cabinOfRow(aircraft, row);
    const isExit = aircraft.exitRows.includes(row);
    const isFront = cabin === "ECONOMY" && row <= aircraft.businessRows + FRONT_ECONOMY_ROWS;
    const kind: SeatKind = isExit ? "EXIT" : isFront ? "FRONT" : "STANDARD";
    const fee =
      cabin === "BUSINESS"
        ? 0
        : kind === "EXIT"
          ? SEAT_FEES.exit
          : kind === "FRONT"
            ? SEAT_FEES.front
            : 0;

    const groups = aircraft.layout.map((group) =>
      group.split("").map<SeatDto>((letter) => {
        const number = seatNumber(row, letter);
        const random = seededRandom(`${input.flightKey}|${number}`)();
        const taken = reserved.has(number) || random < input.loadFactor;
        if (!taken) freeSeats[cabin] += 1;
        return {
          number,
          row,
          letter,
          cabin,
          kind,
          position: positionOf(aircraft, letter),
          feeRial: fee,
          taken,
        };
      }),
    );
    return { row, cabin, groups };
  });

  return {
    aircraftId: aircraft.id,
    aircraftName: aircraft.nameFa,
    layout: [...aircraft.layout],
    rows,
    freeSeats,
  };
}

export function findSeat(map: SeatMapDto, value: string): SeatDto | undefined {
  const parsed = parseSeatNumber(value);
  if (!parsed) return undefined;
  return map.rows[parsed.row - 1]?.groups.flat().find((seat) => seat.letter === parsed.letter);
}

export type SeatPreference = "WINDOW" | "AISLE" | "ANY";

/**
 * Picks the best free seats for a party: contiguous within one row when possible, honouring the
 * first passenger's window/aisle preference. Used to hold seats at booking creation.
 */
export function autoAssignSeats(
  map: SeatMapDto,
  cabin: Cabin,
  count: number,
  preference: SeatPreference = "ANY",
  alreadyChosen: ReadonlySet<string> = new Set(),
  /** Seat kinds that must never be handed out automatically (exit rows have age rules). */
  excludedKinds: ReadonlySet<SeatKind> = new Set(),
): string[] {
  if (count === 0) return [];
  const free = (seat: SeatDto): boolean =>
    !seat.taken &&
    !alreadyChosen.has(seat.number) &&
    seat.cabin === cabin &&
    !excludedKinds.has(seat.kind);
  const standardFirst = (seat: SeatDto): number => (seat.kind === "STANDARD" ? 0 : 1);

  // Prefer a run of adjacent seats inside one letter group so a party sits together.
  for (const row of map.rows) {
    if (row.cabin !== cabin) continue;
    for (const group of row.groups) {
      for (let start = 0; start + count <= group.length; start += 1) {
        const run = group.slice(start, start + count);
        if (run.every(free) && run.every((seat) => seat.kind === "STANDARD")) {
          if (preference === "WINDOW" && !run.some((seat) => seat.position === "WINDOW")) continue;
          if (preference === "AISLE" && !run.some((seat) => seat.position === "AISLE")) continue;
          return run.map((seat) => seat.number);
        }
      }
    }
  }

  const candidates = map.rows
    .filter((row) => row.cabin === cabin)
    .flatMap((row) => row.groups.flat())
    .filter(free)
    .sort((a, b) => {
      const pref = (seat: SeatDto): number =>
        preference === "ANY" || seat.position === preference ? 0 : 1;
      return standardFirst(a) - standardFirst(b) || pref(a) - pref(b) || a.row - b.row;
    });
  return candidates.slice(0, count).map((seat) => seat.number);
}
