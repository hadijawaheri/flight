import type {
  FlightTag,
  PriceAdvice,
  PriceTrend,
  PriceVerdict,
  TimeBucket,
} from "@flysmart/contracts";

export const VERDICT_LABELS: Record<PriceVerdict, string> = {
  VERY_LOW: "بسیار ارزان",
  LOW: "ارزان",
  FAIR: "معمولی",
  HIGH: "گران",
  VERY_HIGH: "بسیار گران",
};

export const TREND_LABELS: Record<PriceTrend, string> = {
  FALLING: "رو به کاهش",
  RISING: "رو به افزایش",
  STABLE: "ثابت",
};

export const ADVICE_LABELS: Record<PriceAdvice, string> = {
  BUY_NOW: "الان بخرید",
  WAIT: "صبر کنید",
};

export const TAG_LABELS: Record<FlightTag, string> = {
  CHEAPEST: "ارزان‌ترین",
  FASTEST: "سریع‌ترین",
  BEST_VALUE: "بهترین انتخاب",
};

export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  NIGHT: "بامداد (۰۰ تا ۶)",
  MORNING: "صبح (۶ تا ۱۲)",
  AFTERNOON: "بعدازظهر (۱۲ تا ۱۸)",
  EVENING: "عصر و شب (۱۸ تا ۲۴)",
};

export const FLIGHT_TYPE_LABELS = { SYSTEMIC: "سیستمی", CHARTER: "چارتری" } as const;

export const SORT_LABELS = {
  best: "پیشنهاد ما",
  price: "ارزان‌ترین",
  departure: "زودترین حرکت",
  duration: "کوتاه‌ترین مدت",
} as const;

export const CABIN_LABELS = { ECONOMY: "اکونومی", BUSINESS: "بیزینس" } as const;

export const PASSENGER_TYPE_LABELS = {
  ADULT: "بزرگسال",
  CHILD: "کودک (۲ تا ۱۱ سال)",
  INFANT: "نوزاد (زیر ۲ سال)",
} as const;

export const FARE_FAMILY_LABELS = {
  SAVER: "اقتصادی (Saver)",
  STANDARD: "استاندارد",
  FLEX: "انعطاف‌پذیر (Flex)",
} as const;
