"use client";

import { addDaysIso, searchFlightsQuerySchema } from "@flysmart/contracts";
import type { Cabin } from "@flysmart/contracts";
import { ArrowLeftRightIcon, PlaneTakeoffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { type TripQuery, tripSearchParams } from "../trip-query";
import { AirportCombobox } from "./airport-combobox";
import { JalaliDatePicker } from "./jalali-date-picker";
import { type PassengerMix, PassengersPicker } from "./passengers-picker";

interface SearchFormProps {
  /** Today in Tehran, supplied by the server so first paint matches on every client. */
  today: string;
  initial?: TripQuery | null;
  className?: string;
}

const HORIZON_DAYS = 330;

/**
 * Validation reuses the API's own query schema, so the form can never accept a search the API
 * would reject. The fields are composite widgets, hence controlled state rather than RHF.
 */
export function SearchForm({ today, initial, className }: SearchFormProps) {
  const router = useRouter();
  const [roundTrip, setRoundTrip] = useState(Boolean(initial?.returnDate));
  const [origin, setOrigin] = useState(initial?.origin ?? "THR");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [date, setDate] = useState(initial?.date ?? addDaysIso(today, 7));
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? addDaysIso(today, 14));
  const [mix, setMix] = useState<PassengerMix>({
    adults: initial?.adults ?? 1,
    children: initial?.children ?? 0,
    infants: initial?.infants ?? 0,
  });
  const [cabin, setCabin] = useState<Cabin>(initial?.cabin ?? "ECONOMY");
  const [errors, setErrors] = useState<{
    origin?: string;
    destination?: string;
    date?: string;
    returnDate?: string;
  }>({});
  const [pending, setPending] = useState(false);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!origin) next.origin = "مبدأ را انتخاب کنید";
    if (!destination) next.destination = "مقصد را انتخاب کنید";
    if (origin && destination && origin === destination)
      next.destination = "مبدأ و مقصد نباید یکسان باشند";
    if (date < today) next.date = "تاریخ گذشته است";
    if (roundTrip && returnDate < date) next.returnDate = "برگشت باید بعد از رفت باشد";

    if (Object.keys(next).length === 0) {
      const parsed = searchFlightsQuerySchema.safeParse({
        origin,
        destination,
        date,
        ...mix,
        cabin,
      });
      if (!parsed.success)
        next.destination = parsed.error.issues[0]?.message ?? "جست‌وجو معتبر نیست";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    const query: TripQuery = {
      origin,
      destination,
      date,
      ...(roundTrip ? { returnDate } : {}),
      ...mix,
      cabin,
    };
    router.push(`${paths.flights}?${tripSearchParams(query).toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn("flex flex-col gap-4", className)}
      aria-label="جست‌وجوی پرواز"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={roundTrip ? "round" : "one"}
          onValueChange={(value) => value && setRoundTrip(value === "round")}
          aria-label="نوع سفر"
        >
          <ToggleGroupItem value="one">یک‌طرفه</ToggleGroupItem>
          <ToggleGroupItem value="round">رفت‌وبرگشت</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={cabin}
          onValueChange={(value) => value && setCabin(value as Cabin)}
          aria-label="کلاس پرواز"
        >
          <ToggleGroupItem value="ECONOMY">اکونومی</ToggleGroupItem>
          <ToggleGroupItem value="BUSINESS">بیزینس</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <Field data-invalid={Boolean(errors.origin)}>
          <FieldLabel htmlFor="search-origin">مبدأ</FieldLabel>
          <AirportCombobox
            id="search-origin"
            value={origin}
            onChange={setOrigin}
            placeholder="از کجا؟"
            invalid={Boolean(errors.origin)}
            exclude={destination}
          />
          {errors.origin && <FieldError>{errors.origin}</FieldError>}
        </Field>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={swap}
          aria-label="جابه‌جایی مبدأ و مقصد"
          className="group/swap mx-auto md:mt-6"
        >
          <ArrowLeftRightIcon className="transition-transform duration-300 ease-out group-active/swap:rotate-180" />
        </Button>
        <Field data-invalid={Boolean(errors.destination)}>
          <FieldLabel htmlFor="search-destination">مقصد</FieldLabel>
          <AirportCombobox
            id="search-destination"
            value={destination}
            onChange={setDestination}
            placeholder="به کجا؟"
            invalid={Boolean(errors.destination)}
            exclude={origin}
          />
          {errors.destination && <FieldError>{errors.destination}</FieldError>}
        </Field>
      </div>

      <div className={cn("grid gap-3", roundTrip ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <Field data-invalid={Boolean(errors.date)}>
          <FieldLabel htmlFor="search-date">تاریخ رفت</FieldLabel>
          <JalaliDatePicker
            id="search-date"
            value={date}
            min={today}
            max={addDaysIso(today, HORIZON_DAYS)}
            onChange={(next) => {
              setDate(next);
              if (returnDate < next) setReturnDate(next);
            }}
            invalid={Boolean(errors.date)}
          />
          {errors.date && <FieldError>{errors.date}</FieldError>}
        </Field>
        {roundTrip && (
          <Field data-invalid={Boolean(errors.returnDate)}>
            <FieldLabel htmlFor="search-return">تاریخ برگشت</FieldLabel>
            <JalaliDatePicker
              id="search-return"
              value={returnDate}
              min={date}
              max={addDaysIso(today, HORIZON_DAYS)}
              onChange={setReturnDate}
              invalid={Boolean(errors.returnDate)}
            />
            {errors.returnDate && <FieldError>{errors.returnDate}</FieldError>}
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="search-passengers">مسافران</FieldLabel>
          <PassengersPicker id="search-passengers" value={mix} onChange={setMix} />
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base sm:w-fit sm:px-8"
        disabled={pending}
      >
        {pending ? (
          <Spinner data-icon="inline-start" aria-label="در حال جست‌وجو" />
        ) : (
          <PlaneTakeoffIcon data-icon="inline-start" />
        )}
        جست‌وجوی پرواز
      </Button>
    </form>
  );
}
