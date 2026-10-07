"use client";

import type {
  RouteKind,
  TripBand,
  TripIdeaDto,
  TripPartyKey,
  TripScope,
} from "@flysmart/contracts";
import {
  ROUTE_KIND_LABELS,
  TRIP_PARTIES,
  TRIP_PARTY_KEYS,
  TRIP_SCOPES,
  tripBands,
} from "@flysmart/contracts";
import { ArrowLeftIcon, CompassIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AirportCombobox, allowedOrigins, DEFAULT_ORIGIN, retarget } from "@/features/search";
import {
  formatDuration,
  formatLongDate,
  formatMillionToman,
  formatNumber,
  formatTomanNumber,
} from "@/lib/format";
import { paths } from "@/lib/paths";

import { useTripIdeas } from "../queries";

const KIND_OF_SCOPE: Record<TripScope, RouteKind> = {
  domestic: "DOMESTIC",
  international: "INTERNATIONAL",
};

function bandRange(band: TripBand): string {
  if (band.maxToman === null) return `بیش از ${formatMillionToman(band.minToman)}`;
  if (band.minToman === 0) return `تا ${formatMillionToman(band.maxToman)}`;
  return `${formatMillionToman(band.minToman)} تا ${formatMillionToman(band.maxToman)}`;
}

/**
 * Ready-made trips for the way people really travel: alone, as a couple, as a family or with
 * friends, grouped by what the whole party would spend, so the budget question answers itself.
 */
export function TripIdeas() {
  const [party, setParty] = useState<TripPartyKey>("couple");
  const [scope, setScope] = useState<TripScope>("domestic");
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN.DOMESTIC);

  const kind = KIND_OF_SCOPE[scope];
  const spec = TRIP_PARTIES[party];
  const result = useTripIdeas({ origin, party, scope });

  function changeScope(next: TripScope) {
    setScope(next);
    setOrigin(retarget(KIND_OF_SCOPE[next], { origin, destination: "" }).origin);
  }

  const bands = tripBands(party, scope);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[auto_auto_minmax(0,1fr)] md:items-start">
        <Field>
          <FieldLabel id="trip-party-label">برای چند نفر؟</FieldLabel>
          <ToggleGroup
            type="single"
            value={party}
            onValueChange={(value) => value && setParty(value as TripPartyKey)}
            aria-labelledby="trip-party-label"
            className="flex-wrap"
          >
            {TRIP_PARTY_KEYS.map((key) => (
              <ToggleGroupItem key={key} value={key}>
                {TRIP_PARTIES[key].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel id="trip-scope-label">نوع سفر</FieldLabel>
          <ToggleGroup
            type="single"
            value={scope}
            onValueChange={(value) => value && changeScope(value as TripScope)}
            aria-labelledby="trip-scope-label"
          >
            {TRIP_SCOPES.map((item) => (
              <ToggleGroupItem key={item} value={item}>
                {ROUTE_KIND_LABELS[KIND_OF_SCOPE[item]]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="trip-origin">از کجا؟</FieldLabel>
          <AirportCombobox
            id="trip-origin"
            value={origin}
            onChange={setOrigin}
            placeholder="مبدأ"
            allowed={allowedOrigins(kind, "")}
          />
        </Field>
      </div>

      <p className="text-muted-foreground text-sm">
        {spec.description}؛ قیمت‌ها جمع کل بلیت همه‌ی مسافران است، با مالیات و کارمزد، برای
        ارزان‌ترین روز ۳۰ روز آینده.
      </p>

      {result.isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="در حال بارگذاری سفرها"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : result.isError ? (
        <ErrorState
          error={result.error}
          onRetry={() => void result.refetch()}
          title="سفرها دریافت نشد"
        />
      ) : result.data.ideas.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CompassIcon />
            </EmptyMedia>
            <EmptyTitle>سفری پیدا نشد</EmptyTitle>
            <EmptyDescription>
              {result.data.note ?? "برای این مبدأ و تعداد مسافر پرواز مناسبی در ۳۰ روز آینده نیست."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {bands.map((band) => {
            const ideas = result.data.ideas.filter((idea) => idea.band === band.id);
            if (ideas.length === 0) return null;
            return (
              <section
                key={band.id}
                aria-labelledby={`band-${band.id}`}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 id={`band-${band.id}`} className="text-xl font-extrabold">
                    {band.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {bandRange(band)} · {formatNumber(ideas.length)} مقصد
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
                  {ideas.map((idea) => (
                    <li key={idea.flightId}>
                      <TripIdeaCard
                        idea={idea}
                        party={{
                          adults: result.data.adults,
                          children: result.data.children,
                          infants: result.data.infants,
                        }}
                        showPerPerson={result.data.adults + result.data.children > 1}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TripIdeaCard({
  idea,
  party,
  showPerPerson,
}: {
  idea: TripIdeaDto;
  party: { adults: number; children: number; infants: number };
  showPerPerson: boolean;
}) {
  const query = new URLSearchParams({
    adults: String(party.adults),
    children: String(party.children),
    infants: String(party.infants),
  });
  return (
    <Link
      href={`${paths.flight(idea.flightId)}?${query.toString()}`}
      className="bg-secondary hover:bg-accent focus-visible:ring-ring/50 group flex h-full flex-col gap-3 rounded-2xl p-4 transition-colors duration-200 outline-none focus-visible:ring-3"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-base font-bold">
          {idea.cityFa}
          <ArrowLeftIcon
            className="text-muted-foreground size-3.5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </span>
        {idea.international && <Badge variant="outline">{idea.countryFa}</Badge>}
      </div>
      <p className="text-muted-foreground text-xs">
        {formatLongDate(idea.date)} · {idea.airline.nameFa} · {formatDuration(idea.durationMinutes)}
      </p>
      <div className="mt-auto flex items-baseline justify-between gap-2">
        <Toman rial={idea.totalForParty} className="text-lg" />
        {showPerPerson && (
          <span className="text-muted-foreground tnum text-xs">
            نفری {formatTomanNumber(idea.perPerson)}
          </span>
        )}
      </div>
    </Link>
  );
}
