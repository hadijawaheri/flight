import type {
  BudgetDestinationDto,
  CheapDealDto,
  FareMatrixItemDto,
  FlightClass,
  FlightDto,
  FlightSearchQuery,
  FlightType,
  PriceAdvice,
  PriceTrend,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { FlightProvider } from "./flight.provider.js";

interface AirportInfo {
  code: string;
  name: string;
  airport: string;
  image: string;
  description: string;
}

const AIRPORTS: Record<string, AirportInfo> = {
  THR: {
    code: "THR",
    name: "تهران",
    airport: "فرودگاه بین‌المللی مهرآباد",
    image: "/images/cities/tehran.webp",
    description: "پایتخت تاریخی و پرجنب‌وجوش با جاذبه‌های شهری و فرهنگی",
  },
  MHD: {
    code: "MHD",
    name: "مشهد",
    airport: "فرودگاه بین‌المللی شهید هاشمی‌نژاد",
    image: "/images/cities/mashhad.webp",
    description: "قطب زیارتی و گردشگری معنوی با هتل‌ها و مراکز خرید مدرن",
  },
  KIH: {
    code: "KIH",
    name: "کیش",
    airport: "فرودگاه بین‌المللی کیش",
    image: "/images/cities/kish.webp",
    description: "جزیره زیبای مرجانی خلیج فارس، ورزش‌های آبی و خرید بدون گمرک",
  },
  SYZ: {
    code: "SYZ",
    name: "شیراز",
    airport: "فرودگاه بین‌المللی شهید دستغیب",
    image: "/images/cities/shiraz.webp",
    description: "شهر شعر، ادب و باغ‌های تاریخی پارسی با تخت‌جمشید و حافظیه",
  },
  IFN: {
    code: "IFN",
    name: "اصفهان",
    airport: "فرودگاه بین‌المللی شهید بهشتی",
    image: "/images/cities/isfahan.webp",
    description: "نصف جهان با معماری خیره‌کننده صفوی، سی‌وسه‌پل و میدان نقش‌جهان",
  },
  TBZ: {
    code: "TBZ",
    name: "تبریز",
    airport: "فرودگاه بین‌المللی شهید مدنی",
    image: "/images/cities/tabriz.webp",
    description: "شهر اولین‌ها، بازار تاریخی ثبت یونسکو و خوراکی‌های اصیل",
  },
  GSM: {
    code: "GSM",
    name: "قشم",
    airport: "فرودگاه بین‌المللی دیرستان قشم",
    image: "/images/cities/qeshm.webp",
    description: "ژئوپارک جهانی، دره ستارگان و جاذبه‌های بکر طبیعی خلیج فارس",
  },
  AWZ: {
    code: "AWZ",
    name: "اهواز",
    airport: "فرودگاه بین‌المللی سپهبد شهید قاسم سلیمانی",
    image: "/images/cities/ahvaz.webp",
    description: "شهر پل‌های کارون و فلافل‌های لشکرآباد با خونگرمی مردمان جنوب",
  },
  BND: {
    code: "BND",
    name: "بندرعباس",
    airport: "فرودگاه بین‌المللی بندرعباس",
    image: "/images/cities/bandarabbas.webp",
    description: "بزرگ‌ترین بندر تجاری کشور در سواحل نیلگون تنگه هرمز",
  },
  DXB: {
    code: "DXB",
    name: "دبی",
    airport: "فرودگاه بین‌المللی دبی",
    image: "/images/cities/dubai.webp",
    description: "مرکز تجاری و تفریحی لوکس بین‌المللی",
  },
  IST: {
    code: "IST",
    name: "استانبول",
    airport: "فرودگاه جدید استانبول",
    image: "/images/cities/istanbul.webp",
    description: "تلاقی دو قاره با تاریخ شکوهمند و مراکز خرید بزرگ",
  },
  NJF: {
    code: "NJF",
    name: "نجف",
    airport: "فرودگاه بین‌المللی نجف اشرف",
    image: "/images/cities/najaf.webp",
    description: "مقصد معنوی و زیارتی ویژه",
  },
};

const AIRLINES = [
  { name: "ماهان ایر", code: "W5", logo: "/images/airlines/mahan.svg", baseMultiplier: 1.15 },
  {
    name: "ایران ایر (هما)",
    code: "IR",
    logo: "/images/airlines/iranair.svg",
    baseMultiplier: 1.1,
  },
  { name: "معراج", code: "JI", logo: "/images/airlines/meraj.svg", baseMultiplier: 1.05 },
  { name: "زاگرس", code: "ZV", logo: "/images/airlines/zagros.svg", baseMultiplier: 0.95 },
  { name: "کیش ایر", code: "Y9", logo: "/images/airlines/kishair.svg", baseMultiplier: 1.0 },
  { name: "آسمان", code: "EP", logo: "/images/airlines/aseman.svg", baseMultiplier: 0.92 },
  { name: "کاسپین", code: "IV", logo: "/images/airlines/caspian.svg", baseMultiplier: 0.9 },
  { name: "قشم ایر", code: "QB", logo: "/images/airlines/qeshmair.svg", baseMultiplier: 1.0 },
  { name: "فلای پرشیا", code: "FP", logo: "/images/airlines/flypersia.svg", baseMultiplier: 0.88 },
];

const AIRCRAFTS = [
  "Airbus A320",
  "Airbus A321",
  "Boeing 737-800",
  "Airbus A300-600",
  "McDonnell Douglas MD-82",
  "Fokker 100",
];

@Injectable()
export class MockFlightProvider extends FlightProvider {
  private flightsCache: Map<string, FlightDto> = new Map();

  constructor() {
    super();
    this.seedInitialFlights();
  }

  private seedInitialFlights(): void {
    // Generate a deterministically rich set of flights for the next 30 days
    const routes = [
      ["THR", "MHD"],
      ["MHD", "THR"],
      ["THR", "KIH"],
      ["KIH", "THR"],
      ["THR", "SYZ"],
      ["SYZ", "THR"],
      ["THR", "IFN"],
      ["IFN", "THR"],
      ["THR", "TBZ"],
      ["TBZ", "THR"],
      ["THR", "GSM"],
      ["GSM", "THR"],
      ["THR", "AWZ"],
      ["AWZ", "THR"],
      ["THR", "BND"],
      ["BND", "THR"],
      ["THR", "IST"],
      ["THR", "DXB"],
      ["THR", "NJF"],
    ];

    const today = new Date();
    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const flightDate = new Date(today);
      flightDate.setDate(today.getDate() + dayOffset);
      const dateStr = flightDate.toISOString().split("T")[0]!;

      for (const [orig, dest] of routes) {
        if (!orig || !dest) continue;
        // 3 to 6 flights per day per route
        const flightSlots = [
          { hour: 6, min: 30, num: 101 },
          { hour: 9, min: 15, num: 205 },
          { hour: 13, min: 45, num: 312 },
          { hour: 17, min: 20, num: 418 },
          { hour: 20, min: 50, num: 524 },
          { hour: 23, min: 10, num: 630 },
        ];

        flightSlots.forEach((slot, index) => {
          const airline = AIRLINES[(index + dayOffset) % AIRLINES.length]!;
          const flightId = `fl-${orig}-${dest}-${dateStr}-${slot.num}`;
          const originInfo = AIRPORTS[orig] ?? {
            code: orig,
            name: orig,
            airport: `فرودگاه ${orig}`,
            image: "",
            description: "",
          };
          const destInfo = AIRPORTS[dest] ?? {
            code: dest,
            name: dest,
            airport: `فرودگاه ${dest}`,
            image: "",
            description: "",
          };

          const depTime = new Date(flightDate);
          depTime.setHours(slot.hour, slot.min, 0, 0);

          const isInternational =
            ["IST", "DXB", "NJF"].includes(dest) || ["IST", "DXB", "NJF"].includes(orig);
          const durationMins = isInternational ? 180 : orig === "KIH" || dest === "KIH" ? 105 : 75;

          const arrTime = new Date(depTime.getTime() + durationMins * 60 * 1000);

          // Base price calculation (in Rials, e.g. 18,000,000 to 45,000,000 Rials for domestic)
          const routeBase = isInternational
            ? 95_000_000
            : orig === "KIH" || dest === "KIH"
              ? 24_000_000
              : 18_500_000;
          const dayFactor = 1 + Math.sin(dayOffset * 0.7) * 0.18;
          const slotFactor = slot.hour >= 8 && slot.hour <= 18 ? 1.1 : 0.9;
          const basePrice = Math.round(routeBase * airline.baseMultiplier * dayFactor * slotFactor);

          // Dynamic discount / deal
          const hasDiscount = (index + dayOffset) % 3 === 0;
          const discountPercent = hasDiscount ? 10 + ((index * 5) % 30) : 0;
          const finalPrice = Math.round(basePrice * (1 - discountPercent / 100));

          const flightClass: FlightClass =
            index === 1 && airline.code === "W5" ? "BUSINESS" : "ECONOMY";
          const flightType: FlightType = index % 2 === 0 ? "CHARTER" : "SYSTEMIC";
          const availableSeats = 4 + ((dayOffset * 7 + index * 3) % 25);

          // Price prediction logic
          let trend: PriceTrend = "STABLE";
          let advice: PriceAdvice = "BUY_NOW";
          let reasoning = "قیمت در کف نرخ هفتگی قرار دارد. پیشنهاد می‌شود هم‌اکنون خرید کنید.";

          if (discountPercent > 15) {
            trend = "FALLING";
            advice = "BUY_NOW";
            reasoning = `تخفیف ویژه ${discountPercent}٪ لحظه آخری فعال شده است. بهترین زمان خرید!`;
          } else if (dayOffset > 10 && dayFactor > 1.1) {
            trend = "RISING";
            advice = "BUY_NOW";
            reasoning = "به دلیل تقاضای بالای این تاریخ، پیش‌بینی می‌شود نرخ صعودی باشد.";
          } else if (dayOffset > 14) {
            trend = "STABLE";
            advice = "WAIT";
            reasoning = "ظرفیت بالاست و احتمال کاهش نرخ در روزهای نزدیک‌تر وجود دارد.";
          }

          const flight: FlightDto = {
            id: flightId,
            flightNumber: `${airline.code}-${slot.num + (dayOffset % 10)}`,
            airline: airline.name,
            airlineCode: airline.code,
            airlineLogo: airline.logo,
            origin: originInfo.name,
            originCode: originInfo.code,
            originAirport: originInfo.airport,
            destination: destInfo.name,
            destinationCode: destInfo.code,
            destinationAirport: destInfo.airport,
            departureTime: depTime.toISOString(),
            arrivalTime: arrTime.toISOString(),
            durationMinutes: durationMins,
            aircraft: AIRCRAFTS[(index + dayOffset) % AIRCRAFTS.length]!,
            flightClass,
            flightType,
            availableSeats,
            basePrice,
            finalPrice,
            baggageAllowanceKg: flightClass === "BUSINESS" ? 30 : 20,
            isRefundable: flightType === "SYSTEMIC",
            refundRules: [
              {
                timeBeforeDeparture: "تا ۲۴ ساعت قبل از پرواز",
                penaltyPercentage: 20,
                description: "کنسلی با ۲۰٪ جریمه امکان‌پذیر است",
              },
              {
                timeBeforeDeparture: "از ۲۴ تا ۳ ساعت قبل از پرواز",
                penaltyPercentage: 40,
                description: "کنسلی با ۴۰٪ جریمه امکان‌پذیر است",
              },
              {
                timeBeforeDeparture: "کمتر از ۳ ساعت تا پرواز (نوشو)",
                penaltyPercentage: 70,
                description: "جریمه عدم حضور ۷۰٪ محاسبه می‌شود",
              },
            ],
            pricePrediction: {
              trend,
              confidence: 85 + (index % 12),
              advice,
              reasoning,
            },
            features: [
              "پذیرایی رایگان",
              "امکان انتخاب آنلاین صندلی",
              flightClass === "BUSINESS" ? "سالن تشریفات اختصاصی (CIP)" : "صندلی استاندارد",
              "پشتیبانی ۲۴ ساعته",
            ],
          };

          this.flightsCache.set(flightId, flight);
        });
      }
    }
  }

  async searchFlights(query: FlightSearchQuery): Promise<FlightDto[]> {
    const all = Array.from(this.flightsCache.values());
    const queryDateStr = query.departureDate;

    const filtered = all.filter((f) => {
      const fDateStr = f.departureTime.split("T")[0];
      const matchOrigin = f.originCode === query.origin || f.origin.includes(query.origin);
      const matchDest =
        f.destinationCode === query.destination || f.destination.includes(query.destination);
      const matchDate = fDateStr === queryDateStr;

      if (!matchOrigin || !matchDest || !matchDate) return false;

      if (query.flightClass && f.flightClass !== query.flightClass) return false;
      if (query.isCharter !== undefined) {
        const isCharter = f.flightType === "CHARTER";
        if (isCharter !== query.isCharter) return false;
      }
      if (query.airline && !f.airline.includes(query.airline) && f.airlineCode !== query.airline) {
        return false;
      }
      if (query.maxPrice && f.finalPrice > query.maxPrice) return false;
      if (f.availableSeats < query.adults + query.children) return false;

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (query.sortBy) {
        case "price_asc":
          return a.finalPrice - b.finalPrice;
        case "price_desc":
          return b.finalPrice - a.finalPrice;
        case "departure_asc":
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        case "duration_asc":
          return a.durationMinutes - b.durationMinutes;
        default:
          return a.finalPrice - b.finalPrice;
      }
    });

    return filtered;
  }

  async getFlightById(id: string): Promise<FlightDto | null> {
    return this.flightsCache.get(id) ?? null;
  }

  async getFareMatrix(
    origin: string,
    destination: string,
    startDate: string,
    days: number,
  ): Promise<FareMatrixItemDto[]> {
    const matrix: FareMatrixItemDto[] = [];
    const baseDate = new Date(startDate);

    const lowestOverallPrice: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toISOString().split("T")[0]!;

      const flightsOnDay = Array.from(this.flightsCache.values()).filter(
        (f) =>
          (f.originCode === origin || f.origin.includes(origin)) &&
          (f.destinationCode === destination || f.destination.includes(destination)) &&
          f.departureTime.startsWith(dateStr),
      );

      const lowestPrice =
        flightsOnDay.length > 0 ? Math.min(...flightsOnDay.map((f) => f.finalPrice)) : 18_500_000;

      lowestOverallPrice.push(lowestPrice);
      matrix.push({
        date: dateStr,
        lowestPrice,
        isLowestInWeek: false,
        flightCount: flightsOnDay.length || 3,
      });
    }

    const minPrice = Math.min(...lowestOverallPrice);
    matrix.forEach((item) => {
      if (item.lowestPrice === minPrice) {
        item.isLowestInWeek = true;
      }
    });

    return matrix;
  }

  async getCheapDeals(): Promise<CheapDealDto[]> {
    const deals: CheapDealDto[] = [
      {
        id: "deal-1",
        flightId: "fl-THR-KIH-deal",
        origin: "تهران",
        originCode: "THR",
        destination: "کیش",
        destinationCode: "KIH",
        destinationImage: "/images/cities/kish.webp",
        departureDate: "فردا ۱۸:۳۰",
        airline: "کیش ایر",
        airlineLogo: "/images/airlines/kishair.svg",
        regularPrice: 28_000_000,
        dealPrice: 14_900_000,
        discountPercent: 47,
        badge: "آفر شگفت‌انگیز ۴۷٪",
        remainingSeats: 3,
      },
      {
        id: "deal-2",
        flightId: "fl-THR-MHD-deal",
        origin: "تهران",
        originCode: "THR",
        destination: "مشهد",
        destinationCode: "MHD",
        destinationImage: "/images/cities/mashhad.webp",
        departureDate: "پس‌فردا ۰۸:۱۵",
        airline: "فلای پرشیا",
        airlineLogo: "/images/airlines/flypersia.svg",
        regularPrice: 22_500_000,
        dealPrice: 13_800_000,
        discountPercent: 39,
        badge: "لحظه آخری چارتری",
        remainingSeats: 5,
      },
      {
        id: "deal-3",
        flightId: "fl-THR-SYZ-deal",
        origin: "تهران",
        originCode: "THR",
        destination: "شیراز",
        destinationCode: "SYZ",
        destinationImage: "/images/cities/shiraz.webp",
        departureDate: "۳ روز آینده ۱۲:۰۰",
        airline: "معراج",
        airlineLogo: "/images/airlines/meraj.svg",
        regularPrice: 24_000_000,
        dealPrice: 15_200_000,
        discountPercent: 37,
        badge: "ارزان‌ترین نرخ هفته",
        remainingSeats: 2,
      },
      {
        id: "deal-4",
        flightId: "fl-THR-GSM-deal",
        origin: "تهران",
        originCode: "THR",
        destination: "قشم",
        destinationCode: "GSM",
        destinationImage: "/images/cities/qeshm.webp",
        departureDate: "آخر هفته ۱۰:۴۵",
        airline: "قشم ایر",
        airlineLogo: "/images/airlines/qeshmair.svg",
        regularPrice: 26_500_000,
        dealPrice: 16_700_000,
        discountPercent: 37,
        badge: "تخفیف ویژه سفر جزیره",
        remainingSeats: 4,
      },
      {
        id: "deal-5",
        flightId: "fl-THR-TBZ-deal",
        origin: "تهران",
        originCode: "THR",
        destination: "تبریز",
        destinationCode: "TBZ",
        destinationImage: "/images/cities/tabriz.webp",
        departureDate: "۴ روز آینده ۱۹:۱۰",
        airline: "آسمان",
        airlineLogo: "/images/airlines/aseman.svg",
        regularPrice: 19_500_000,
        dealPrice: 12_400_000,
        discountPercent: 36,
        badge: "قیمت استثنایی",
        remainingSeats: 6,
      },
    ];

    return deals;
  }

  async getBudgetDestinations(origin: string, maxBudget: number): Promise<BudgetDestinationDto[]> {
    const list: BudgetDestinationDto[] = [];
    const targets = ["MHD", "KIH", "SYZ", "IFN", "TBZ", "GSM", "AWZ", "BND"];

    for (const code of targets) {
      if (code === origin) continue;
      const info = AIRPORTS[code];
      if (!info) continue;

      const flights = Array.from(this.flightsCache.values()).filter(
        (f) =>
          (f.originCode === origin || f.origin.includes(origin)) &&
          f.destinationCode === code &&
          f.finalPrice <= maxBudget,
      );

      if (flights.length > 0) {
        const lowestFlight = flights.reduce((prev, curr) =>
          curr.finalPrice < prev.finalPrice ? curr : prev,
        );

        list.push({
          destination: info.name,
          destinationCode: info.code,
          destinationImage: info.image,
          description: info.description,
          minPrice: lowestFlight.finalPrice,
          bestDate: lowestFlight.departureTime.split("T")[0]!,
          airline: lowestFlight.airline,
          availableFlightsCount: flights.length,
        });
      }
    }

    list.sort((a, b) => a.minPrice - b.minPrice);
    return list;
  }
}
