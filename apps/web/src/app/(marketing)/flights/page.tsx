"use client";

import type { FlightDto, FlightSearchQuery, FlightSortOption } from "@flysmart/contracts";
import { ChevronDownIcon, PlaneIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCreateBooking } from "@/features/bookings/queries";
import { FareMatrixBar } from "@/features/flights/components/fare-matrix-bar";
import { FlightCard } from "@/features/flights/components/flight-card";
import { FlightSearchBox } from "@/features/flights/components/flight-search-box";
import { PriceAlertDialog } from "@/features/flights/components/price-alert-dialog";
import { useFareMatrix, useFlightSearch } from "@/features/flights/queries";
import { addDays, daysDiff } from "@/lib/format";
import { paths } from "@/lib/paths";

const AIRPORT_NAMES: Record<string, string> = {
  THR: "تهران",
  MHD: "مشهد",
  KIH: "کیش",
  SYZ: "شیراز",
  IFN: "اصفهان",
  TBZ: "تبریز",
  GSM: "قشم",
  AWZ: "اهواز",
  BND: "بندرعباس",
  IST: "استانبول",
  DXB: "دبی",
  NJF: "نجف",
};

function FlightsSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0]!, []);
  const origin = searchParams.get("origin") || "THR";
  const destination = searchParams.get("destination") || "MHD";
  const originName = AIRPORT_NAMES[origin] || origin;
  const destinationName = AIRPORT_NAMES[destination] || destination;
  const departureDate = searchParams.get("departureDate") || todayStr;
  const adults = Number(searchParams.get("adults") || "1");
  const children = Number(searchParams.get("children") || "0");
  const flightClassParam = searchParams.get("flightClass") as "ECONOMY" | "BUSINESS" | null;

  // Local filter states
  const [filterType, setFilterType] = React.useState<"ALL" | "CHARTER" | "SYSTEMIC">("ALL");
  const [sortBy, setSortBy] = React.useState<FlightSortOption>("price_asc");
  const [selectedAirline, setSelectedAirline] = React.useState<string>("ALL");
  const [showEditSearch, setShowEditSearch] = React.useState(false);

  const query: FlightSearchQuery = React.useMemo(
    () => ({
      origin,
      destination,
      departureDate,
      adults,
      children,
      infants: 0,
      flightClass: flightClassParam ?? undefined,
      isCharter: filterType === "ALL" ? undefined : filterType === "CHARTER",
      airline: selectedAirline === "ALL" ? undefined : selectedAirline,
      sortBy,
    }),
    [
      origin,
      destination,
      departureDate,
      adults,
      children,
      flightClassParam,
      filterType,
      selectedAirline,
      sortBy,
    ],
  );

  const { data: flights, isLoading: isFlightsLoading } = useFlightSearch(query);

  // Smart window calculation: keep selectedDate comfortably in the 7-day matrix
  // so the user can always see days before (up to 3 days back) and days after!
  const matrixStartDate = React.useMemo(() => {
    const diff = daysDiff(departureDate, todayStr);
    if (diff <= 2) {
      return todayStr;
    }
    const target = addDays(departureDate, -3);
    return target < todayStr ? todayStr : target;
  }, [departureDate, todayStr]);

  const { data: fareMatrix, isLoading: isMatrixLoading } = useFareMatrix({
    origin,
    destination,
    startDate: matrixStartDate,
    days: 7,
  });

  const createBookingMutation = useCreateBooking();

  const handleDateChange = (newDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("departureDate", newDate);
    router.push(`${paths.flights}?${params.toString()}`);
  };

  const handleSelectFlight = (flight: FlightDto) => {
    // Generate default passenger placeholders for checkout (adults + children)
    const adultPassengers = Array.from({ length: Math.max(1, adults) }).map((_, idx) => ({
      firstNameFa: "مسافر",
      lastNameFa: `بزرگسال ${idx + 1}`,
      firstNameEn: "Passenger",
      lastNameEn: `Adult ${idx + 1}`,
      nationalId: "0499370899", // verified placeholder for quick start
      birthDate: "1990-01-01",
      gender: "MALE" as const,
      passengerType: "ADULT" as const,
      seatPreference: "ANY" as const,
    }));

    const childPassengers = Array.from({ length: Math.max(0, children) }).map((_, idx) => ({
      firstNameFa: "مسافر",
      lastNameFa: `کودک ${idx + 1}`,
      firstNameEn: "Passenger",
      lastNameEn: `Child ${idx + 1}`,
      nationalId: "0499370899",
      birthDate: "2018-01-01",
      gender: "MALE" as const,
      passengerType: "CHILD" as const,
      seatPreference: "ANY" as const,
    }));

    createBookingMutation.mutate(
      {
        flightId: flight.id,
        passengers: [...adultPassengers, ...childPassengers],
        contactMobile: "09123456789",
        savePassengersToVault: false,
      },
      {
        onSuccess: (booking) => {
          router.push(paths.checkout(booking.id));
        },
        onError: () => {
          toast.error("خطا در ایجاد رزرو موقت پرواز. لطفا مجددا تلاش کنید.");
        },
      },
    );
  };

  const lowestPrice =
    flights && flights.length > 0 ? Math.min(...flights.map((f) => f.finalPrice)) : 18500000;

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Top Search Summary & Change Search Toggle */}
      <Card className="bg-card/80 border p-4 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <PlaneIcon className="size-5 rtl:rotate-180" />
            </div>
            <div className="flex flex-col">
              <div className="font-heading text-foreground flex items-center gap-2 text-lg font-bold">
                <span>{originName}</span>
                <span className="text-muted-foreground">←</span>
                <span>{destinationName}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  ({origin} به {destination})
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                تاریخ پرواز:{" "}
                {new Date(departureDate).toLocaleDateString("fa-IR", { dateStyle: "full" })} •{" "}
                {adults} مسافر
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PriceAlertDialog
              originCode={origin}
              originName={originName}
              destinationCode={destination}
              destinationName={destinationName}
              currentLowestPrice={lowestPrice}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditSearch(!showEditSearch)}
              className="gap-1 text-xs"
            >
              <span>{showEditSearch ? "بستن جستجو" : "تغییر جستجو"}</span>
              <ChevronDownIcon
                className={`size-3.5 transition-transform ${showEditSearch ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        </div>

        {showEditSearch && (
          <div className="mt-4 border-t pt-4">
            <FlightSearchBox
              initialOrigin={origin}
              initialDestination={destination}
              initialDate={departureDate}
              compact
            />
          </div>
        )}
      </Card>

      {/* 7-Day Fare Matrix Bar */}
      <FareMatrixBar
        items={fareMatrix || []}
        selectedDate={departureDate}
        minDate={todayStr}
        onSelectDate={handleDateChange}
        isLoading={isMatrixLoading}
      />

      {/* Main Content Layout: Sidebar Filters + Flight Results */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Filters Sidebar (cols: 3) */}
        <aside className="flex flex-col gap-4 lg:col-span-3">
          <Card className="flex flex-col gap-4 border p-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <SlidersHorizontalIcon className="text-primary size-4" />
                <span>فیلترهای نتایج</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterType("ALL");
                  setSelectedAirline("ALL");
                  setSortBy("price_asc");
                }}
                className="text-primary text-xs hover:underline"
              >
                پاک کردن
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-foreground text-xs font-semibold">نوع پرواز:</span>
              <div className="bg-muted grid grid-cols-3 gap-1 rounded-xl p-1 text-xs">
                {(["ALL", "CHARTER", "SYSTEMIC"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`rounded-lg py-1.5 font-medium transition-all ${
                      filterType === t
                        ? "bg-background text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "ALL" ? "همه" : t === "CHARTER" ? "چارتری" : "سیستمی"}
                  </button>
                ))}
              </div>
            </div>

            {/* Airline Filter */}
            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="text-foreground text-xs font-semibold">شرکت هواپیمایی:</span>
              <select
                value={selectedAirline}
                onChange={(e) => setSelectedAirline(e.target.value)}
                className="bg-background text-foreground focus:ring-primary h-9 w-full rounded-xl border px-3 text-xs font-medium focus:ring-2 focus:outline-hidden"
              >
                <option value="ALL">همه ایرلاین‌ها</option>
                <option value="ماهان">ماهان ایر</option>
                <option value="ایران ایر">ایران ایر (هما)</option>
                <option value="معراج">معراج</option>
                <option value="زاگرس">زاگرس</option>
                <option value="کیش ایر">کیش ایر</option>
                <option value="آسمان">آسمان</option>
                <option value="قشم ایر">قشم ایر</option>
                <option value="فلای پرشیا">فلای پرشیا</option>
              </select>
            </div>
          </Card>
        </aside>

        {/* Flight Results List (cols: 9) */}
        <div className="flex flex-col gap-4 lg:col-span-9">
          {/* Sorting Header */}
          <div className="bg-card/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-xs">
            <span className="text-muted-foreground">
              {flights ? `${flights.length} پرواز یافت شد` : "در حال جستجو..."}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">مرتب‌سازی بر اساس:</span>
              <div className="flex items-center gap-1">
                {[
                  { id: "price_asc", label: "ارزان‌ترین" },
                  { id: "departure_asc", label: "زودترین" },
                  { id: "duration_asc", label: "کوتاه‌ترین زمان" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id as FlightSortOption)}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      sortBy === s.id
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Feed */}
          {isFlightsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-muted h-40 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : flights && flights.length > 0 ? (
            <div className="flex flex-col gap-3">
              {flights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  onSelect={handleSelectFlight}
                  isSelecting={createBookingMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
              <PlaneIcon className="text-muted-foreground/50 size-12" />
              <h3 className="font-heading text-foreground text-lg font-bold">
                پروازی با این مشخصات یافت نشد
              </h3>
              <p className="text-muted-foreground max-w-sm text-xs">
                می‌توانید فیلترهای اعمال‌شده را تغییر دهید یا روزهای دیگر در تقویم بالا را بررسی
                نمایید.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterType("ALL");
                  setSelectedAirline("ALL");
                }}
              >
                پاک کردن فیلترها
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlightsSearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="text-muted-foreground container mx-auto px-4 py-20 text-center">
          <div className="border-primary inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent align-[-0.125em]" />
          <p className="mt-4 font-medium">در حال بارگذاری نتایج پروازها...</p>
        </div>
      }
    >
      <FlightsSearchContent />
    </React.Suspense>
  );
}
