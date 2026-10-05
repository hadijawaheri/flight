export type AircraftId =
  "A320" | "A321" | "A330" | "B737" | "B777" | "F100" | "MD83" | "ATR72" | "E190";

export interface AircraftType {
  id: AircraftId;
  nameFa: string;
  nameEn: string;
  /** Seat letters per group, aisle between groups: ["ABC", "DEF"] is 3-3. */
  layout: readonly string[];
  rows: number;
  /** Front rows sold as business (same grid, wider fare). */
  businessRows: number;
  /** Emergency-exit rows (extra legroom, restricted for children and infants). */
  exitRows: readonly number[];
  /** Typical block speed used by the schedule simulator (km/h). */
  cruiseKmh: number;
}

export const AIRCRAFT: readonly AircraftType[] = [
  {
    id: "A320",
    nameFa: "ایرباس A320",
    nameEn: "Airbus A320",
    layout: ["ABC", "DEF"],
    rows: 27,
    businessRows: 3,
    exitRows: [12, 13],
    cruiseKmh: 800,
  },
  {
    id: "A321",
    nameFa: "ایرباس A321",
    nameEn: "Airbus A321",
    layout: ["ABC", "DEF"],
    rows: 33,
    businessRows: 3,
    exitRows: [14, 15],
    cruiseKmh: 800,
  },
  {
    id: "A330",
    nameFa: "ایرباس A330",
    nameEn: "Airbus A330",
    layout: ["AB", "CDEF", "GH"],
    rows: 38,
    businessRows: 5,
    exitRows: [17, 18],
    cruiseKmh: 850,
  },
  {
    id: "B737",
    nameFa: "بوئینگ ۷۳۷",
    nameEn: "Boeing 737-800",
    layout: ["ABC", "DEF"],
    rows: 28,
    businessRows: 3,
    exitRows: [14, 15],
    cruiseKmh: 800,
  },
  {
    id: "B777",
    nameFa: "بوئینگ ۷۷۷",
    nameEn: "Boeing 777-300ER",
    layout: ["ABC", "DEFG", "HJK"],
    rows: 46,
    businessRows: 6,
    exitRows: [20, 21],
    cruiseKmh: 880,
  },
  {
    id: "F100",
    nameFa: "فوکر ۱۰۰",
    nameEn: "Fokker 100",
    layout: ["ABC", "DE"],
    rows: 19,
    businessRows: 0,
    exitRows: [9],
    cruiseKmh: 720,
  },
  {
    id: "MD83",
    nameFa: "مک‌دانل داگلاس MD-83",
    nameEn: "McDonnell Douglas MD-83",
    layout: ["AB", "CDE"],
    rows: 30,
    businessRows: 0,
    exitRows: [11, 12],
    cruiseKmh: 780,
  },
  {
    id: "ATR72",
    nameFa: "ATR 72",
    nameEn: "ATR 72-600",
    layout: ["AB", "CD"],
    rows: 18,
    businessRows: 0,
    exitRows: [8],
    cruiseKmh: 510,
  },
  {
    id: "E190",
    nameFa: "امبرائر ۱۹۰",
    nameEn: "Embraer E190",
    layout: ["AB", "CD"],
    rows: 25,
    businessRows: 0,
    exitRows: [10],
    cruiseKmh: 780,
  },
];

const AIRCRAFT_BY_ID = new Map(AIRCRAFT.map((aircraft) => [aircraft.id, aircraft]));

export function getAircraft(id: string): AircraftType | undefined {
  return AIRCRAFT_BY_ID.get(id as AircraftId);
}

export function requireAircraft(id: string): AircraftType {
  const aircraft = getAircraft(id);
  if (!aircraft) throw new Error(`Unknown aircraft ${id}`);
  return aircraft;
}

export function seatsPerRow(aircraft: AircraftType): number {
  return aircraft.layout.reduce((sum, group) => sum + group.length, 0);
}

export function totalSeats(aircraft: AircraftType): number {
  return seatsPerRow(aircraft) * aircraft.rows;
}

export function businessSeats(aircraft: AircraftType): number {
  return seatsPerRow(aircraft) * aircraft.businessRows;
}

export function economySeats(aircraft: AircraftType): number {
  return totalSeats(aircraft) - businessSeats(aircraft);
}
