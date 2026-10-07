import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FlashDeals } from "@/features/deals";
import { paths } from "@/lib/paths";

import { JourneyColumn, JourneyPanel } from "./journey-panel";

export function DealsSection() {
  return (
    <section aria-labelledby="deals-title" className="reveal py-6">
      <JourneyColumn>
        <JourneyPanel className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="deals-title" className="text-2xl font-extrabold md:text-3xl">
                قیمت‌هایی که امروز زیر معمول‌اند
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                پروازهایی از تهران که از میانگین قیمت خودشان ارزان‌ترند.
              </p>
            </div>
            <Button asChild variant="ghost">
              <Link href={paths.deals}>همه‌ی پیشنهادها</Link>
            </Button>
          </div>
          <FlashDeals limit={4} />
        </JourneyPanel>
      </JourneyColumn>
    </section>
  );
}
