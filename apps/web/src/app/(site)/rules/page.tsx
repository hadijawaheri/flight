import { listRulesQuerySchema } from "@flysmart/contracts";
import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { RulesBrowser } from "@/features/rules";
import { fetchRules } from "@/features/rules/api";

export const metadata: Metadata = {
  title: "قوانین پرواز و فرودگاه",
  description: "بار مجاز، اقلام ممنوعه، مدارک سفر، استرداد بلیت و حقوق مسافر؛ همه با برچسب اعتبار.",
};

type PageProps = { searchParams: Promise<{ category?: string | string[]; q?: string | string[] }> };

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function RulesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  // Invalid filters fall back to the full list instead of an error page.
  const parsed = listRulesQuerySchema.safeParse({ category: first(raw.category), q: first(raw.q) });
  const query = parsed.success ? parsed.data : {};
  const index = await fetchRules(query);

  return (
    <PageContainer>
      <PageHeader
        title="قوانین پرواز و فرودگاه"
        description="هر قانون برچسب اعتبار دارد: عمومی، وابسته به ایرلاین، یا قابل‌تغییر. جزئیات دقیق را همیشه با ایرلاین تأیید کنید."
      />
      <RulesBrowser index={index} category={query.category} q={query.q} />
    </PageContainer>
  );
}
