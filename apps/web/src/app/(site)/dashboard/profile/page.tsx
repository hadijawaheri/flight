import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/features/users";
import { requireSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "پروفایل" };

export default async function ProfilePage() {
  const user = await requireSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="پروفایل" />
      <ProfileForm user={user} />
    </div>
  );
}
