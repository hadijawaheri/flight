import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { CheckoutPayView } from "@/features/bookings";
import { requireSession } from "@/lib/auth/dal";
import { privatePage } from "@/lib/seo";

export const metadata: Metadata = { title: "پرداخت", ...privatePage };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  return (
    <PageContainer>
      <CheckoutPayView bookingId={id} />
    </PageContainer>
  );
}
