import { isFlightId, locationLabel } from "@flysmart/contracts";
import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { ResultsView } from "@/features/flights";
import type { RawParams } from "@/features/search";
import { parseTripQuery, SearchForm } from "@/features/search";
import { tehranToday } from "@/lib/format";
import { privatePage } from "@/lib/seo";

type PageProps = { searchParams: Promise<RawParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseTripQuery(await searchParams);
  return {
    title: query
      ? `پرواز ${locationLabel(query.origin)} به ${locationLabel(query.destination)}`
      : "جست‌وجوی پرواز",
    // Result pages are endless combinations of dates; only the landing page deserves indexing.
    ...privatePage,
  };
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseTripQuery(params);
  const today = tehranToday();

  if (!query) {
    return (
      <PageContainer>
        <PageHeader title="جست‌وجوی پرواز" description="مبدأ، مقصد و تاریخ را انتخاب کنید." />
        <Card className="p-5">
          <SearchForm today={today} />
        </Card>
      </PageContainer>
    );
  }

  const rawOut = Array.isArray(params.out) ? params.out[0] : params.out;
  const outboundId = query.returnDate && rawOut && isFlightId(rawOut) ? rawOut : null;

  return (
    <PageContainer>
      <ResultsView query={query} today={today} outboundId={outboundId} />
    </PageContainer>
  );
}
