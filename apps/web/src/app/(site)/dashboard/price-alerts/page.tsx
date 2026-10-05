import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { PriceAlertsManager } from "@/features/price-alerts";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "هشدار قیمت" };

export default async function PriceAlertsPage() {
  await requireSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="هشدار قیمت"
        description="وقتی ارزان‌ترین پرواز یک مسیر به قیمت دلخواه شما برسد خبر می‌دهیم."
      />
      <PriceAlertsManager />
    </div>
  );
}
