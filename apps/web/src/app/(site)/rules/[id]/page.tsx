import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { RuleArticle } from "@/features/rules";
import { fetchRule } from "@/features/rules/api";
import { ApiError } from "@/lib/api/parse";

type PageProps = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await fetchRule(id);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const rule = await load((await params).id);
  return rule ? { title: rule.title, description: rule.summary } : { title: "قانون پیدا نشد" };
}

export default async function RulePage({ params }: PageProps) {
  const rule = await load((await params).id);
  if (!rule) notFound();

  return (
    <PageContainer>
      <RuleArticle rule={rule} />
    </PageContainer>
  );
}
