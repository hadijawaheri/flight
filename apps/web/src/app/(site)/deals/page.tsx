import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FlashDeals, TripIdeas } from "@/features/deals";
import { paths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "پیشنهادهای ویژه",
  description:
    "سفرهای آماده برای یک نفر، دو نفر یا خانواده با بودجه‌های مختلف، و پروازهایی که امروز زیر قیمت معمول‌اند.",
};

export default function DealsPage() {
  return (
    <PageContainer className="gap-10">
      <PageHeader
        title="پیشنهادهای ویژه"
        description="سفر آماده برای تعداد مسافر و بودجه‌ی شما، و پروازهایی که امروز زیر قیمت معمول خودشان‌اند."
        actions={
          <Button asChild variant="outline">
            <Link href={paths.explore}>بودجه دارم، مقصد نه</Link>
          </Button>
        }
      />

      <section aria-labelledby="trips-title" className="flex flex-col gap-5">
        <h2 id="trips-title" className="text-2xl font-extrabold">
          سفر آماده برای شما
        </h2>
        <TripIdeas />
      </section>

      <section aria-labelledby="flash-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="flash-title" className="text-2xl font-extrabold">
            قیمت‌هایی که امروز زیر معمول‌اند
          </h2>
          <p className="text-muted-foreground text-sm">
            قیمت خط‌خورده، قیمت معمول همان پرواز در این فاصله تا حرکت است.
          </p>
        </div>
        <FlashDeals limit={12} />
      </section>
    </PageContainer>
  );
}
