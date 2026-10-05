import type { ReactNode } from "react";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { PageContainer } from "@/components/layout/page-container";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer className="lg:grid lg:grid-cols-[13rem_1fr] lg:items-start">
      <DashboardNav />
      <div className="min-w-0">{children}</div>
    </PageContainer>
  );
}
