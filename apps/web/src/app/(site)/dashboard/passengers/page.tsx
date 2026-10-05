import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { PassengersManager } from "@/features/passengers";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "مسافران من" };

export default async function PassengersPage() {
  await requireSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مسافران من"
        description="مشخصات خود و همسفران را یک‌بار ذخیره کنید تا خرید بعدی سریع‌تر شود."
      />
      <PassengersManager />
    </div>
  );
}
