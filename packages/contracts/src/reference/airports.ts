import { normalizeText } from "../common/digits";

export interface Airport {
  /** IATA code. */
  code: string;
  nameFa: string;
  nameEn: string;
  cityFa: string;
  cityEn: string;
  countryCode: string;
  countryFa: string;
  /** Has scheduled international service; kept in step with the route network (see reference.test). */
  international: boolean;
  /** Fixed UTC offset in minutes (no DST modelled; correct for every airport listed). */
  utcOffsetMinutes: number;
  lat: number;
  lon: number;
  /** Extra search terms (old names, abbreviations, neighbouring names). */
  aliases?: string[];
}

const IR = { countryCode: "IR", countryFa: "ایران", utcOffsetMinutes: 210 } as const;

export const AIRPORTS: readonly Airport[] = [
  {
    code: "THR",
    nameFa: "مهرآباد",
    nameEn: "Mehrabad",
    cityFa: "تهران",
    cityEn: "Tehran",
    ...IR,
    international: true,
    lat: 35.6892,
    lon: 51.3134,
    aliases: ["tehran", "mehrabad"],
  },
  {
    code: "IKA",
    nameFa: "امام خمینی",
    nameEn: "Imam Khomeini",
    cityFa: "تهران",
    cityEn: "Tehran",
    ...IR,
    international: true,
    lat: 35.4161,
    lon: 51.1522,
    aliases: ["tehran", "imam", "فرودگاه امام"],
  },
  {
    code: "MHD",
    nameFa: "شهید هاشمی‌نژاد",
    nameEn: "Hasheminejad",
    cityFa: "مشهد",
    cityEn: "Mashhad",
    ...IR,
    international: true,
    lat: 36.2352,
    lon: 59.641,
    aliases: ["mashhad"],
  },
  {
    code: "SYZ",
    nameFa: "شهید دستغیب",
    nameEn: "Shahid Dastgheib",
    cityFa: "شیراز",
    cityEn: "Shiraz",
    ...IR,
    international: true,
    lat: 29.5392,
    lon: 52.5898,
    aliases: ["shiraz"],
  },
  {
    code: "IFN",
    nameFa: "شهید بهشتی",
    nameEn: "Shahid Beheshti",
    cityFa: "اصفهان",
    cityEn: "Isfahan",
    ...IR,
    international: true,
    lat: 32.7508,
    lon: 51.8613,
    aliases: ["isfahan", "esfahan"],
  },
  {
    code: "TBZ",
    nameFa: "شهید مدنی",
    nameEn: "Shahid Madani",
    cityFa: "تبریز",
    cityEn: "Tabriz",
    ...IR,
    international: true,
    lat: 38.1339,
    lon: 46.235,
    aliases: ["tabriz"],
  },
  {
    code: "AWZ",
    nameFa: "اهواز",
    nameEn: "Ahvaz",
    cityFa: "اهواز",
    cityEn: "Ahvaz",
    ...IR,
    international: true,
    lat: 31.3374,
    lon: 48.762,
    aliases: ["ahwaz"],
  },
  {
    code: "KIH",
    nameFa: "کیش",
    nameEn: "Kish Island",
    cityFa: "کیش",
    cityEn: "Kish",
    ...IR,
    international: true,
    lat: 26.5262,
    lon: 53.9802,
    aliases: ["kish"],
  },
  {
    code: "GSM",
    nameFa: "قشم",
    nameEn: "Qeshm",
    cityFa: "قشم",
    cityEn: "Qeshm",
    ...IR,
    international: true,
    lat: 26.7545,
    lon: 55.9024,
    aliases: ["qeshm", "gheshm"],
  },
  {
    code: "BND",
    nameFa: "بندرعباس",
    nameEn: "Bandar Abbas",
    cityFa: "بندرعباس",
    cityEn: "Bandar Abbas",
    ...IR,
    international: true,
    lat: 27.2183,
    lon: 56.3778,
    aliases: ["bandar abbas"],
  },
  {
    code: "KER",
    nameFa: "کرمان",
    nameEn: "Kerman",
    cityFa: "کرمان",
    cityEn: "Kerman",
    ...IR,
    international: true,
    lat: 30.2744,
    lon: 56.9511,
  },
  {
    code: "RAS",
    nameFa: "سردار جنگل",
    nameEn: "Sardar Jangal",
    cityFa: "رشت",
    cityEn: "Rasht",
    ...IR,
    international: true,
    lat: 37.3233,
    lon: 49.6178,
    aliases: ["rasht"],
  },
  {
    code: "ZAH",
    nameFa: "زاهدان",
    nameEn: "Zahedan",
    cityFa: "زاهدان",
    cityEn: "Zahedan",
    ...IR,
    international: false,
    lat: 29.4757,
    lon: 60.9062,
  },
  {
    code: "OMH",
    nameFa: "ارومیه",
    nameEn: "Urmia",
    cityFa: "ارومیه",
    cityEn: "Urmia",
    ...IR,
    international: true,
    lat: 37.6681,
    lon: 45.0687,
    aliases: ["orumiyeh", "urmia"],
  },
  {
    code: "AZD",
    nameFa: "شهید صدوقی",
    nameEn: "Shahid Sadooghi",
    cityFa: "یزد",
    cityEn: "Yazd",
    ...IR,
    international: true,
    lat: 31.9049,
    lon: 54.2765,
    aliases: ["yazd"],
  },
  {
    code: "BUZ",
    nameFa: "بوشهر",
    nameEn: "Bushehr",
    cityFa: "بوشهر",
    cityEn: "Bushehr",
    ...IR,
    international: false,
    lat: 28.9484,
    lon: 50.8346,
  },
  {
    code: "KSH",
    nameFa: "شهید اشرفی اصفهانی",
    nameEn: "Shahid Ashrafi Esfahani",
    cityFa: "کرمانشاه",
    cityEn: "Kermanshah",
    ...IR,
    international: false,
    lat: 34.3459,
    lon: 47.1581,
    aliases: ["kermanshah"],
  },
  {
    code: "SRY",
    nameFa: "دشت ناز",
    nameEn: "Dasht-e Naz",
    cityFa: "ساری",
    cityEn: "Sari",
    ...IR,
    international: false,
    lat: 36.6358,
    lon: 53.1935,
    aliases: ["sari", "مازندران"],
  },
  {
    code: "ADU",
    nameFa: "اردبیل",
    nameEn: "Ardabil",
    cityFa: "اردبیل",
    cityEn: "Ardabil",
    ...IR,
    international: false,
    lat: 38.3257,
    lon: 48.4244,
  },
  {
    code: "HDM",
    nameFa: "همدان",
    nameEn: "Hamadan",
    cityFa: "همدان",
    cityEn: "Hamadan",
    ...IR,
    international: false,
    lat: 34.8692,
    lon: 48.5525,
  },
  {
    code: "ABD",
    nameFa: "آبادان",
    nameEn: "Abadan",
    cityFa: "آبادان",
    cityEn: "Abadan",
    ...IR,
    international: false,
    lat: 30.3711,
    lon: 48.2283,
  },
  {
    code: "ZBR",
    nameFa: "کنارک",
    nameEn: "Konarak",
    cityFa: "چابهار",
    cityEn: "Chabahar",
    ...IR,
    international: false,
    lat: 25.4434,
    lon: 60.3821,
    aliases: ["chabahar", "chahbahar"],
  },
  {
    code: "BJB",
    nameFa: "بجنورد",
    nameEn: "Bojnord",
    cityFa: "بجنورد",
    cityEn: "Bojnord",
    ...IR,
    international: false,
    lat: 37.493,
    lon: 57.3082,
  },
  {
    code: "GBT",
    nameFa: "گرگان",
    nameEn: "Gorgan",
    cityFa: "گرگان",
    cityEn: "Gorgan",
    ...IR,
    international: false,
    lat: 36.9094,
    lon: 54.4013,
  },
  {
    code: "SDG",
    nameFa: "سنندج",
    nameEn: "Sanandaj",
    cityFa: "سنندج",
    cityEn: "Sanandaj",
    ...IR,
    international: false,
    lat: 35.2459,
    lon: 47.0092,
  },
  {
    code: "KHD",
    nameFa: "خرم‌آباد",
    nameEn: "Khorramabad",
    cityFa: "خرم‌آباد",
    cityEn: "Khorramabad",
    ...IR,
    international: false,
    lat: 33.4354,
    lon: 48.2829,
  },
  {
    code: "BXR",
    nameFa: "بم",
    nameEn: "Bam",
    cityFa: "بم",
    cityEn: "Bam",
    ...IR,
    international: false,
    lat: 29.0843,
    lon: 58.4504,
  },
  {
    code: "RZR",
    nameFa: "رامسر",
    nameEn: "Ramsar",
    cityFa: "رامسر",
    cityEn: "Ramsar",
    ...IR,
    international: false,
    lat: 36.909,
    lon: 50.6796,
  },
  {
    code: "XBJ",
    nameFa: "بیرجند",
    nameEn: "Birjand",
    cityFa: "بیرجند",
    cityEn: "Birjand",
    ...IR,
    international: false,
    lat: 32.8981,
    lon: 59.2661,
  },
  {
    code: "JWN",
    nameFa: "زنجان",
    nameEn: "Zanjan",
    cityFa: "زنجان",
    cityEn: "Zanjan",
    ...IR,
    international: false,
    lat: 36.7737,
    lon: 48.3594,
  },
  {
    code: "LRR",
    nameFa: "لار",
    nameEn: "Lar",
    cityFa: "لار",
    cityEn: "Lar",
    ...IR,
    international: false,
    lat: 27.6747,
    lon: 54.3833,
  },
  {
    code: "AJK",
    nameFa: "اراک",
    nameEn: "Arak",
    cityFa: "اراک",
    cityEn: "Arak",
    ...IR,
    international: false,
    lat: 34.1381,
    lon: 49.8473,
  },
  {
    code: "IIL",
    nameFa: "ایلام",
    nameEn: "Ilam",
    cityFa: "ایلام",
    cityEn: "Ilam",
    ...IR,
    international: false,
    lat: 33.5866,
    lon: 46.4048,
  },
  {
    code: "DEF",
    nameFa: "دزفول",
    nameEn: "Dezful",
    cityFa: "دزفول",
    cityEn: "Dezful",
    ...IR,
    international: false,
    lat: 32.4344,
    lon: 48.3976,
  },
  {
    code: "BDH",
    nameFa: "بندر لنگه",
    nameEn: "Bandar Lengeh",
    cityFa: "بندر لنگه",
    cityEn: "Bandar Lengeh",
    ...IR,
    international: false,
    lat: 26.532,
    lon: 54.8248,
  },
  {
    code: "YES",
    nameFa: "یاسوج",
    nameEn: "Yasuj",
    cityFa: "یاسوج",
    cityEn: "Yasuj",
    ...IR,
    international: false,
    lat: 30.7005,
    lon: 51.5451,
  },
  {
    code: "IST",
    nameFa: "استانبول",
    nameEn: "Istanbul Airport",
    cityFa: "استانبول",
    cityEn: "Istanbul",
    countryCode: "TR",
    countryFa: "ترکیه",
    international: true,
    utcOffsetMinutes: 180,
    lat: 41.2753,
    lon: 28.7519,
    aliases: ["istanbul", "ترکیه"],
  },
  {
    code: "SAW",
    nameFa: "صبیحه گوکچن",
    nameEn: "Sabiha Gokcen",
    cityFa: "استانبول",
    cityEn: "Istanbul",
    countryCode: "TR",
    countryFa: "ترکیه",
    international: true,
    utcOffsetMinutes: 180,
    lat: 40.8986,
    lon: 29.3092,
    aliases: ["istanbul", "sabiha", "ترکیه"],
  },
  {
    code: "ESB",
    nameFa: "اسن‌بوغا",
    nameEn: "Esenboga",
    cityFa: "آنکارا",
    cityEn: "Ankara",
    countryCode: "TR",
    countryFa: "ترکیه",
    international: true,
    utcOffsetMinutes: 180,
    lat: 40.1281,
    lon: 32.9951,
    aliases: ["ankara", "ترکیه"],
  },
  {
    code: "DXB",
    nameFa: "دبی",
    nameEn: "Dubai International",
    cityFa: "دبی",
    cityEn: "Dubai",
    countryCode: "AE",
    countryFa: "امارات",
    international: true,
    utcOffsetMinutes: 240,
    lat: 25.2532,
    lon: 55.3657,
    aliases: ["dubai", "امارات"],
  },
  {
    code: "SHJ",
    nameFa: "شارجه",
    nameEn: "Sharjah",
    cityFa: "شارجه",
    cityEn: "Sharjah",
    countryCode: "AE",
    countryFa: "امارات",
    international: true,
    utcOffsetMinutes: 240,
    lat: 25.3286,
    lon: 55.5172,
    aliases: ["sharjah", "امارات"],
  },
  {
    code: "AUH",
    nameFa: "ابوظبی",
    nameEn: "Zayed International",
    cityFa: "ابوظبی",
    cityEn: "Abu Dhabi",
    countryCode: "AE",
    countryFa: "امارات",
    international: true,
    utcOffsetMinutes: 240,
    lat: 24.4331,
    lon: 54.6511,
    aliases: ["abu dhabi", "امارات"],
  },
  {
    code: "DOH",
    nameFa: "حمد",
    nameEn: "Hamad International",
    cityFa: "دوحه",
    cityEn: "Doha",
    countryCode: "QA",
    countryFa: "قطر",
    international: true,
    utcOffsetMinutes: 180,
    lat: 25.2731,
    lon: 51.6081,
    aliases: ["doha", "qatar"],
  },
  {
    code: "KWI",
    nameFa: "کویت",
    nameEn: "Kuwait International",
    cityFa: "کویت",
    cityEn: "Kuwait City",
    countryCode: "KW",
    countryFa: "کویت",
    international: true,
    utcOffsetMinutes: 180,
    lat: 29.2266,
    lon: 47.9689,
    aliases: ["kuwait"],
  },
  {
    code: "MCT",
    nameFa: "مسقط",
    nameEn: "Muscat International",
    cityFa: "مسقط",
    cityEn: "Muscat",
    countryCode: "OM",
    countryFa: "عمان",
    international: true,
    utcOffsetMinutes: 240,
    lat: 23.5933,
    lon: 58.2844,
    aliases: ["muscat", "oman"],
  },
  {
    code: "NJF",
    nameFa: "نجف",
    nameEn: "Al Najaf International",
    cityFa: "نجف",
    cityEn: "Najaf",
    countryCode: "IQ",
    countryFa: "عراق",
    international: true,
    utcOffsetMinutes: 180,
    lat: 31.99,
    lon: 44.4041,
    aliases: ["najaf", "عتبات"],
  },
  {
    code: "BGW",
    nameFa: "بغداد",
    nameEn: "Baghdad International",
    cityFa: "بغداد",
    cityEn: "Baghdad",
    countryCode: "IQ",
    countryFa: "عراق",
    international: true,
    utcOffsetMinutes: 180,
    lat: 33.2625,
    lon: 44.2346,
    aliases: ["baghdad", "عتبات"],
  },
  {
    code: "EVN",
    nameFa: "زوارتنوتس",
    nameEn: "Zvartnots",
    cityFa: "ایروان",
    cityEn: "Yerevan",
    countryCode: "AM",
    countryFa: "ارمنستان",
    international: true,
    utcOffsetMinutes: 240,
    lat: 40.1473,
    lon: 44.3959,
    aliases: ["yerevan", "erevan"],
  },
  {
    code: "TBS",
    nameFa: "تفلیس",
    nameEn: "Tbilisi International",
    cityFa: "تفلیس",
    cityEn: "Tbilisi",
    countryCode: "GE",
    countryFa: "گرجستان",
    international: true,
    utcOffsetMinutes: 240,
    lat: 41.6692,
    lon: 44.9547,
    aliases: ["tbilisi", "georgia"],
  },
  {
    code: "GYD",
    nameFa: "حیدر علی‌اف",
    nameEn: "Heydar Aliyev",
    cityFa: "باکو",
    cityEn: "Baku",
    countryCode: "AZ",
    countryFa: "آذربایجان",
    international: true,
    utcOffsetMinutes: 240,
    lat: 40.4675,
    lon: 50.0467,
    aliases: ["baku"],
  },
  {
    code: "JED",
    nameFa: "ملک عبدالعزیز",
    nameEn: "King Abdulaziz International",
    cityFa: "جده",
    cityEn: "Jeddah",
    countryCode: "SA",
    countryFa: "عربستان",
    international: true,
    utcOffsetMinutes: 180,
    lat: 21.6796,
    lon: 39.1565,
    aliases: ["jeddah", "jidda", "mecca", "makkah", "مکه", "عمره", "حج", "عربستان سعودی"],
  },
  {
    code: "MED",
    nameFa: "شاهزاده محمد بن عبدالعزیز",
    nameEn: "Prince Mohammad bin Abdulaziz",
    cityFa: "مدینه",
    cityEn: "Medina",
    countryCode: "SA",
    countryFa: "عربستان",
    international: true,
    utcOffsetMinutes: 180,
    lat: 24.5534,
    lon: 39.7051,
    aliases: ["medina", "madinah", "مدینه منوره", "عمره", "حج", "عربستان سعودی"],
  },
  {
    code: "SVO",
    nameFa: "شرمتیوو",
    nameEn: "Sheremetyevo",
    cityFa: "مسکو",
    cityEn: "Moscow",
    countryCode: "RU",
    countryFa: "روسیه",
    international: true,
    utcOffsetMinutes: 180,
    lat: 55.9726,
    lon: 37.4146,
    aliases: ["moscow", "sheremetyevo", "moskva"],
  },
  {
    code: "LED",
    nameFa: "پولکوو",
    nameEn: "Pulkovo",
    cityFa: "سن‌پترزبورگ",
    cityEn: "Saint Petersburg",
    countryCode: "RU",
    countryFa: "روسیه",
    international: true,
    utcOffsetMinutes: 180,
    lat: 59.8003,
    lon: 30.2625,
    aliases: [
      "st petersburg",
      "saint petersburg",
      "petersburg",
      "pulkovo",
      "peterburg",
      "پترزبورگ",
    ],
  },
];

