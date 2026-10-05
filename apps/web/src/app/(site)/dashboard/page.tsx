import type { Metadata } from "next";

import { DashboardOverview } from "@/features/dashboard";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "حساب من" };

export default async function DashboardPage() {
  const user = await requireSession();
  return <DashboardOverview user={user} />;
}
