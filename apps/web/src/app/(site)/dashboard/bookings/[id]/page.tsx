import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { BookingDetailView } from "@/features/bookings";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "جزئیات سفر" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="جزئیات سفر" />
      <BookingDetailView bookingId={id} />
    </div>
  );
}