/** City-level search groups: one search over several airports of the same city. */
export interface AirportGroup {
  code: string;
  nameFa: string;
  nameEn: string;
  airports: readonly string[];
}

export const AIRPORT_GROUPS: readonly AirportGroup[] = [
  {
    code: "TEH",
    nameFa: "تهران (همه فرودگاه‌ها)",
    nameEn: "Tehran (all airports)",
    airports: ["THR", "IKA"],
  },
];

const AIRPORT_BY_CODE = new Map(AIRPORTS.map((airport) => [airport.code, airport]));
const GROUP_BY_CODE = new Map(AIRPORT_GROUPS.map((group) => [group.code, group]));

export function getAirport(code: string): Airport | undefined {
  return AIRPORT_BY_CODE.get(code.toUpperCase());
}

export function requireAirport(code: string): Airport {
  const airport = getAirport(code);
  if (!airport) throw new Error(`Unknown airport ${code}`);
  return airport;
}

export function getAirportGroup(code: string): AirportGroup | undefined {
  return GROUP_BY_CODE.get(code.toUpperCase());
}

/** Expands a group code (TEH) to its airports; a plain airport code expands to itself. */
export function expandAirportCode(code: string): string[] {
  const group = getAirportGroup(code);
  if (group) return [...group.airports];
  return AIRPORT_BY_CODE.has(code.toUpperCase()) ? [code.toUpperCase()] : [];
}

