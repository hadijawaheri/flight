import {
  flightQuoteQuerySchema,
  isFlightId,
  locationLabel,
  parseFlightId,
} from "@flysmart/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { FlightDetailView } from "@/features/flights";
import { parseTripQuery } from "@/features/search";
import type { RawParams } from "@/features/search";
import { privatePage } from "@/lib/seo";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const key = parseFlightId((await params).id);
  return {
    title: key
      ? `پرواز ${locationLabel(key.origin)} به ${locationLabel(key.destination)}`
      : "پرواز",
    ...privatePage,
  };
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function FlightDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  if (!isFlightId(id)) notFound();

  const query = await searchParams;
  const party = flightQuoteQuerySchema.safeParse({
    adults: first(query.adults),
    children: first(query.children),
    infants: first(query.infants),
  });
  const trip = parseTripQuery(query);
  const rawOut = first(query.out);

  return (
    <PageContainer>
      <FlightDetailView
        flightId={id}
        trip={trip}
        party={party.success ? party.data : { adults: 1, children: 0, infants: 0 }}
        outboundId={rawOut && isFlightId(rawOut) ? rawOut : null}
      />
    </PageContainer>
  );
}
