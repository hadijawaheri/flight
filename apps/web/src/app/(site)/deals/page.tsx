import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FlashDeals } from "@/features/deals";
import { paths } from "@/lib/paths";

export const metadata: Metadata = {
  title: "پیشنهادهای ویژه",
  description: "پروازهایی که امروز قیمتشان از میانگین قیمت همان پرواز پایین‌تر است.",
};

export default function DealsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="پیشنهادهای ویژه"
        description="پروازهایی که قیمتشان نسبت به میانگین روزهای اخیر خودشان پایین‌تر است. قیمت خط‌خورده، قیمت معمول همان پرواز است."
        actions={
          <Button asChild variant="outline">
            <Link href={paths.explore}>بودجه دارم، مقصد نه</Link>
          </Button>
        }
      />
      <FlashDeals limit={24} />
    </PageContainer>
  );
}