export function isKnownLocationCode(code: string): boolean {
  return AIRPORT_BY_CODE.has(code.toUpperCase()) || GROUP_BY_CODE.has(code.toUpperCase());
}

export function locationLabel(code: string): string {
  const group = getAirportGroup(code);
  if (group) return group.nameFa;
  const airport = getAirport(code);
  return airport ? airport.cityFa : code;
}

export function isDomesticPair(a: Airport, b: Airport): boolean {
  return a.countryCode === "IR" && b.countryCode === "IR";
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Airport, b: Airport): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface AirportSearchHit {
  code: string;
  kind: "airport" | "group";
  label: string;
  sublabel: string;
  countryCode: string;
}

function haystack(airport: Airport): string {
  return normalizeText(
    [
      airport.code,
      airport.nameFa,
      airport.nameEn,
      airport.cityFa,
      airport.cityEn,
      airport.countryFa,
      ...(airport.aliases ?? []),
    ].join(" "),
  );
}

const HAYSTACKS = new Map(AIRPORTS.map((airport) => [airport.code, haystack(airport)]));

/**
 * Offline airport autocomplete: code prefix and city prefix rank first, then any substring.
 * Runs in the browser, no API call per keystroke.
 */
export function searchAirports(
  query: string,
  limit = 8,
  /** When given, only these airport codes (and groups that contain one) are offered. */
  allowed?: readonly string[],
): AirportSearchHit[] {
  const needle = normalizeText(query);
  const permitted = allowed ? new Set(allowed.map((code) => code.toUpperCase())) : null;
  const hits: Array<{ hit: AirportSearchHit; score: number }> = [];

  for (const group of AIRPORT_GROUPS) {
    if (permitted && !group.airports.some((code) => permitted.has(code))) continue;
    const text = normalizeText(`${group.code} ${group.nameFa} ${group.nameEn}`);
    if (needle === "" || text.includes(needle)) {
      hits.push({
        score: needle === "" ? 1 : 0,
        hit: {
          code: group.code,
          kind: "group",
          label: group.nameFa,
          sublabel: "همه‌ی فرودگاه‌های شهر",
          countryCode: "IR",
        },
      });
    }
  }

  for (const airport of AIRPORTS) {
    if (permitted && !permitted.has(airport.code)) continue;
    const text = HAYSTACKS.get(airport.code) ?? "";
    if (needle !== "" && !text.includes(needle)) continue;
    let score = 5;
    if (needle === "") score = airport.countryCode === "IR" && airport.international ? 2 : 6;
    else if (airport.code.toLowerCase() === needle) score = 0;
    else if (
      normalizeText(airport.cityFa).startsWith(needle) ||
      normalizeText(airport.cityEn).startsWith(needle)
    )
      score = 1;
    else if (airport.code.toLowerCase().startsWith(needle)) score = 2;
    else if (text.startsWith(needle)) score = 3;
    hits.push({
      score,
      hit: {
        code: airport.code,
        kind: "airport",
        label:
          airport.nameFa === airport.cityFa
            ? airport.cityFa
            : `${airport.cityFa} (${airport.nameFa})`,
        sublabel: `${airport.code} · ${airport.countryFa}`,
        countryCode: airport.countryCode,
      },
    });
  }

  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.hit);
}
