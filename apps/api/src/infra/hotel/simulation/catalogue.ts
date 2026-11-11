import {
  type Airport,
  AIRPORTS,
  type BedType,
  demandForDate,
  diffDaysIso,
  expandAirportCode,
  getAirport,
  type HotelCancellationPolicy,
  isoDateRange,
  type MealPlan,
  pickFrom,
  randomBetween,
  randomIntBetween,
  roundRial,
  seededRandom,
  unitFromKey,
} from "@flysmart/contracts";

import type { HotelRecord, RoomRateRecord } from "../hotel.provider.js";

/**
 * Seeded hotel market. A hotel id encodes its city and slot (`H` + airport + two digits), so the
 * same id always rebuilds the same hotel, rooms and prices and a quote can be re-verified later
 * without a hotel table, exactly like simulated flight ids.
 */

const HOTEL_ID_PATTERN = /^H([A-Z]{3})(\d{2})$/;

/** Bigger travel cities get more hotels. */
const LARGE_CITIES = new Set(["THR", "MHD", "SYZ", "IFN", "KIH", "TBZ"]);

const NAMES: ReadonlyArray<readonly [string, string]> = [
  ["پارسیان", "Parsian"],
  ["آسمان", "Aseman"],
  ["هما", "Homa"],
  ["پردیس", "Pardis"],
  ["الماس", "Almas"],
  ["مروارید", "Morvarid"],
  ["نگین", "Negin"],
  ["بهار", "Bahar"],
  ["ستاره", "Setareh"],
  ["کوثر", "Kowsar"],
  ["آزادی", "Azadi"],
  ["سپیدار", "Sepidar"],
  ["ارغوان", "Arghavan"],
  ["پارک", "Park"],
  ["جهانگردی", "Jahangardi"],
  ["زاگرس", "Zagros"],
];

const NEIGHBOURHOODS = [
  "مرکز شهر",
  "بلوار اصلی",
  "محله‌ی قدیمی",
  "کنار پارک شهر",
  "منطقه‌ی تجاری",
  "مسیر فرودگاه",
] as const;

const AMENITIES_BY_STARS: Record<number, readonly string[]> = {
  2: ["اینترنت بی‌سیم", "پذیرش ۲۴ ساعته"],
  3: ["اینترنت بی‌سیم", "پذیرش ۲۴ ساعته", "رستوران", "پارکینگ"],
  4: ["اینترنت بی‌سیم", "پذیرش ۲۴ ساعته", "رستوران", "پارکینگ", "باشگاه ورزشی", "کافی‌شاپ"],
  5: [
    "اینترنت بی‌سیم",
    "پذیرش ۲۴ ساعته",
    "رستوران",
    "پارکینگ",
    "باشگاه ورزشی",
    "استخر",
    "اسپا",
    "کافی‌شاپ",
  ],
};

/** Typical domestic nightly price for a double room by stars, rial (simulation placeholders). */
const BASE_NIGHTLY_RIAL: Record<number, number> = {
  2: 22_000_000,
  3: 35_000_000,
  4: 60_000_000,
  5: 110_000_000,
};

interface RoomTemplate {
  key: string;
  nameFa: string;
  bed: BedType;
  maxOccupancy: number;
  factor: number;
}

const ROOM_TEMPLATES: readonly RoomTemplate[] = [
  { key: "SGL", nameFa: "اتاق یک‌نفره", bed: "SINGLE", maxOccupancy: 1, factor: 0.7 },
  { key: "DBL", nameFa: "اتاق دونفره", bed: "DOUBLE", maxOccupancy: 2, factor: 1 },
  { key: "TWN", nameFa: "اتاق دو تخته", bed: "TWIN", maxOccupancy: 2, factor: 1 },
  { key: "TRP", nameFa: "اتاق سه‌نفره", bed: "TRIPLE", maxOccupancy: 3, factor: 1.35 },
  { key: "STE", nameFa: "سوئیت", bed: "DOUBLE", maxOccupancy: 3, factor: 1.9 },
];

