import type { HotelRecord, HotelStay, RoomRateRecord } from "./hotel.provider.js";
import { HotelProvider } from "./hotel.provider.js";
import {
  findHotel,
  hotelCityFor,
  hotelsInCity,
  rateRecord,
  roomPlans,
} from "./simulation/catalogue.js";

/** Seeded hotels for domestic cities with flights (ADR 0016). */
export class SimulatedHotelProvider extends HotelProvider {
  readonly dataSource = "simulation" as const;

  search(cityCodes: string[]): Promise<HotelRecord[]> {
    const seen = new Set<string>();
    const hotels: HotelRecord[] = [];
    for (const code of cityCodes) {
      const city = hotelCityFor(code);
      if (!city || seen.has(city.code)) continue;
      seen.add(city.code);
      hotels.push(...hotelsInCity(city));
    }
    return Promise.resolve(hotels);
  }

  find(hotelId: string): Promise<HotelRecord | null> {
    return Promise.resolve(findHotel(hotelId));
  }

  rates(hotel: HotelRecord, stay: HotelStay): Promise<RoomRateRecord[]> {
    const guests = stay.adults + stay.children;
    return Promise.resolve(
      roomPlans(hotel)
        .filter((plan) => plan.template.maxOccupancy * stay.rooms >= guests)
        .map((plan) => rateRecord(hotel, plan, stay.checkIn, stay.checkOut)),
    );
  }
}
