import { isFlightId, locationLabel, routeProblem } from "@flysmart/contracts";
import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    // A link such as Imam Khomeini to Mashhad is well-formed but has no flights: say why
    const from = (Array.isArray(params.origin) ? params.origin[0] : params.origin)?.toUpperCase();
    const to = (
      Array.isArray(params.destination) ? params.destination[0] : params.destination
    )?.toUpperCase();
    const problem = from && to && from !== to ? routeProblem(from, to) : null;
    return (
      <PageContainer>
        <PageHeader title="جست‌وجوی پرواز" description="مبدأ، مقصد و تاریخ را انتخاب کنید." />
        {problem && (
          <Alert>
            <InfoIcon />
            <AlertTitle>این مسیر پرواز مستقیم ندارد</AlertTitle>
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        )}
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
