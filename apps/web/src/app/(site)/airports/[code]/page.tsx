import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { AirportGuideView } from "@/features/rules";
import { fetchAirportGuide } from "@/features/rules/api";
import { ApiError } from "@/lib/api/parse";

type PageProps = { params: Promise<{ code: string }> };

async function load(code: string) {
  try {
    return await fetchAirportGuide(code.toUpperCase());
  } catch (error: unknown) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = await load((await params).code);
  return guide
    ? {
        title: `راهنمای فرودگاه ${guide.nameFa}`,
        description: `زمان رسیدن، بسته شدن پذیرش و نکته‌های فرودگاه ${guide.nameFa}`,
      }
    : { title: "فرودگاه پیدا نشد" };
}

export default async function AirportPage({ params }: PageProps) {
  const guide = await load((await params).code);
  if (!guide) notFound();

  return (
    <PageContainer>
      <AirportGuideView guide={guide} />
    </PageContainer>
  );
}
