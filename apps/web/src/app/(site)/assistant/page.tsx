import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AssistantPageView } from "@/features/assistant";

export const metadata: Metadata = {
  title: "دستیار پرواز",
  description: "از دستیار هوشمند درباره‌ی بار، مدارک، استرداد، قوانین فرودگاه و قیمت بلیت بپرسید.",
};

type PageProps = { searchParams: Promise<{ q?: string | string[]; booking?: string | string[] }> };

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function AssistantPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const question = first(params.q)?.slice(0, 1000);
  const booking = first(params.booking);

  return (
    <PageContainer>
      <PageHeader
        title="دستیار پرواز"
        description="درباره‌ی بار، مدارک، استرداد و قوانین فرودگاه بپرسید؛ پاسخ‌ها از پایگاه قوانین و با ذکر منبع می‌آیند."
      />
      <AssistantPageView
        {...(question ? { initialQuestion: question } : {})}
        {...(booking && /^[a-f0-9]{24}$/.test(booking) ? { bookingId: booking } : {})}
      />
    </PageContainer>
  );
}