const FLEXIBLE_POLICY: HotelCancellationPolicy = {
  refundable: true,
  noShowPenaltyPercent: 100,
  tiers: [
    { minHoursBeforeCheckIn: 72, penaltyPercent: 0, label: "بیش از ۷۲ ساعت مانده؛ رایگان" },
    { minHoursBeforeCheckIn: 24, penaltyPercent: 30, label: "۲۴ تا ۷۲ ساعت مانده" },
    { minHoursBeforeCheckIn: 0, penaltyPercent: 50, label: "کمتر از ۲۴ ساعت مانده" },
  ],
};

const STANDARD_POLICY: HotelCancellationPolicy = {
  refundable: true,
  noShowPenaltyPercent: 100,
  tiers: [
    { minHoursBeforeCheckIn: 168, penaltyPercent: 0, label: "بیش از ۷ روز مانده؛ رایگان" },
    { minHoursBeforeCheckIn: 72, penaltyPercent: 30, label: "۳ تا ۷ روز مانده" },
    { minHoursBeforeCheckIn: 0, penaltyPercent: 100, label: "کمتر از ۳ روز مانده" },
  ],
};

const NON_REFUNDABLE_POLICY: HotelCancellationPolicy = {
  refundable: false,
  noShowPenaltyPercent: 100,
  tiers: [{ minHoursBeforeCheckIn: 0, penaltyPercent: 100, label: "غیرقابل استرداد" }],
};

/** Domestic cities with an airport; abroad is out of scope (ADR 0016). One entry per city. */
const HOTEL_CITIES: readonly Airport[] = (() => {
  const seen = new Set<string>();
  return AIRPORTS.filter((airport) => {
    if (airport.countryCode !== "IR" || seen.has(airport.cityEn)) return false;
    seen.add(airport.cityEn);
    return true;
  });
})();

const CITY_BY_NAME = new Map(HOTEL_CITIES.map((airport) => [airport.cityEn, airport]));

/** The airport hotels of a location code are generated under (IKA and TEH both mean Tehran's THR). */
export function hotelCityFor(code: string): Airport | null {
  const airports = expandAirportCode(code)
    .map((item) => getAirport(item))
    .filter((item): item is Airport => Boolean(item));
  for (const airport of airports) {
    const city = CITY_BY_NAME.get(airport.cityEn);
    if (city) return city;
  }
  return null;
}

export function hotelCount(city: Airport): number {
  const random = seededRandom(`hotels:${city.code}`);
  return LARGE_CITIES.has(city.code)
    ? randomIntBetween(random, 7, 10)
    : randomIntBetween(random, 3, 5);
}

function hotelId(city: Airport, slot: number): string {
  return `H${city.code}${String(slot).padStart(2, "0")}`;
}

export function buildHotel(city: Airport, slot: number): HotelRecord {
  const id = hotelId(city, slot);
  const random = seededRandom(id);
  const stars = pickFrom(random, [2, 3, 3, 3, 4, 4, 5] as const);
  const [nameFa, nameEn] = NAMES[(slot + city.code.charCodeAt(0)) % NAMES.length] ?? NAMES[0]!;
  const neighbourhoodFa = pickFrom(random, NEIGHBOURHOODS);
  const nearAirport = neighbourhoodFa === "مسیر فرودگاه";
  const distanceToAirportKm = Math.round(
    nearAirport ? randomBetween(random, 1, 5) : randomBetween(random, 6, 28),
  );
  const distanceToCenterKm =
    Math.round(
      (neighbourhoodFa === "مرکز شهر"
        ? randomBetween(random, 0.3, 2)
        : randomBetween(random, 2, 12)) * 10,
    ) / 10;
  return {
    id,
    nameFa: `هتل ${nameFa} ${city.cityFa}`,
    nameEn: `${nameEn} Hotel ${city.cityEn}`,
    stars,
    airportCode: city.code,
    cityFa: city.cityFa,
    neighbourhoodFa,
    addressFa: `${city.cityFa}، ${neighbourhoodFa}، پلاک ${randomIntBetween(random, 2, 180)}`,
    distanceToAirportKm,
    distanceToCenterKm,
    checkInTime: stars >= 4 ? "14:00" : pickFrom(random, ["12:00", "14:00"] as const),
    checkOutTime: stars >= 4 ? "12:00" : pickFrom(random, ["12:00", "10:00"] as const),
    utcOffsetMinutes: city.utcOffsetMinutes,
    amenitiesFa: [...(AMENITIES_BY_STARS[stars] ?? [])],
  };
}

