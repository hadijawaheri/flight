"use client";

import {
  ArrowLeftRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { normalizeDateParam } from "@/lib/format";
import { paths } from "@/lib/paths";

const POPULAR_AIRPORTS = [
  { code: "THR", name: "تهران (THR)" },
  { code: "MHD", name: "مشهد (MHD)" },
  { code: "KIH", name: "کیش (KIH)" },
  { code: "SYZ", name: "شیراز (SYZ)" },
  { code: "IFN", name: "اصفهان (IFN)" },
  { code: "TBZ", name: "تبریز (TBZ)" },
  { code: "GSM", name: "قشم (GSM)" },
  { code: "AWZ", name: "اهواز (AWZ)" },
  { code: "BND", name: "بندرعباس (BND)" },
  { code: "IST", name: "استانبول (IST)" },
  { code: "DXB", name: "دبی (DXB)" },
  { code: "NJF", name: "نجف (NJF)" },
];

interface FlightSearchBoxProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialDate?: string;
  compact?: boolean;
}

export function FlightSearchBox({
  initialOrigin = "THR",
  initialDestination = "MHD",
  initialDate,
  compact = false,
}: FlightSearchBoxProps) {
  const router = useRouter();

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0]!, []);
  const [tripType, setTripType] = React.useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");
  const [origin, setOrigin] = React.useState(initialOrigin);
  const [destination, setDestination] = React.useState(initialDestination);
  const [departureDate, setDepartureDate] = React.useState(
    normalizeDateParam(initialDate || todayStr),
  );
  const [returnDate, setReturnDate] = React.useState("");
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);
  const [flightClass, setFlightClass] = React.useState<"ECONOMY" | "BUSINESS">("ECONOMY");
  const [showPassengerDropdown, setShowPassengerDropdown] = React.useState(false);

  const handleSwapAirports = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      origin,
      destination,
      departureDate,
      adults: String(adults),
      children: String(children),
      flightClass,
    });
    if (tripType === "ROUND_TRIP" && returnDate) {
      params.set("returnDate", returnDate);
    }
    router.push(`${paths.flights}?${params.toString()}`);
  };

  return (
    <Card
      className={`bg-card/95 relative overflow-hidden border shadow-xl backdrop-blur-md ${compact ? "p-3" : "p-6"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        {/* Trip type buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTripType("ONE_WAY")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tripType === "ONE_WAY"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            یک‌طرفه
          </button>
          <button
            type="button"
            onClick={() => setTripType("ROUND_TRIP")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tripType === "ROUND_TRIP"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            رفت و برگشت
          </button>
        </div>

        {/* Value Tag */}
        <div className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
          <SparklesIcon className="size-3.5 text-amber-500" />
          <span>تضمین کمترین نرخ و پیشنهاد لحظه‌ای تخفیف‌ها</span>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Origin & Destination */}
          <div className="relative flex flex-col gap-1 sm:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Origin */}
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">مبدا پرواز</label>
                <div className="relative">
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="bg-background text-foreground focus:ring-primary h-11 w-full rounded-xl border px-3 text-sm font-semibold focus:ring-2 focus:outline-hidden"
                  >
                    {POPULAR_AIRPORTS.map((airport) => (
                      <option key={`orig-${airport.code}`} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination */}
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground text-xs font-medium">مقصد پرواز</label>
                <div className="relative">
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="bg-background text-foreground focus:ring-primary h-11 w-full rounded-xl border px-3 text-sm font-semibold focus:ring-2 focus:outline-hidden"
                  >
                    {POPULAR_AIRPORTS.map((airport) => (
                      <option key={`dest-${airport.code}`} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Swap button */}
            <button
              type="button"
              onClick={handleSwapAirports}
              title="جابجایی مبدا و مقصد"
              className="bg-background text-muted-foreground hover:text-foreground absolute top-7 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-md transition-all hover:scale-110 active:scale-95"
            >
              <ArrowLeftRightIcon className="size-3.5 rtl:rotate-180" />
            </button>
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">
              {tripType === "ROUND_TRIP" ? "تاریخ رفت و برگشت" : "تاریخ پرواز"}
            </label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex flex-1 items-center">
                <input
                  type="date"
                  value={departureDate}
                  min={todayStr}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="bg-background text-foreground focus:ring-primary h-11 w-full rounded-xl border px-3 text-sm font-semibold focus:ring-2 focus:outline-hidden"
                />
                <CalendarIcon className="text-muted-foreground pointer-events-none absolute end-3 size-4" />
              </div>
              {tripType === "ROUND_TRIP" && (
                <div className="relative flex flex-1 items-center">
                  <input
                    type="date"
                    value={returnDate}
                    min={departureDate || todayStr}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="bg-background text-foreground focus:ring-primary h-11 w-full rounded-xl border px-3 text-sm font-semibold focus:ring-2 focus:outline-hidden"
                  />
                  <CalendarIcon className="text-muted-foreground pointer-events-none absolute end-3 size-4" />
                </div>
              )}
            </div>
          </div>

          {/* Passengers & Class */}
          <div className="relative flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">مسافران و کلاس</label>
            <button
              type="button"
              onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
              className="bg-background text-foreground focus:ring-primary flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold focus:ring-2 focus:outline-hidden"
            >
              <div className="flex items-center gap-2">
                <UsersIcon className="text-muted-foreground size-4" />
                <span>
                  {adults + children} مسافر، {flightClass === "BUSINESS" ? "بیزینس" : "اکونومی"}
                </span>
              </div>
              <ChevronDownIcon className="text-muted-foreground size-4" />
            </button>

            {/* Passenger Selector Popup */}
            {showPassengerDropdown && (
              <div className="bg-card absolute end-0 top-full z-30 mt-2 flex w-72 flex-col gap-3 rounded-2xl border p-4 shadow-2xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">بزرگسال (۱۲+ سال)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={adults <= 1}
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="flex size-7 items-center justify-center rounded-lg border disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold">{adults}</span>
                    <button
                      type="button"
                      disabled={adults >= 9}
                      onClick={() => setAdults(adults + 1)}
                      className="flex size-7 items-center justify-center rounded-lg border disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">کودک (۲ تا ۱۲ سال)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={children <= 0}
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="flex size-7 items-center justify-center rounded-lg border disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold">{children}</span>
                    <button
                      type="button"
                      disabled={children >= 8}
                      onClick={() => setChildren(children + 1)}
                      className="flex size-7 items-center justify-center rounded-lg border disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-2">
                  <span className="text-muted-foreground text-xs font-medium">کلاس پروازی</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFlightClass("ECONOMY")}
                      className={`rounded-lg border py-1.5 text-xs font-semibold ${
                        flightClass === "ECONOMY"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted"
                      }`}
                    >
                      اکونومی
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlightClass("BUSINESS")}
                      className={`rounded-lg border py-1.5 text-xs font-semibold ${
                        flightClass === "BUSINESS"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted"
                      }`}
                    >
                      بیزینس
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowPassengerDropdown(false)}
                  className="mt-1 w-full"
                >
                  تأیید
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          {/* Quick city suggestions */}
          <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
            <span>مسیرهای پرتردد:</span>
            {[
              { orig: "THR", dest: "MHD", label: "تهران - مشهد" },
              { orig: "THR", dest: "KIH", label: "تهران - کیش" },
              { orig: "THR", dest: "SYZ", label: "تهران - شیراز" },
              { orig: "THR", dest: "GSM", label: "تهران - قشم" },
            ].map((route, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOrigin(route.orig);
                  setDestination(route.dest);
                }}
                className="bg-muted/60 hover:bg-muted hover:text-foreground rounded-lg px-2 py-1 transition-colors"
              >
                {route.label}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            size="lg"
            className="shadow-primary/20 w-full gap-2 px-8 font-bold shadow-md sm:w-auto"
          >
            <SearchIcon className="size-4" />
            <span>جستجوی پروازها</span>
          </Button>
        </div>
      </form>
    </Card>
  );
}
