import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ExploreView } from "@/features/deals";

export const metadata: Metadata = {
  title: "کجا بروم؟",
  description: "بودجه‌تان را بنویسید تا ارزان‌ترین مقصدهای ماه آینده را ببینید.",
};

export default function ExplorePage() {
  return (
    <PageContainer>
      <PageHeader
        title="کجا بروم؟"
        description="مقصد مهم نیست، بودجه مهم است؛ ارزان‌ترین مقصدهای ۳۰ روز آینده را ببینید."
      />
      <ExploreView />
    </PageContainer>
  );
}
