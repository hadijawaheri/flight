import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { BookingsList } from "@/features/bookings";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "سفرهای من" };

export default async function BookingsPage() {
  await requireSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="سفرهای من" />
      <BookingsList />
    </div>
  );
}
