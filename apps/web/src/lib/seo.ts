import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:7782";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "اسکلت پروژه", template: "%s | اسکلت پروژه" },
  description: "اسکلت مرجع Next.js، NestJS و shadcn/ui",
  openGraph: { locale: "fa_IR", type: "website" },
};