export function hotelsInCity(city: Airport): HotelRecord[] {
  return Array.from({ length: hotelCount(city) }, (_, index) => buildHotel(city, index + 1));
}

export function findHotel(id: string): HotelRecord | null {
  const match = HOTEL_ID_PATTERN.exec(id.toUpperCase());
  if (!match) return null;
  const city = hotelCityFor(match[1]!);
  const slot = Number(match[2]);
  if (!city || city.code !== match[1] || slot < 1 || slot > hotelCount(city)) return null;
  return buildHotel(city, slot);
}

interface RoomPlan {
  id: string;
  template: RoomTemplate;
  mealPlan: MealPlan;
  policy: HotelCancellationPolicy;
  /** Price factor on top of the room template, e.g. cheaper non-refundable rates. */
  rateFactor: number;
}

/** The room types a hotel sells. Ids are `<hotelId>-<template>-<rate>` and stable. */
export function roomPlans(hotel: HotelRecord): RoomPlan[] {
  const random = seededRandom(`rooms:${hotel.id}`);
  const templates = ROOM_TEMPLATES.filter(
    (template) => template.key !== "STE" || hotel.stars >= 4,
  ).filter((template) => template.key === "DBL" || random() < 0.65);
  const breakfast: MealPlan = hotel.stars >= 3 ? "BREAKFAST" : "ROOM_ONLY";
  const plans: RoomPlan[] = [];
  for (const template of templates) {
    const flexible = hotel.stars >= 4 || random() < 0.5;
    plans.push({
      id: `${hotel.id}-${template.key}-F`,
      template,
      mealPlan: template.key === "STE" && hotel.stars === 5 ? "HALF_BOARD" : breakfast,
      policy: flexible ? FLEXIBLE_POLICY : STANDARD_POLICY,
      rateFactor: 1,
    });
    // A cheaper prepaid rate without meals, the way booking sites sell it
    if (hotel.stars >= 3 && template.key === "DBL") {
      plans.push({
        id: `${hotel.id}-${template.key}-N`,
        template,
        mealPlan: "ROOM_ONLY",
        policy: NON_REFUNDABLE_POLICY,
        rateFactor: 0.85,
      });
    }
  }
  return plans;
}

/** Rooms of one type the simulated hotel still has for sale on a night, before our own holds. */
export function inventoryOn(roomId: string, night: string): number {
  return 1 + Math.floor(unitFromKey(`inventory:${roomId}:${night}`) * 8);
}

export function nightlyRate(hotel: HotelRecord, plan: RoomPlan, night: string): number {
  const base = BASE_NIGHTLY_RIAL[hotel.stars] ?? BASE_NIGHTLY_RIAL[3]!;
  const jitter = 0.92 + unitFromKey(`rate:${plan.id}:${night}`) * 0.16;
  const raw =
    base * plan.template.factor * plan.rateFactor * demandForDate(night).multiplier * jitter;
  return roundRial(raw, 100_000);
}

export function rateRecord(
  hotel: HotelRecord,
  plan: RoomPlan,
  checkIn: string,
  checkOut: string,
): RoomRateRecord {
  const nights = isoDateRange(checkIn, diffDaysIso(checkOut, checkIn));
  return {
    id: plan.id,
    hotelId: hotel.id,
    nameFa: plan.template.nameFa,
    bed: plan.template.bed,
    maxOccupancy: plan.template.maxOccupancy,
    mealPlan: plan.mealPlan,
    nightlyRates: nights.map((date) => ({ date, amount: nightlyRate(hotel, plan, date) })),
    cancellationPolicy: plan.policy,
    roomsLeft: Math.min(...nights.map((night) => inventoryOn(plan.id, night))),
  };
}
