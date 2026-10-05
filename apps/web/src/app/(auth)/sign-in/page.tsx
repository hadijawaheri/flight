import type { Metadata } from "next";

import { SignInForm } from "@/features/auth";
import { privatePage } from "@/lib/seo";

export const metadata: Metadata = { title: "ورود یا ثبت‌نام", ...privatePage };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <SignInForm next={Array.isArray(next) ? next[0] : next} />;
}
