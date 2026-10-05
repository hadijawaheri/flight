import { flightQuoteQuerySchema, isFlightId } from "@flysmart/contracts";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { CheckoutNewView } from "@/features/bookings";
import { requireSession } from "@/lib/auth/dal";
import { paths } from "@/lib/paths";
import { privatePage } from "@/lib/seo";

export const metadata: Metadata = { title: "اطلاعات مسافران", ...privatePage };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function NewCheckoutPage({ searchParams }: PageProps) {
  const user = await requireSession();
  const query = await searchParams;

  const outbound = first(query.outbound);
  const returnId = first(query.return);
  const mix = flightQuoteQuerySchema.safeParse({
    adults: first(query.adults),
    children: first(query.children),
    infants: first(query.infants),
  });
  // A link that lost its flight cannot be repaired here; the search is the right place to start over.
  if (!outbound || !isFlightId(outbound) || (returnId && !isFlightId(returnId)) || !mix.success)
    redirect(paths.home);

  return (
    <PageContainer>
      <PageHeader
        title="اطلاعات مسافران"
        description="مشخصات را مطابق مدرک سفر وارد کنید؛ بعد از ثبت، ۱۵ دقیقه فرصت پرداخت دارید."
      />
      <CheckoutNewView
        outboundId={outbound}
        returnId={returnId ?? null}
        mix={mix.data}
        mobile={user.mobile}
      />
    </PageContainer>
  );
}
